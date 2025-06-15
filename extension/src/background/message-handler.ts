import { ChatResponseMessage as ExtChatResponseMessage } from '../types/messages'
import { ChatResponseMessage } from '@shared/types/websocket-messages'
import { sendMessage } from './websocket-client'

export function initializeMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse)
    return true // Keep the message channel open for async responses
  })
}

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    switch (message.action) {
      case 'chat-response':
        await handleChatResponse(message as ExtChatResponseMessage)
        sendResponse({ success: true })
        break
      
      default:
        console.warn('Unknown message action:', message.action)
        sendResponse({ success: false, error: 'Unknown action' })
    }
  } catch (error) {
    console.error('Error handling message:', error)
    sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) })
  }
}

async function handleChatResponse(message: ExtChatResponseMessage): Promise<void> {
  const responseMessage: ChatResponseMessage = {
    schema: '1.0',
    timestamp: Date.now(),
    action: 'chat-response',
    requestId: message.data.requestId,
    response: message.data.response,
    error: message.data.error,
    errorCode: message.data.errorCode
  }

  sendMessage(responseMessage)
}