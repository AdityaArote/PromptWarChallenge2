import { useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { apiFetch } from '@/lib/api'

export function useChatStream() {
  const { addUserMessage, appendAssistantToken, finalizeAssistant, startStreaming, getHistory } =
    useChatStore()

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return

      addUserMessage(message)
      startStreaming()

      try {
        const response = await apiFetch('/api/chat/stream', {
          method: 'POST',
          body: JSON.stringify({ message, history: getHistory() }),
        })

        if (!response.ok || !response.body) {
          appendAssistantToken('Sorry, I encountered an error. Please try again.')
          finalizeAssistant()
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n')

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.token) appendAssistantToken(payload.token)
              if (payload.done) {
                finalizeAssistant()
                return
              }
              if (payload.error) {
                appendAssistantToken('\n\n[Error: ' + payload.error + ']')
                finalizeAssistant()
                return
              }
            } catch {
              /* malformed chunk — skip */
            }
          }
        }
      } catch {
        appendAssistantToken('Network error. Check your connection and try again.')
      } finally {
        finalizeAssistant()
      }
    },
    [addUserMessage, startStreaming, appendAssistantToken, finalizeAssistant, getHistory]
  )

  return { sendMessage }
}
