import { QueueManager } from './queue-manager';

// Mock the logger to avoid console output during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('QueueManager', () => {
  let queueManager: QueueManager;

  beforeEach(() => {
    // Create a new instance for each test with custom config for faster testing
    queueManager = new QueueManager({
      maxParallelPerService: 2,
      requestTtlMs: 1000 // 1 second for tests
    });
  });

  afterEach(async () => {
    // Cancel all requests to clean up - handle rejections
    try {
      queueManager.cancelAllRequests();
    } catch (error) {
      // Expected behavior - cancellation can cause rejections
    }
    
    // Wait a bit to ensure all cleanup is done
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('getQueueStats', () => {
    it('should return empty stats for new queue manager', () => {
      const stats = queueManager.getQueueStats();
      
      expect(stats.totalActive).toBe(0);
      expect(stats.totalPending).toBe(0);
      expect(stats.totalCompleted).toBe(0);
      expect(stats.totalFailed).toBe(0);
      expect(stats.totalTimeout).toBe(0);
    });
  });

  describe('addRequest', () => {
    it('should add a request and update stats', async () => {
      const requestId = 'test-request-id';
      
      // Add request but don't await it initially
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Check that request was added
      const status = queueManager.getRequestStatus(requestId);
      expect(status).not.toBeNull();
      expect(status?.status).toBe('active');
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalActive).toBe(1);
      
      // Resolve the request
      queueManager.resolveRequest(requestId, 'test response');
      
      // Wait for promise to resolve
      const result = await requestPromise;
      expect(result).toBe('test response');
    });
  });

  describe('resolveRequest', () => {
    it('should handle resolving unknown request gracefully', () => {
      expect(() => {
        queueManager.resolveRequest('unknown-id', 'response');
      }).not.toThrow();

      const stats = queueManager.getQueueStats();
      expect(stats.totalCompleted).toBe(0);
    });

    it('should implement race condition guard', async () => {
      const requestId = 'race-test-id';
      
      // Add a request
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Resolve the request
      queueManager.resolveRequest(requestId, 'response');
      
      // Try to resolve again - should be ignored due to race condition guard
      queueManager.resolveRequest(requestId, 'another response');
      
      const result = await requestPromise;
      expect(result).toBe('response');
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalCompleted).toBe(1);
    });
  });

  describe('rejectRequest', () => {
    it('should handle rejecting unknown request gracefully', () => {
      expect(() => {
        queueManager.rejectRequest('unknown-id', 'error');
      }).not.toThrow();

      const stats = queueManager.getQueueStats();
      expect(stats.totalFailed).toBe(0);
    });

    it('should accept both string and Error objects', () => {
      expect(() => {
        queueManager.rejectRequest('unknown-id-1', 'String error');
        queueManager.rejectRequest('unknown-id-2', new Error('Error object'));
      }).not.toThrow();
    });

    it('should implement race condition guard', async () => {
      const requestId = 'race-reject-test-id';
      
      // Add a request
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Reject the request
      queueManager.rejectRequest(requestId, 'test error');
      
      // Try to reject again - should be ignored due to race condition guard
      queueManager.rejectRequest(requestId, 'another error');
      
      try {
        await requestPromise;
        fail('Promise should have been rejected');
      } catch (error) {
        expect((error as Error).message).toBe('test error');
      }
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalFailed).toBe(1);
    });
  });

  describe('cancelRequest', () => {
    it('should return false for unknown request ID', () => {
      const cancelled = queueManager.cancelRequest('unknown-id');
      expect(cancelled).toBe(false);
    });

    it('should cancel active requests', async () => {
      const requestId = 'cancel-test-id';
      
      // Add a request
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Cancel it
      const cancelled = queueManager.cancelRequest(requestId);
      expect(cancelled).toBe(true);
      
      try {
        await requestPromise;
        fail('Promise should have been rejected');
      } catch (error) {
        expect((error as Error).message).toBe('Request was cancelled');
      }
    });

    it('should cancel pending requests', async () => {
      // Fill up active slots
      const requests = [
        queueManager.addRequest('chat_gemini', 'prompt 1'),
        queueManager.addRequest('chat_gemini', 'prompt 2'),
        queueManager.addRequest('chat_gemini', 'prompt 3', undefined, 'pending-request')
      ];
      
      // Third request should be pending
      const stats = queueManager.getQueueStats();
      expect(stats.totalActive).toBe(2);
      expect(stats.totalPending).toBe(1);
      
      // Cancel the pending request
      const cancelled = queueManager.cancelRequest('pending-request');
      expect(cancelled).toBe(true);
      
      // Wait for all rejections
      await Promise.allSettled(requests);
    });
  });

  describe('cancelAllRequests', () => {
    it('should not throw when cancelling with no requests', () => {
      expect(() => {
        queueManager.cancelAllRequests();
      }).not.toThrow();
    });

    it('should cancel all active and pending requests', async () => {
      // Add multiple requests
      const requests = [
        queueManager.addRequest('chat_gemini', 'prompt 1'),
        queueManager.addRequest('chat_gemini', 'prompt 2'),
        queueManager.addRequest('chat_gemini', 'prompt 3'),
        queueManager.addRequest('chat_chatgpt', 'prompt 4')
      ];
      
      const initialStats = queueManager.getQueueStats();
      expect(initialStats.totalActive + initialStats.totalPending).toBeGreaterThan(0);
      
      // Cancel all
      queueManager.cancelAllRequests();
      
      // All requests should be cancelled
      const results = await Promise.allSettled(requests);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
      
      const finalStats = queueManager.getQueueStats();
      expect(finalStats.totalActive).toBe(0);
      expect(finalStats.totalPending).toBe(0);
    });
  });

  describe('getRequestStatus', () => {
    it('should return null for unknown request', () => {
      const status = queueManager.getRequestStatus('unknown-id');
      expect(status).toBeNull();
    });

    it('should return status for active request', async () => {
      const requestId = 'status-test-id';
      
      // Add request
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      const status = queueManager.getRequestStatus(requestId);
      expect(status?.requestId).toBe(requestId);
      expect(status?.status).toBe('active');
      
      // Clean up
      queueManager.resolveRequest(requestId, 'response');
      await requestPromise;
    });
  });

  describe('timeout behavior', () => {
    it('should handle timeout', async () => {
      const requestId = 'timeout-test-id';
      
      // Add a request that we won't resolve
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Handle the promise rejection to avoid unhandled promise rejection warnings
      const settled = Promise.allSettled([requestPromise]);
      
      // Wait for timeout (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const results = await settled;
      expect(results[0].status).toBe('rejected');
      if (results[0].status === 'rejected') {
        expect(results[0].reason.message).toContain('timed out');
      }
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalTimeout).toBe(1);
      expect(stats.totalActive).toBe(0);
    });

    it('should not timeout if request is resolved in time', async () => {
      const requestId = 'no-timeout-test-id';
      
      // Add a request
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Resolve before timeout
      setTimeout(() => {
        queueManager.resolveRequest(requestId, 'response');
      }, 500);
      
      const result = await requestPromise;
      expect(result).toBe('response');
      
      // Wait a bit more to ensure no timeout
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalTimeout).toBe(0);
      expect(stats.totalCompleted).toBe(1);
    });

    it('should implement race condition guard for timeout', async () => {
      const requestId = 'timeout-race-test-id';
      
      // Add a request
      const requestPromise = queueManager.addRequest('chat_gemini', 'test prompt', undefined, requestId);
      
      // Wait almost until timeout
      await new Promise(resolve => setTimeout(resolve, 900));
      
      // Resolve just before timeout
      queueManager.resolveRequest(requestId, 'response');
      
      const result = await requestPromise;
      expect(result).toBe('response');
      
      // Wait for potential timeout
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalCompleted).toBe(1);
      expect(stats.totalTimeout).toBe(0);
    });
  });

  describe('concurrency control', () => {
    it('should respect maxParallelPerService configuration', async () => {
      // Create a queue manager with limit of 1
      const strictQueueManager = new QueueManager({
        maxParallelPerService: 1,
        requestTtlMs: 5000
      });

      // Add 3 requests
      const requests = [
        strictQueueManager.addRequest('chat_gemini', 'prompt 1'),
        strictQueueManager.addRequest('chat_gemini', 'prompt 2'),
        strictQueueManager.addRequest('chat_gemini', 'prompt 3')
      ];

      const stats = strictQueueManager.getQueueStats();
      expect(stats.totalActive).toBe(1);
      expect(stats.totalPending).toBe(2);

      // Clean up
      strictQueueManager.cancelAllRequests();
      await Promise.allSettled(requests);
    });

    it('should process next request when one completes', async () => {
      // Fill up the slots
      const request1Id = 'request-1';
      const request2Id = 'request-2';
      const requests = [
        queueManager.addRequest('chat_gemini', 'prompt 1', undefined, request1Id),
        queueManager.addRequest('chat_gemini', 'prompt 2', undefined, request2Id),
        queueManager.addRequest('chat_gemini', 'prompt 3') // This will be pending
      ];

      const initialStats = queueManager.getQueueStats();
      expect(initialStats.totalActive).toBe(2);
      expect(initialStats.totalPending).toBe(1);

      // Complete one request
      queueManager.resolveRequest(request1Id, 'response 1');

      // The pending request should now be active
      const finalStats = queueManager.getQueueStats();
      expect(finalStats.totalActive).toBe(2); // Still 2 active (one new one started)
      expect(finalStats.totalPending).toBe(0);
      expect(finalStats.totalCompleted).toBe(1);
      
      // Clean up remaining
      queueManager.resolveRequest(request2Id, 'response 2');
      await Promise.allSettled(requests);
    });
  });

  describe('memory leak prevention', () => {
    it('should show zero active requests after all are settled', async () => {
      const requests = [
        queueManager.addRequest('chat_gemini', 'prompt 1'),
        queueManager.addRequest('chat_gemini', 'prompt 2'),
        queueManager.addRequest('chat_chatgpt', 'prompt 3')
      ];
      
      // Cancel all requests
      queueManager.cancelAllRequests();
      
      // Wait for all to settle
      await Promise.allSettled(requests);
      
      const stats = queueManager.getQueueStats();
      expect(stats.totalActive).toBe(0);
      expect(stats.totalPending).toBe(0);
    });
  });
});