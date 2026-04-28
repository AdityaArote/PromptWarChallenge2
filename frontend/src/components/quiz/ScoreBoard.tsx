export function ScoreBoard({ result, onRestart }: { result: { badge?: string; score?: number; correct?: number; total?: number; detail?: string }; onRestart: () => void }) {
  const hasError = result.detail || result.score === undefined;
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-center">
      {hasError ? (
        <>
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Error</h2>
          <p className="text-gray-600 mb-8">{result.detail || "Something went wrong calculating your score."}</p>
        </>
      ) : (
        <>
          <p className="text-5xl mb-2">{result.badge?.split(' ')[0]}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{result.score}%</h2>
          <p className="text-gray-600 mb-2">{result.badge?.split(' ').slice(1).join(' ')}</p>
          <p className="text-sm text-gray-500 mb-6">{result.correct} of {result.total} correct</p>
        </>
      )}
      <button onClick={onRestart}
        className="px-8 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: '#1a4e8a' }}>Try Again</button>
    </div>
  )
}
