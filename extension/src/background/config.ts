export const CONFIG = {
  MCP_SERVER_URL: 'ws://localhost:55156',
  RECONNECT_DELAY: 5000,
  HEARTBEAT_INTERVAL: 30000,
  STORAGE_KEYS: {
    AUTH_TOKEN: 'team_think_auth_token'
  },
  CHATBOT_URLS: {
    gemini: 'https://aistudio.google.com/app/prompts/new_chat',
    chatgpt: 'https://chatgpt.com/'
  }
} as const

export type ChatbotType = keyof typeof CONFIG.CHATBOT_URLS