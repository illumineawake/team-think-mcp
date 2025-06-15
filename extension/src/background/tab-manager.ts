import { SendPromptMessage } from '@shared/types/websocket-messages'
import { CONFIG, ChatbotType } from './config'
import { InjectPromptMessage } from '../types/messages'

// Map request IDs to tab IDs for response routing
const requestToTabMap = new Map<string, number>()
const tabToRequestMap = new Map<number, string>()

export function initializeTabManager(): void {
  // Clean up mappings when tabs are closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    const requestId = tabToRequestMap.get(tabId)
    if (requestId) {
      requestToTabMap.delete(requestId)
      tabToRequestMap.delete(tabId)
    }
  })
}

export async function handleSendPrompt(message: SendPromptMessage): Promise<void> {
  try {
    const url = CONFIG.CHATBOT_URLS[message.chatbot as ChatbotType]
    if (!url) {
      console.error('Unknown chatbot:', message.chatbot)
      return
    }

    // Create new tab for the chatbot
    const tab = await chrome.tabs.create({
      url,
      active: true
    })

    if (!tab.id) {
      console.error('Failed to create tab')
      return
    }

    // Store the mapping between request and tab
    requestToTabMap.set(message.requestId, tab.id)
    tabToRequestMap.set(tab.id, message.requestId)

    console.log(`Created tab ${tab.id} for ${message.chatbot} with request ${message.requestId}`)

    // Wait for the tab to load before injecting the prompt
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        injectPrompt(tabId, message)
      }
    })

  } catch (error) {
    console.error('Failed to handle send-prompt:', error)
  }
}

async function injectPrompt(tabId: number, message: SendPromptMessage): Promise<void> {
  try {
    const injectMessage: InjectPromptMessage = {
      action: 'inject-prompt',
      data: {
        requestId: message.requestId,
        prompt: message.prompt,
        options: message.options
      }
    }

    await chrome.tabs.sendMessage(tabId, injectMessage)
    console.log(`Injected prompt into tab ${tabId}`)
  } catch (error) {
    console.error('Failed to inject prompt:', error)
  }
}

export function getTabForRequest(requestId: string): number | undefined {
  return requestToTabMap.get(requestId)
}

export function getRequestForTab(tabId: number): string | undefined {
  return tabToRequestMap.get(tabId)
}