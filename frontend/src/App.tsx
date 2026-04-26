import { Routes, Route } from 'react-router-dom'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { useAuth } from '@/hooks/useAuth'

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold mb-3" style={{ color: '#1a4e8a' }}>
          🗳️ ElectIQ
        </h1>
        <p className="text-gray-600 text-lg">
          Your AI-powered election guide
        </p>
        <p className="text-gray-400 text-sm mt-2">
          More features coming soon — use the chat button to get started
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>

      {/* Global chat assistant */}
      <ChatWindow />
    </>
  )
}
