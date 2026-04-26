import type { ChatMessage } from '@/store/chatStore'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser ? 'text-white' : 'bg-white border border-gray-200 text-gray-800'}`}
        style={isUser ? { background: '#1a4e8a' } : undefined}
      >
        {message.content}
      </div>
    </div>
  )
}
