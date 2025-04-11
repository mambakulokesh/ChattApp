import React from 'react';
import ChatWindow from '../components/ChatWindow';
import Profile from '../components/Profile';
import ContactList from '../components/ContactList';

const ChatPage = () => {
  return (
    <div className="flex justify-center items-center h-screen w-screen bg-gray-100">
      <div className="flex flex-row h-[93vh] w-[90vw] max-w-[80vw] rounded-lg shadow-lg overflow-hidden">
        <div className="w-1/4 h-full bg-white border-gray-200">
          <ContactList />
        </div>
        <div className="w-2/4 h-full bg-gray-50">
          <ChatWindow />
        </div>
        <div className="w-1/4 h-full bg-white border-gray-200">
          <Profile />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;