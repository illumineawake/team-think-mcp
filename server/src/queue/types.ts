/**
 * Types for the Request Queue Manager
 */

export interface QueuedRequest {
  requestId: string;
  tool: 'chat_gemini' | 'chat_chatgpt';
  prompt: string;
  options?: {
    temperature?: number;
    model?: string;
  };
  status: 'pending' | 'active' | 'completed' | 'failed' | 'timeout';
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  timeoutHandle?: NodeJS.Timeout;
  resolve?: (response: string) => void;
  reject?: (error: Error) => void;
}

export interface QueueStats {
  totalPending: number;
  totalActive: number;
  pendingByService: Record<string, number>;
  activeByService: Record<string, number>;
  totalCompleted: number;
  totalFailed: number;
  totalTimeout: number;
}

export interface QueueManagerConfig {
  maxParallelPerService: number;
  requestTtlMs: number;
  completedRequestRetentionMs?: number;
}