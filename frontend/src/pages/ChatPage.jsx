import React from 'react'
import ChatWindow from '../components/ChatWindow'
import Profile from '../components/Profile'

const ChatPage = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="flex-1 h-full">
        <ChatWindow />
      </div>
      <div className="h-screen">
        <Profile />
      </div>
    </div>
  )
}

export default ChatPage