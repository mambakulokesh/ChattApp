import React, { useState, useContext, useEffect, useRef } from 'react';
import { AiOutlineSearch } from 'react-icons/ai';
import { FiMoreVertical } from 'react-icons/fi';
import { AuthContext } from '../utils/AuthProvider';
import axios from 'axios';
import { socket } from '../utils/commonFunctions/SocketConnection';

const ContactList = ({ setActiveTab }) => {
  const { user, getUserDetails } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [contactList, setContactList] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState('all'); // New state for tab selection
  const menuRef = useRef(null);

  // Fetch users and groups
  const fetchContacts = async () => {
    if (!user || !user.token) return;
    try {
      setIsLoading(true);
      const usersRes = await axios.get(
        'http://38.77.155.139:8000/user/get-all-users/',
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const users = usersRes.data
        .filter((apiUser) => apiUser.id !== user.id)
        .map((apiUser) => ({
          id: apiUser.id,
          username: apiUser.username || 'Unknown User',
          email: apiUser.email || '',
          avatar: apiUser.avatar,
          is_active: apiUser.is_active,
          type: 'user',
        }));

      const groupsRes = await axios.get(
        'http://38.77.155.139:8000/messaging/get-groups/',
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      const groups = groupsRes.data.map((group) => ({
        id: group.id,
        username: group.group_name,
        avatar: null,
        is_active: true,
        type: 'group',
        members: group.members,
      }));

      setContactList([...groups, ...users]);
    } catch (error) {
      console.error('Error fetching contacts:', error.message);
      setContactList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [user]);

  // Socket event listeners  
  useEffect(() => {
    if (!user || !user.token) return;

    socket.on('new_message', (messageData) => {
      if (messageData.room_id) {
        if (messageData.room_id !== selectedContact?.id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [messageData.room_id]: (prev[messageData.room_id] || 0) + 1,
          }));
        }
      } else if (
        messageData.receiver_id === user.id &&
        messageData.sender_id !== selectedContact?.id
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [messageData.sender_id]: (prev[messageData.sender_id] || 0) + 1,
        }));
      }
    });

    socket.on('create_room_success', async (data) => {
      console.log(data.message);
      await fetchContacts();
      setShowGroupModal(false);
      setSelectedUsers([]);
      setGroupName('');
      setSelectedContact({
        id: data.room_id,
        username: data.room_name,
        avatar: null,
        is_active: true,
        type: data.type,
        members: data.members,
      });
      setActiveTab('chat');
    });

    socket.on('room_created', async (data) => {
      console.log(data.message);
      await fetchContacts();
    });

    socket.on('create_room_error', (data) => {
      console.log("Create Room Error: ", data.message || 'Failed to create group.');
    });

    socket.on('status_updated', (data) => {
      if (!data.user_id || typeof data.active !== 'boolean') return;
      setContactList((prev) =>
        prev.map((contact) =>
          contact.type === 'user' && contact.id === data.user_id
            ? { ...contact, is_active: data.active }
            : contact
        )
      );
      if (selectedContact && selectedContact.id === data.user_id) {
        setSelectedContact((prev) => ({ ...prev, is_active: data.active }));
        getUserDetails({ ...selectedContact, is_active: data.active });
      }
    });

    socket.on('logout_status_updated', (data) => {
      if (!data.user_id || typeof data.active !== 'boolean') return;
      setContactList((prev) =>
        prev.map((contact) =>
          contact.type === 'user' && contact.id === data.user_id
            ? { ...contact, is_active: data.active }
            : contact
        )
      );
      if (selectedContact && selectedContact.id === data.user_id) {
        setSelectedContact((prev) => ({ ...prev, is_active: data.active }));
        getUserDetails({ ...selectedContact, is_active: data.active });
      }
    });

    socket.on("make_active_error", (error) => {
      console.error("Make Active error:", error.message);
    });

    return () => {
      socket.off('new_message');
      socket.off('create_room_success');
      socket.off('room_created');
      socket.off('create_room_error');
      socket.off('status_updated');
      socket.off('logout_status_updated');
      socket.off("make_active_error");
    };
  }, [user, selectedContact]);



  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);


  const handleSearchChange = (e) => setSearch(e.target.value);

  const showUserDetails = (contact) => {
    setSelectedContact(contact);
    getUserDetails(contact);
    setActiveTab('chat');
    setUnreadCounts((prev) => ({
      ...prev,
      [contact.id]: 0,
    }));
  };


  const filteredContacts = contactList.filter((contact) => {
    const matchesSearch = (contact.username || '')
      .toLowerCase()
      .includes(search.toLowerCase());
    if (activeTabFilter === 'all') return matchesSearch;
    if (activeTabFilter === 'chats') return matchesSearch && contact.type === 'user';
    if (activeTabFilter === 'groups') return matchesSearch && contact.type === 'group';
    return matchesSearch;
  });


  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    if (selectedUsers.length < 2 || !groupName) return;
    socket.emit('create_room', {
      token: user.token,
      room_name: groupName,
      member_ids: selectedUsers,
    });
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 px-6 py-4 flex items-center justify-between shrink-0 relative">
        <div
          className="flex items-center space-x-4 min-w-0 cursor-pointer"
          onClick={() => setActiveTab('profile')}
        >
          <img
            src={
              user?.avatar === null
                ? 'https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg'
                : user?.avatar
            }
            alt={user?.username}
            className={`w-8 h-8 rounded-full ${
              user?.is_active ? 'ring-4 ring-green-500' : 'ring-4 ring-gray-700'
            }`}
          />
          <div className="flex flex-col leading-tight min-w-0">
            <h3 className="text-md font-semibold truncate">{user?.username}</h3>
            <p className="text-xs text-gray-400">{user?.bio}</p>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            className="p-2 rounded-full hover:bg-gray-700 transition"
            onClick={() => setProfileMenuOpen((v) => !v)}
          >
            <FiMoreVertical className="text-xl text-gray-300" />
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-gray-800 border border-gray-700 rounded shadow-lg z-20">
              <button
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setShowGroupModal(true);
                }}
              >
                New Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-gray-800 border-gray-700 p-3 shrink-0">
        <div className="relative flex items-center w-full">
          <AiOutlineSearch className="absolute left-2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-8 p-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 shrink-0 flex justify-around">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-full transition ${
            activeTabFilter === 'all'
              ? 'bg-gray-100 text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTabFilter('all')}
        >
          All
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-full transition ${
            activeTabFilter === 'chats'
              ? 'bg-gray-100 text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTabFilter('chats')}
        >
          Chats
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-full transition ${
            activeTabFilter === 'groups'
              ? 'bg-gray-100 text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          onClick={() => setActiveTabFilter('groups')}
        >
          Groups
        </button>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {isLoading ? (
          <div className="flex justify-center items-center mt-4">
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact, index) => (
            <div
              key={contact.type + '-' + contact.id}
              className={`flex items-center p-3 px-6 py-4 hover:bg-gray-800 cursor-pointer transition-all animate-slideIn ${
                selectedContact?.id === contact.id &&
                selectedContact?.type === contact.type
                  ? 'bg-gray-700'
                  : ''
              } ${index !== filteredContacts.length - 1 ? 'border-b border-gray-700' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => showUserDetails(contact)}
            >
              {contact.type === 'group' ? (
                <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg ring-4 ring-blue-500">
                  <span>
                    {contact.username ? contact.username[0].toUpperCase() : 'G'}
                  </span>
                </div>
              ) : (
                <img
                  src={
                    contact.avatar === null
                      ? 'https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg'
                      : contact.avatar
                  }
                  alt={contact.username}
                  className={`w-8 h-8 rounded-full ${
                    contact.is_active
                      ? 'ring-4 ring-green-500'
                      : 'ring-4 ring-gray-700'
                  }`}
                />
              )}
              <div className="flex justify-between items-center flex-1 ml-3">
                <div className="flex flex-col leading-tight min-w-0">
                  <h3 className="text-md font-semibold truncate">
                    {contact.username}
                  </h3>
                  <p className="text-xs text-gray-400 truncate">
                    {contact.type === 'group'
                      ? `${contact.members?.length || 1} members`
                      : contact.is_active
                      ? 'online'
                      : 'offline'}
                  </p>
                </div>
                {unreadCounts[contact.id] > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCounts[contact.id]}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center mt-4 text-sm">
            No contacts found.
          </p>
        )}
      </div>

      {/* Group Creation Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-30">
          <div className="bg-gray-900 p-6 rounded-lg w-96 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Create New Group</h2>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Select users:
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-700 rounded p-2">
                {contactList
                  .filter((c) => c.type === 'user')
                  .map((contact) => (
                    <label
                      key={contact.id}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(contact.id)}
                        onChange={() => handleUserSelect(contact.id)}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      <span>{contact.username}</span>
                    </label>
                  ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Group name:
              </label>
              <input
                type="text"
                className="w-full p-2 rounded bg-gray-800 text-white"
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 bg-gray-700 rounded"
                onClick={() => {
                  setShowGroupModal(false);
                  setSelectedUsers([]);
                  setGroupName('');
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 rounded text-white"
                onClick={handleCreateGroup}
                disabled={selectedUsers.length < 2 || !groupName}
              >
                Create Group
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Select at least 2 users and provide a group name.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactList;
