import { GeminiChatbot } from './chatbots/gemini'
import { ChatGPTChatbot } from './chatbots/chatgpt'
import { BaseChatbot } from './chatbots/base-chatbot'
import { InjectPromptMessage, ChatResponseMessage } from '../types/messages'

let currentChatbot: BaseChatbot | null = null

// Initialize the appropriate chatbot based on the current URL
function initializeChatbot(): void {
  const hostname = window.location.hostname
  const pathname = window.location.pathname

  if (hostname === 'aistudio.google.com') {
    currentChatbot = new GeminiChatbot()
    console.log('Initialized Gemini chatbot')
  } else if (hostname === 'chatgpt.com') {
    currentChatbot = new ChatGPTChatbot()
    console.log('Initialized ChatGPT chatbot')
  } else {
    console.warn('Unknown chatbot site:', hostname)
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse)
  return true // Keep the message channel open for async responses
})

async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<void> {
  try {
    if (!currentChatbot) {
      throw new Error('Chatbot not initialized')
    }

    switch (message.action) {
      case 'inject-prompt':
        await handleInjectPrompt(message as InjectPromptMessage)
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

async function handleInjectPrompt(message: InjectPromptMessage): Promise<void> {
  if (!currentChatbot) {
    throw new Error('Chatbot not initialized')
  }

  const { requestId, prompt, options } = message.data

  // Wait for the chatbot to be ready
  await currentChatbot.waitForReady()

  // Inject the prompt
  await currentChatbot.injectPrompt(prompt, options)

  // Start monitoring for the response
  currentChatbot.startResponseMonitoring(requestId)
}

export function sendResponseToBackground(requestId: string, response: string, error?: string): void {
  const message: ChatResponseMessage = {
    action: 'chat-response',
    data: {
      requestId,
      response,
      error
    }
  }

  chrome.runtime.sendMessage(message)
}

// Initialize when the content script loads
initializeChatbot()