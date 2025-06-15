import { connectWebSocket } from './websocket-client'
import { initializeMessageHandler } from './message-handler'
import { initializeTabManager } from './tab-manager'

chrome.runtime.onStartup.addListener(() => {
  console.log('Team Think MCP Extension starting up...')
  initialize()
})

chrome.runtime.onInstalled.addListener(() => {
  console.log('Team Think MCP Extension installed')
  initialize()
})

async function initialize() {
  try {
    initializeMessageHandler()
    initializeTabManager()
    await connectWebSocket()
    console.log('Team Think MCP Extension initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Team Think MCP Extension:', error)
  }
}