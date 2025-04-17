import React, { useState, useContext, useEffect } from "react";
import { BsCameraVideo, BsTelephone } from "react-icons/bs";
import { AiOutlineSearch } from "react-icons/ai";
import { AuthContext } from "../utils/AuthProvider";
import axios from "axios";

const ContactList = () => {
  const [search, setSearch] = useState("");
  const [contactList, setContactList] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const { user, getUserDetails } = useContext(AuthContext);

  const userList = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          "http://38.77.155.139:8000/user/get-all-users/",
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        const users = response.data
          .filter((apiUser) => !user || apiUser.id !== user.id)
          .map((apiUser) => ({
            id: apiUser.id,
            username: apiUser.username || "Unknown User",
            email: apiUser.email || "",
            avatar: apiUser.avatar,
            is_active: apiUser.is_active,
            status: apiUser.is_active ? "Online" : "Offline",
          }));

        setContactList(users);
      } catch (error) {
        console.error("Error fetching users:", error.message);
        setContactList([]);
      }
    };

    fetchUsers();
  }, [user]);

  const handleSearchChange = (e) => setSearch(e.target.value);

  const showUserDetails = (contact) => {
    setSelectedContact(contact);
    getUserDetails(contact);
  };

  const startVideoCall = () => {
    if (!selectedContact)
      return alert("Please select a contact to start a video call.");
    setShowVideo(true);
    alert(`Starting video call with ${selectedContact.username}`);
  };

  const filteredContacts = contactList.filter((contact) =>
    (contact.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full w-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4 min-w-0">
          <img
            src={
              // user?.avatar === null
                 "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                // : user?.avatar
            }
            alt={user?.username}
            className={`w-8 h-8 rounded-full ${
              user?.active_status ? "ring-4 ring-green-500" : "ring-4 ring-gray-700"
            }`}
          />
          <div className="flex flex-col leading-tight min-w-0">
            <h3 className="text-md font-semibold truncate">
              {userList?.username}
            </h3>

            <p className="text-xs text-gray-400">
              {userList?.bio}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="text-gray-400 hover:text-white"
            onClick={startVideoCall}
            title="Start video call"
          >
            <BsCameraVideo className="w-4 h-4" />
          </button>
          <button
            className="text-gray-400 hover:text-white"
            title="Start audio call"
            onClick={() =>
              selectedContact
                ? alert(`Calling ${selectedContact.username}`)
                : alert("Please select a contact to call.")
            }
          >
            <BsTelephone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 shrink-0">
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

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact, index) => (
            <div
              key={contact.id}
              className={`flex items-center p-3 px-6 py-4 hover:bg-gray-800 cursor-pointer transition-all animate-slideIn ${
                selectedContact?.id === contact.id ? "bg-gray-700" : ""
              } ${index !== filteredContacts.length - 1 ? "border-b border-gray-700" : ""}`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => showUserDetails(contact)}
            >
              <img
                src={
                  contact.avatar === null
                    ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                    : contact.avatar
                }
                alt={contact.username}
                className={`w-8 h-8 rounded-full ${
                  contact.is_active ? "ring-4 ring-green-500" : "ring-4 ring-gray-700"
                }`}
              />
              <div className="flex flex-col ml-3 leading-tight min-w-0">
                <h3 className="text-md font-semibold truncate">
                  {contact.username}
                </h3>
                <p className="text-xs text-gray-400 truncate">{contact.status}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center mt-4 text-sm">
            {contactList.length === 0
              ? "Loading or no contacts available."
              : "No contacts found."}
          </p>
        )}
      </div>

      {/* Video Call Preview */}
      {showVideo && (
        <video
          autoPlay
          muted
          className="absolute bottom-2 left-2 w-24 h-16 rounded-lg border border-white shadow-lg z-10"
        />
      )}
    </div>
  );
};

export default ContactList;