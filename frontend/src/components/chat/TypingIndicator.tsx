export function TypingIndicator() {
  return (
    <div
      className="flex justify-start mb-3"
      aria-live="polite"
      aria-label="Assistant is typing"
    >
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
