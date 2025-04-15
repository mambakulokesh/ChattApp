import React, { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import Profile from '../components/Profile';
import ContactList from '../components/ContactList';
import { FaUser, FaComments, FaAddressBook } from 'react-icons/fa';

const ChatPage = () => {
  const [activeTab, setActiveTab] = useState('chat'); // Track active component on mobile

  return (
    <div className="flex justify-center items-center min-h-screen w-screen bg-gray-100 p-2 sm:p-4">
      <div className="flex flex-col md:flex-row h-[90vh] w-full max-w-[80vw] rounded-lg shadow-lg overflow-hidden">
        {/* Mobile Navigation */}
        <div className="md:hidden flex justify-around bg-gray-800 text-white p-2">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 p-2 text-center rounded-lg ${
              activeTab === 'contacts' ? 'bg-gray-600' : 'hover:bg-gray-700'
            }`}
            aria-label="Show Contacts"
          >
            <FaAddressBook className="inline-block mr-1" /> Contacts
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 p-2 text-center rounded-lg ${
              activeTab === 'chat' ? 'bg-gray-600' : 'hover:bg-gray-700'
            }`}
            aria-label="Show Chat"
          >
            <FaComments className="inline-block mr-1" /> Chat
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 p-2 text-center rounded-lg ${
              activeTab === 'profile' ? 'bg-gray-600' : 'hover:bg-gray-700'
            }`}
            aria-label="Show Profile"
          >
            <FaUser className="inline-block mr-1" /> Profile
          </button>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col md:flex-row w-full h-full">
          {/* ContactList */}
          <div
            className={`${
              activeTab === 'contacts' ? 'block' : 'hidden'
            } md:block w-full md:w-1/4 h-[30vh] md:h-full bg-white border-r border-gray-200 overflow-y-auto`}
          >
            <ContactList />
          </div>

          {/* ChatWindow */}
          <div
            className={`${
              activeTab === 'chat' ? 'block' : 'hidden'
            } md:block w-full md:w-1/2 lg:w-2/3 h-[40vh] md:h-full bg-gray-50 overflow-y-auto`}
          >
            <ChatWindow />
          </div>

          {/* Profile */}
          <div
            className={`${
              activeTab === 'profile' ? 'block' : 'hidden'
            } md:block w-full md:w-1/4 h-[30vh] md:h-full bg-white border-l border-gray-200 overflow-y-auto`}
          >
            <Profile />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;