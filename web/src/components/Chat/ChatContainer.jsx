import { useState, useEffect } from 'react'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { WelcomeScreen } from './WelcomeScreen'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Wifi } from 'lucide-react'

export function ChatView() {
  const {
    isConnected,
    connectionError,
    messages,
    messagesLoading,
    isSending,
    sendMessage,
    checkConnection,
  } = useApp()

  const [inputValue, setInputValue] = useState('')

  const handleSend = async (message) => {
    setInputValue('')
    await sendMessage(message)
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <h2 className="text-lg font-medium mb-2">Not Connected</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 max-w-sm">
          {connectionError || 'Unable to connect to OpenTop server.'}
        </p>
        <Button onClick={checkConnection} size="sm">
          <Wifi className="h-4 w-4 mr-2" />
          Retry
        </Button>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
          Run <code className="px-1 py-0.5 bg-[hsl(var(--secondary))] rounded">opentop start</code> to start the server
        </p>
      </div>
    )
  }

  // Empty state - show welcome screen with centered input
  const showWelcome = messages.length === 0 && !messagesLoading

  if (showWelcome) {
    return (
      <WelcomeScreen
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSend={handleSend}
        disabled={!isConnected}
        isSending={isSending}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        isLoading={messagesLoading}
        isSending={isSending}
      />
      <InputBar
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={!isConnected}
        isSending={isSending}
      />
    </div>
  )
}
