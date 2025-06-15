export interface BaseChatbot {
  injectPrompt(prompt: string, options?: ChatbotOptions): Promise<void>
  extractResponse(): Promise<string>
  isGenerating(): boolean
  waitForReady(): Promise<void>
  startResponseMonitoring(requestId: string): void
}

export interface ChatbotOptions {
  temperature?: number
  model?: string
}

export interface ResponseMonitorOptions {
  requestId: string
  maxRetries?: number
  retryDelay?: number
}