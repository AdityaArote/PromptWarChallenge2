import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, X, Send } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useChatStream } from '@/hooks/useChatStream'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

const STARTER_PROMPTS = [
  'How do I register to vote?',
  'What ID do I need to vote?',
  'Where is my polling booth?',
  'When is voting day?',
  'What happens if I miss the registration deadline?',
  'How are votes counted?',
]

export function ChatWindow() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isStreaming } = useChatStore()
  const { sendMessage } = useChatStream()
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || isStreaming) return
    setInput('')
    await sendMessage(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-lg
          flex items-center justify-center hover:scale-105 transition-transform"
        style={{ background: '#1a4e8a' }}
        aria-label="Open AI election assistant"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[360px] h-[520px] bg-gray-50
              rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-label="ElectIQ AI Assistant"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <div>
                <p className="font-semibold text-sm text-gray-900">ElectIQ Assistant</p>
                <p className="text-xs text-green-500">● Online</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-4"
              role="log"
              aria-live="polite"
              aria-label="Conversation history"
            >
              {messages.length === 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    Ask me anything about elections
                  </p>
                  {STARTER_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="text-left text-xs px-3 py-2 rounded-xl bg-white border border-gray-200
                        hover:border-blue-300 hover:bg-blue-50 transition-colors text-gray-700"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {isStreaming && <TypingIndicator />}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about elections..."
                rows={1}
                aria-label="Message input"
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-gray-200
                  focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                aria-label="Send message"
                className="w-9 h-9 rounded-full flex items-center justify-center
                  text-white disabled:opacity-40 hover:scale-105 transition-transform"
                style={{ background: '#1a4e8a' }}
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
