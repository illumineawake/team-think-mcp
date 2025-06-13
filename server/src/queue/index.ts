/**
 * Queue module exports
 */

import { QueueManager } from './queue-manager';

// Export the class
export { QueueManager } from './queue-manager';

// Export types
export type { QueuedRequest, QueueStats, QueueManagerConfig } from './types';

// Lazy singleton instance
let _queueManager: QueueManager | null = null;

export function getQueueManager(): QueueManager {
  if (!_queueManager) {
    _queueManager = new QueueManager();
  }
  return _queueManager;
}