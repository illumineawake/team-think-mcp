import { WebSocketMessage, SendPromptMessage, AuthenticationMessage } from '@shared/types/websocket-messages'
import { CONFIG } from './config'
import { handleSendPrompt } from './tab-manager'

let websocket: WebSocket | null = null
let isReconnecting = false
let heartbeatInterval: number | null = null

export async function connectWebSocket(): Promise<void> {
  if (isReconnecting || websocket?.readyState === WebSocket.OPEN) {
    return
  }

  isReconnecting = true

  try {
    const authToken = await getAuthToken()
    if (!authToken) {
      console.error('No auth token found. Please configure the extension.')
      isReconnecting = false
      return
    }

    websocket = new WebSocket(CONFIG.MCP_SERVER_URL)

    websocket.onopen = () => {
      console.log('Connected to MCP server')
      isReconnecting = false
      
      // Send authentication message
      const authMessage: AuthenticationMessage = {
        schema: '1.0',
        timestamp: Date.now(),
        action: 'authenticate',
        token: authToken
      }
      websocket?.send(JSON.stringify(authMessage))
      
      // Start heartbeat
      startHeartbeat()
    }

    websocket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage
        console.debug('Received message from MCP server:', message)
        await handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    websocket.onclose = (event) => {
      console.log('Disconnected from MCP server:', event.code, event.reason)
      cleanup()
      
      // Attempt to reconnect after delay
      setTimeout(() => {
        isReconnecting = false
        connectWebSocket()
      }, CONFIG.RECONNECT_DELAY)
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      cleanup()
    }

  } catch (error) {
    console.error('Failed to connect to MCP server:', error)
    isReconnecting = false
  }
}

async function handleMessage(message: WebSocketMessage): Promise<void> {
  switch (message.action) {
    case 'send-prompt':
      await handleSendPrompt(message as SendPromptMessage)
      break
    default:
      console.warn('Unknown message action:', message.action)
  }
}

function startHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }
  
  heartbeatInterval = setInterval(() => {
    if (websocket?.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'ping' }))
    }
  }, CONFIG.HEARTBEAT_INTERVAL)
}

function cleanup(): void {
  websocket = null
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.AUTH_TOKEN)
  return result[CONFIG.STORAGE_KEYS.AUTH_TOKEN] || null
}

export function sendMessage(message: WebSocketMessage): void {
  if (websocket?.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify(message))
  } else {
    console.warn('WebSocket not connected, cannot send message')
  }
}