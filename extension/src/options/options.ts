const STORAGE_KEY = 'team_think_auth_token'

document.addEventListener('DOMContentLoaded', async () => {
  await loadSavedToken()
  updateConnectionStatus()
  
  const form = document.getElementById('optionsForm') as HTMLFormElement
  const clearButton = document.getElementById('clearToken') as HTMLButtonElement
  
  form.addEventListener('submit', handleSaveToken)
  clearButton.addEventListener('click', handleClearToken)
  
  // Update connection status every 5 seconds
  setInterval(updateConnectionStatus, 5000)
})

async function loadSavedToken(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const token = result[STORAGE_KEY]
    
    if (token) {
      const tokenInput = document.getElementById('authToken') as HTMLInputElement
      tokenInput.value = token
    }
  } catch (error) {
    console.error('Failed to load saved token:', error)
  }
}

async function handleSaveToken(event: Event): Promise<void> {
  event.preventDefault()
  
  const tokenInput = document.getElementById('authToken') as HTMLInputElement
  const token = tokenInput.value.trim()
  
  if (!token) {
    showStatus('Please enter a valid token', 'error')
    return
  }
  
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: token })
    showStatus('Token saved successfully!', 'success')
    
    // Try to reconnect with the new token
    setTimeout(updateConnectionStatus, 1000)
  } catch (error) {
    console.error('Failed to save token:', error)
    showStatus('Failed to save token', 'error')
  }
}

async function handleClearToken(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEY)
    const tokenInput = document.getElementById('authToken') as HTMLInputElement
    tokenInput.value = ''
    showStatus('Token cleared successfully!', 'success')
    updateConnectionStatus()
  } catch (error) {
    console.error('Failed to clear token:', error)
    showStatus('Failed to clear token', 'error')
  }
}

function showStatus(message: string, type: 'success' | 'error'): void {
  const statusElement = document.getElementById('statusMessage') as HTMLElement
  statusElement.textContent = message
  statusElement.className = `status-message status-${type}`
  statusElement.style.display = 'block'
  
  // Hide the message after 3 seconds
  setTimeout(() => {
    statusElement.style.display = 'none'
  }, 3000)
}

async function updateConnectionStatus(): Promise<void> {
  const indicator = document.getElementById('connectionIndicator') as HTMLElement
  const status = document.getElementById('connectionStatus') as HTMLElement
  
  try {
    // Check if we have a token
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const token = result[STORAGE_KEY]
    
    if (!token) {
      indicator.className = 'connection-indicator disconnected'
      status.textContent = 'No authentication token configured'
      return
    }
    
    // Try to ping the MCP server
    const isConnected = await checkServerConnection()
    
    if (isConnected) {
      indicator.className = 'connection-indicator connected'
      status.textContent = 'Connected to MCP server'
    } else {
      indicator.className = 'connection-indicator disconnected'
      status.textContent = 'Cannot connect to MCP server (check if server is running)'
    }
  } catch (error) {
    console.error('Failed to check connection status:', error)
    indicator.className = 'connection-indicator disconnected'
    status.textContent = 'Connection status unknown'
  }
}

async function checkServerConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket('ws://localhost:55156')
      
      const timeout = setTimeout(() => {
        ws.close()
        resolve(false)
      }, 3000)
      
      ws.onopen = async () => {
        clearTimeout(timeout)
        
        // Get the auth token and send authentication
        const result = await chrome.storage.local.get(STORAGE_KEY)
        const token = result[STORAGE_KEY]
        
        if (token) {
          ws.send(JSON.stringify({
            schema: '1.0',
            timestamp: Date.now(),
            action: 'authenticate',
            token: token
          }))
        }
        
        // Wait for auth response
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            if (message.action === 'auth-success') {
              ws.close()
              resolve(true)
            } else {
              ws.close()
              resolve(false)
            }
          } catch {
            ws.close()
            resolve(false)
          }
        }
      }
      
      ws.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
      
      ws.onclose = () => {
        clearTimeout(timeout)
      }
    } catch (error) {
      resolve(false)
    }
  })
}