import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  addUserMessage: (content: string) => void
  appendAssistantToken: (token: string) => void
  finalizeAssistant: () => void
  startStreaming: () => void
  clearMessages: () => void
  getHistory: () => { role: string; content: string }[]
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isStreaming: false,

      addUserMessage: (content) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { id: crypto.randomUUID(), role: 'user', content, timestamp: Date.now() },
          ],
        })),

      appendAssistantToken: (token) =>
        set((s) => {
          const msgs = [...s.messages]
          const last = msgs[msgs.length - 1]
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + token }
          } else {
            msgs.push({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: token,
              timestamp: Date.now(),
            })
          }
          return { messages: msgs }
        }),

      finalizeAssistant: () => set({ isStreaming: false }),
      startStreaming: () => set({ isStreaming: true }),
      clearMessages: () => set({ messages: [] }),

      getHistory: () => {
        const { messages } = get()
        return messages.slice(-12).map((m) => ({ role: m.role, content: m.content }))
      },
    }),
    { name: 'electiq-chat' }
  )
)
