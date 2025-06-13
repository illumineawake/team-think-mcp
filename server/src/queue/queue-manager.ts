import { logger } from '../utils/logger';
import { MAX_PARALLEL_PER_SERVICE, REQUEST_TTL_MS, COMPLETED_REQUEST_RETENTION_MS, CLEANUP_INTERVAL_MS } from '../config/constants';
import { QueuedRequest, QueueStats, QueueManagerConfig } from './types';
import { randomUUID } from 'crypto';

/**
 * Request Queue Manager for Team Think MCP Server
 * 
 * Manages prompts sent to AI services via the browser extension.
 * Handles concurrency limits, timeouts, and request lifecycle.
 */
export class QueueManager {
  private activeRequests: Map<string, QueuedRequest> = new Map();
  private pendingQueues: Map<string, QueuedRequest[]> = new Map();
  private activeCountPerService: Map<string, number> = new Map();
  private completedRequests: Map<string, QueuedRequest> = new Map();
  private readonly config: QueueManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<QueueManagerConfig>) {
    this.config = {
      maxParallelPerService: config?.maxParallelPerService ?? MAX_PARALLEL_PER_SERVICE,
      requestTtlMs: config?.requestTtlMs ?? REQUEST_TTL_MS,
      completedRequestRetentionMs: config?.completedRequestRetentionMs ?? COMPLETED_REQUEST_RETENTION_MS
    };

    // Initialize service counters
    this.activeCountPerService.set('chat_gemini', 0);
    this.activeCountPerService.set('chat_chatgpt', 0);
    
    // Initialize pending queues
    this.pendingQueues.set('chat_gemini', []);
    this.pendingQueues.set('chat_chatgpt', []);

    logger.info(`QueueManager initialized with config: ${JSON.stringify(this.config)}`);

    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Add a request to the queue
   * @param tool The AI service to use
   * @param prompt The prompt to send
   * @param options Optional parameters like temperature and model
   * @param requestId Optional custom request ID
   * @returns Promise that resolves with the AI response
   */
  public addRequest(
    tool: 'chat_gemini' | 'chat_chatgpt',
    prompt: string,
    options?: { temperature?: number; model?: string },
    requestId?: string
  ): Promise<string> {
    const id = requestId || randomUUID();
    
    return new Promise<string>((resolve, reject) => {
      const request: QueuedRequest = {
        requestId: id,
        tool,
        prompt,
        options,
        status: 'pending',
        queuedAt: Date.now(),
        resolve,
        reject
      };

      // Add to pending queue for the service
      const pendingQueue = this.pendingQueues.get(tool);
      if (!pendingQueue) {
        reject(new Error(`Unknown service: ${tool}`));
        return;
      }

      pendingQueue.push(request);
      
      logger.info(`Request ${id} queued for ${tool}. Queue length: ${pendingQueue.length}`);
      
      // Try to process next in queue
      this.processNextInQueue(tool);
    });
  }

  /**
   * Process the next pending request in the queue for a service
   */
  private processNextInQueue(service: string): void {
    const pendingQueue = this.pendingQueues.get(service);
    const activeCount = this.activeCountPerService.get(service) || 0;

    if (!pendingQueue || pendingQueue.length === 0) {
      return;
    }

    if (activeCount >= this.config.maxParallelPerService) {
      logger.debug(`Service ${service} at max capacity (${activeCount}/${this.config.maxParallelPerService})`);
      return;
    }

    // Move request from pending to active
    const request = pendingQueue.shift();
    if (!request) {
      return;
    }

    request.status = 'active';
    request.startedAt = Date.now();
    
    this.activeRequests.set(request.requestId, request);
    this.activeCountPerService.set(service, activeCount + 1);
    
    // Start timeout for this request
    this.startRequestTimeout(request);
    
    logger.info(`Request ${request.requestId} activated for ${service}. Active: ${activeCount + 1}/${this.config.maxParallelPerService}`);
    
    // Try to process another request if we still have capacity
    if (activeCount + 1 < this.config.maxParallelPerService) {
      this.processNextInQueue(service);
    }
  }

  /**
   * Start timeout for a request
   */
  private startRequestTimeout(request: QueuedRequest): void {
    request.timeoutHandle = setTimeout(() => {
      // Race condition guard: only timeout if still active
      if (request.status !== 'active') {
        return;
      }
      
      logger.warn(`Request ${request.requestId} timed out after ${this.config.requestTtlMs}ms`);
      
      request.status = 'timeout';
      request.completedAt = Date.now();
      
      if (request.reject) {
        try {
          request.reject(new Error(`Request timed out after ${this.config.requestTtlMs}ms`));
        } catch (e) {
          logger.debug(`Timeout rejection callback threw: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      
      // Move to completed and cleanup
      this.completedRequests.set(request.requestId, request);
      this.cleanupRequest(request);
    }, this.config.requestTtlMs);
  }

  /**
   * Clear timeout for a request
   */
  private clearRequestTimeout(request: QueuedRequest): void {
    if (request.timeoutHandle) {
      clearTimeout(request.timeoutHandle);
      request.timeoutHandle = undefined;
    }
  }

  /**
   * Resolve a request with a response
   */
  public resolveRequest(requestId: string, response: string): void {
    const request = this.activeRequests.get(requestId);
    
    if (!request) {
      logger.warn(`Attempted to resolve unknown request: ${requestId}`);
      return;
    }

    if (request.status !== 'active') {
      logger.warn(`Attempted to resolve request ${requestId} with status: ${request.status}`);
      return;
    }

    logger.info(`Resolving request ${requestId} with response length: ${response.length}`);
    
    request.status = 'completed';
    request.completedAt = Date.now();
    
    // Clear timeout
    this.clearRequestTimeout(request);
    
    // Call resolve function
    if (request.resolve) {
      request.resolve(response);
    }
    
    // Move to completed and cleanup
    this.completedRequests.set(requestId, request);
    this.cleanupRequest(request);
  }

  /**
   * Reject a request with an error
   */
  public rejectRequest(requestId: string, error: string | Error): void {
    const request = this.activeRequests.get(requestId);
    
    if (!request) {
      logger.warn(`Attempted to reject unknown request: ${requestId}`);
      return;
    }

    if (request.status !== 'active') {
      logger.warn(`Attempted to reject request ${requestId} with status: ${request.status}`);
      return;
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    logger.error(`Rejecting request ${requestId}: ${errorObj.message}`);
    
    request.status = 'failed';
    request.completedAt = Date.now();
    
    // Clear timeout
    this.clearRequestTimeout(request);
    
    // Call reject function safely
    if (request.reject) {
      try {
        request.reject(errorObj);
      } catch (e) {
        // Handle case where rejection callback throws
        logger.debug(`Rejection callback threw: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // Move to completed and cleanup
    this.completedRequests.set(requestId, request);
    this.cleanupRequest(request);
  }

  /**
   * Clean up a request and try to process next in queue
   */
  private cleanupRequest(request: QueuedRequest): void {
    // Remove from active requests
    this.activeRequests.delete(request.requestId);
    
    // Decrement active count for the service
    const currentCount = this.activeCountPerService.get(request.tool) || 0;
    this.activeCountPerService.set(request.tool, Math.max(0, currentCount - 1));
    
    logger.debug(`Request ${request.requestId} cleaned up. Active count for ${request.tool}: ${currentCount - 1}`);
    
    // Try to process next request in queue for this service
    this.processNextInQueue(request.tool);
  }

  /**
   * Cancel a specific request
   */
  public cancelRequest(requestId: string): boolean {
    // Check if it's in active requests
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      logger.info(`Cancelling active request: ${requestId}`);
      this.rejectRequest(requestId, 'Request was cancelled');
      return true;
    }

    // Check if it's in pending queues
    for (const [service, queue] of this.pendingQueues.entries()) {
      const index = queue.findIndex(req => req.requestId === requestId);
      if (index !== -1) {
        const request = queue.splice(index, 1)[0];
        logger.info(`Cancelling pending request: ${requestId}`);
        
        if (request.reject) {
          try {
            request.reject(new Error('Request was cancelled'));
          } catch (e) {
            logger.debug(`Cancellation rejection callback threw: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        return true;
      }
    }

    logger.warn(`Request ${requestId} not found for cancellation`);
    return false;
  }

  /**
   * Cancel all requests (for shutdown scenarios)
   */
  public cancelAllRequests(): void {
    logger.info('Cancelling all requests');
    
    // Stop cleanup timer
    this.stopCleanupTimer();
    
    // Cancel all active requests
    for (const [requestId] of this.activeRequests) {
      this.cancelRequest(requestId);
    }
    
    // Cancel all pending requests
    for (const [service, queue] of this.pendingQueues.entries()) {
      const requests = [...queue];
      queue.length = 0; // Clear the queue
      
      for (const request of requests) {
        logger.info(`Cancelling pending request: ${request.requestId}`);
        if (request.reject) {
          try {
            request.reject(new Error('Server is shutting down'));
          } catch (e) {
            logger.debug(`Shutdown rejection callback threw: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }
  }

  /**
   * Get the status of a specific request
   */
  public getRequestStatus(requestId: string): QueuedRequest | null {
    // Check active requests
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      return { ...activeRequest };
    }

    // Check completed requests
    const completedRequest = this.completedRequests.get(requestId);
    if (completedRequest) {
      return { ...completedRequest };
    }

    // Check pending queues
    for (const queue of this.pendingQueues.values()) {
      const pendingRequest = queue.find(req => req.requestId === requestId);
      if (pendingRequest) {
        return { ...pendingRequest };
      }
    }

    return null;
  }

  /**
   * Get queue statistics for monitoring
   */
  public getQueueStats(): QueueStats {
    const stats: QueueStats = {
      totalPending: 0,
      totalActive: this.activeRequests.size,
      pendingByService: {},
      activeByService: {},
      totalCompleted: 0,
      totalFailed: 0,
      totalTimeout: 0
    };

    // Count pending requests by service
    for (const [service, queue] of this.pendingQueues.entries()) {
      stats.pendingByService[service] = queue.length;
      stats.totalPending += queue.length;
    }

    // Count active requests by service
    for (const [service, count] of this.activeCountPerService.entries()) {
      stats.activeByService[service] = count;
    }

    // Count completed requests by status
    for (const request of this.completedRequests.values()) {
      if (request.status === 'completed') {
        stats.totalCompleted++;
      } else if (request.status === 'failed') {
        stats.totalFailed++;
      } else if (request.status === 'timeout') {
        stats.totalTimeout++;
      }
    }

    return stats;
  }

  /**
   * Clean up old completed requests to prevent memory leaks
   */
  private cleanupCompletedRequests(): void {
    const now = Date.now();
    const cutoffTime = now - this.config.completedRequestRetentionMs!;
    let removedCount = 0;
    
    for (const [requestId, request] of this.completedRequests.entries()) {
      if (request.completedAt && request.completedAt < cutoffTime) {
        this.completedRequests.delete(requestId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} completed requests older than ${this.config.completedRequestRetentionMs}ms`);
    }
  }

  /**
   * Start the periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedRequests();
    }, CLEANUP_INTERVAL_MS);
    
    logger.info(`Started completed request cleanup timer (interval: ${CLEANUP_INTERVAL_MS}ms, retention: ${this.config.completedRequestRetentionMs}ms)`);
  }

  /**
   * Stop the cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Stopped completed request cleanup timer');
    }
  }

  /**
   * Manually trigger cleanup of old requests
   * @returns Number of requests cleaned up
   */
  public cleanupOldRequests(): number {
    const initialSize = this.completedRequests.size;
    this.cleanupCompletedRequests();
    return initialSize - this.completedRequests.size;
  }
}