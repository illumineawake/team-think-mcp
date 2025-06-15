export interface ExtensionMessage {
  action: string
  data?: any
}

export interface ChatResponseMessage extends ExtensionMessage {
  action: 'chat-response'
  data: {
    requestId: string
    response: string
    error?: string
    errorCode?: 'SESSION_EXPIRED' | 'LOGIN_REQUIRED' | 'AUTHENTICATION_FAILED' | 'NETWORK_ERROR' | 'UNKNOWN'
  }
}

export interface TabOpenedMessage extends ExtensionMessage {
  action: 'tab-opened'
  data: {
    requestId: string
    tabId: number
    chatbot: 'gemini' | 'chatgpt'
  }
}

export interface InjectPromptMessage extends ExtensionMessage {
  action: 'inject-prompt'
  data: {
    requestId: string
    prompt: string
    options?: {
      temperature?: number
      model?: string
    }
  }
}