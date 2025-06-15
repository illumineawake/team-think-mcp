import { BaseChatbot, ChatbotOptions } from './base-chatbot'
import { sendResponseToBackground } from '../index'

export class GeminiChatbot implements BaseChatbot {
  private responseObserver: MutationObserver | null = null
  private currentRequestId: string | null = null

  async waitForReady(): Promise<void> {
    await new Promise<void>((resolve) => {
      const checkForElement = () => {
        if (document.querySelector('.title-container')) {
          resolve()
        } else {
          setTimeout(checkForElement, 100)
        }
      }
      checkForElement()
    })
    
    // Additional wait to ensure page is fully loaded
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  async injectPrompt(prompt: string, options?: ChatbotOptions): Promise<void> {
    await this.waitForReady()

    // Set temperature if provided
    if (options?.temperature !== undefined) {
      await this.setTemperature(options.temperature)
    }

    // Set model if provided
    if (options?.model) {
      await this.setModel(options.model)
    }

    // Get the textarea element and inject the prompt
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) {
      throw new Error('Textarea not found in Gemini AI Studio')
    }

    textarea.value = prompt
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))

    await new Promise(resolve => requestAnimationFrame(resolve))

    // Click the run button to send the prompt
    const runButton = document.querySelector('run-button > button') as HTMLElement
    if (!runButton) {
      throw new Error('Run button not found in Gemini AI Studio')
    }

    runButton.click()
  }

  private async setTemperature(temperature: number): Promise<void> {
    // Handle mobile view
    if (window.innerWidth <= 768) {
      const tuneButton = Array.from(document.querySelectorAll('prompt-header button'))
        .find(button => button.textContent?.trim() === 'tune') as HTMLButtonElement
      tuneButton?.click()
      await new Promise(resolve => requestAnimationFrame(resolve))
    }

    const temperatureInput = document.querySelector(
      'ms-prompt-run-settings div[data-test-id="temperatureSliderContainer"] input[type=number]'
    ) as HTMLInputElement

    if (temperatureInput) {
      temperatureInput.value = temperature.toString()
      temperatureInput.dispatchEvent(new Event('change', { bubbles: true }))
    }

    // Close mobile settings if needed
    if (window.innerWidth <= 768) {
      const closeButton = Array.from(document.querySelectorAll('ms-run-settings button'))
        .find(button => button.textContent?.trim() === 'close') as HTMLButtonElement
      closeButton?.click()
    }
  }

  private async setModel(model: string): Promise<void> {
    const modelSelectorTrigger = document.querySelector(
      'ms-model-selector mat-form-field > div'
    ) as HTMLElement
    
    if (!modelSelectorTrigger) return

    modelSelectorTrigger.click()
    await new Promise(resolve => requestAnimationFrame(resolve))

    const modelOptions = Array.from(document.querySelectorAll('mat-option'))
    for (const option of modelOptions) {
      const modelNameElement = option.querySelector('ms-model-option > div:last-child') as HTMLElement
      if (modelNameElement?.textContent?.trim() === model) {
        (option as HTMLElement).click()
        break
      }
    }
    await new Promise(resolve => requestAnimationFrame(resolve))
  }

  isGenerating(): boolean {
    // Check if the stop button is visible (indicates generation in progress)
    const stopButton = document.querySelector('button[aria-label="Stop generating"]')
    return !!stopButton
  }

  async extractResponse(): Promise<string> {
    // Find the most recent chat turn response
    const chatTurns = document.querySelectorAll('ms-chat-turn')
    if (chatTurns.length === 0) {
      throw new Error('No chat turns found')
    }

    const lastTurn = chatTurns[chatTurns.length - 1]
    const responseElement = lastTurn.querySelector('.turn-body')
    
    if (!responseElement) {
      throw new Error('No response found in last chat turn')
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
      // Check if generation has stopped
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
      
      console.log('Gemini response extracted and sent:', response.substring(0, 100) + '...')
    } catch (error) {
      console.error('Failed to extract Gemini response:', error)
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