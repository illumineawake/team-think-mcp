import { BaseChatbot, ChatbotOptions } from './base-chatbot'
import { sendResponseToBackground } from '../index'

export class ChatGPTChatbot implements BaseChatbot {
  private responseObserver: MutationObserver | null = null
  private currentRequestId: string | null = null

  async waitForReady(): Promise<void> {
    const maxWaitTime = 2000
    const startTime = Date.now()

    await new Promise<void>((resolve) => {
      const checkForElement = () => {
        if (
          document.querySelector('span[data-testid="blocking-initial-modals-done"]') ||
          Date.now() - startTime >= maxWaitTime
        ) {
          resolve()
        } else {
          setTimeout(checkForElement, 100)
        }
      }
      checkForElement()
    })
  }

  async injectPrompt(prompt: string, options?: ChatbotOptions): Promise<void> {
    await this.waitForReady()

    // Get the textarea element and inject the prompt
    const promptTextarea = document.querySelector('div#prompt-textarea') as HTMLElement
    if (!promptTextarea) {
      throw new Error('Prompt textarea not found in ChatGPT')
    }

    // Check if it's contenteditable
    if (promptTextarea.isContentEditable) {
      promptTextarea.innerText = prompt
      promptTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      promptTextarea.dispatchEvent(new Event('change', { bubbles: true }))
    } else {
      // Fallback to textarea if it's not contenteditable
      const textarea = promptTextarea as HTMLTextAreaElement
      textarea.value = prompt
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
      textarea.dispatchEvent(new Event('change', { bubbles: true }))
    }

    await new Promise(resolve => requestAnimationFrame(resolve))

    // Find and click the send button
    const form = promptTextarea.closest('form')
    if (form) {
      form.requestSubmit()
    } else {
      // Fallback: simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true
      })
      promptTextarea.dispatchEvent(enterEvent)
    }
  }

  isGenerating(): boolean {
    // Check if the stop button is visible (indicates generation in progress)
    const stopButton = document.querySelector('button[data-testid="stop-button"]')
    return !!stopButton
  }

  async extractResponse(): Promise<string> {
    // Find the most recent agent turn (AI response)
    const agentTurns = document.querySelectorAll('.agent-turn')
    if (agentTurns.length === 0) {
      throw new Error('No agent turns found')
    }

    const lastTurn = agentTurns[agentTurns.length - 1]
    const responseElement = lastTurn.querySelector('[data-message-author-role="assistant"]')
    
    if (!responseElement) {
      throw new Error('No response found in last agent turn')
    }

    return responseElement.textContent?.trim() || ''
  }

  startResponseMonitoring(requestId: string): void {
    this.currentRequestId = requestId
    this.setupResponseObserver()
  }

  private setupResponseObserver(): void {
    if (this.responseObserver) {
      this.responseObserver.disconnect()
    }

    this.responseObserver = new MutationObserver((mutations) => {
      // Check if generation has stopped (stop button is no longer present)
      if (!this.isGenerating()) {
        this.handleResponseComplete()
      }
    })

    this.responseObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }

  private async handleResponseComplete(): Promise<void> {
    if (!this.currentRequestId) return

    try {
      // Wait a moment for the response to fully render
      await new Promise(resolve => setTimeout(resolve, 1000))

      const response = await this.extractResponse()
      sendResponseToBackground(this.currentRequestId, response)
      
      console.log('ChatGPT response extracted and sent:', response.substring(0, 100) + '...')
    } catch (error) {
      console.error('Failed to extract ChatGPT response:', error)
      sendResponseToBackground(this.currentRequestId, '', error instanceof Error ? error.message : String(error))
    } finally {
      this.cleanup()
    }
  }

  private cleanup(): void {
    if (this.responseObserver) {
      this.responseObserver.disconnect()
      this.responseObserver = null
    }
    this.currentRequestId = null
  }
}