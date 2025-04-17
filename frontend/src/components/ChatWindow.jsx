import React, { useState, useRef, useEffect, useContext } from "react";
import {
  FaMicrophone,
  FaSmile,
  FaMapPin,
  FaCamera,
  FaHeart,
  FaUserTimes,
  FaExclamationTriangle,
  FaTrashAlt,
} from "react-icons/fa";
import { FaPhone, FaVideo } from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { AuthContext } from "../utils/AuthProvider";
import {
  MdInsertDriveFile,
  MdPhoto,
  MdAudiotrack,
  MdPerson,
  MdVideoCall,
} from "react-icons/md";
import Picker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import mammoth from "mammoth";
import axios from "axios";
import { socket } from "../utils/commonFunctions/SocketConnection";

const ChatWindow = () => {
  const { user, userDetails } = useContext(AuthContext);
  const isuserEmpty = !userDetails || Object.keys(userDetails).length === 0;

  const [isPinDropdownOpen, setIsPinDropdownOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [fileContents, setFileContents] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);

  const documentInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const contactInputRef = useRef(null);

  // Initialize socket connection on mount
  useEffect(() => {
    if (user && user.token) {
      console.log("Initiating socket connection...");
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Fetch messages from API when user or userDetails changes
  const fetchMessages = async () => {
    if (user && userDetails && user.token && userDetails.id) {
      try {
        console.log("Fetching messages for user:", userDetails.id);
        const response = await axios.get(
          `http://38.77.155.139:8000/messaging/get-message/?sender_id=${user.id}&receiver_id=${userDetails.id}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        const messages = response.data.map((msg) => ({
          id: msg.id,
          text: msg.content || "",
          files: [], // No files in provided data
          sender: msg.sender === user.id ? "self" : "other",
          time: new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        // Clear previous messages and set new ones for the selected user
        setChatMessages(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setChatMessages([]);
      }
    } else {
      // Clear messages if no user is selected
      setChatMessages([]);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [user, userDetails]);

  // Socket.io setup and fetch messages after auth_success
  useEffect(() => {
    if (!user || !user.token) return;

    console.log("Setting up Socket.IO listeners...");

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server with ID:", socket.id);
      socket.emit("authenticate", { token: user.token });
    });

    socket.on("auth_success", (data) => {
      console.log("Authentication successful:", data);
      // Fetch messages if a user is already selected
      if (userDetails && userDetails.id) {
        fetchMessages();
      }
    });

    socket.on("auth_error", (error) => {
      console.error("Authentication error:", error.message);
      socket.disconnect();
      socket.connect();
    });

    socket.on("new_message", (messageData) => {
      console.log("Received new_message:", messageData);

      // Check if the message is relevant to the current chat
      const isRelevantMessage =
        (messageData.receiver === user.id &&
          messageData.sender === userDetails.id) ||
        (messageData.sender === user.id &&
          messageData.receiver === userDetails.id);

      if (isRelevantMessage) {
        const newMessage = {
          id: messageData.id,
          text: messageData.content || "",
          files: [], // No files in provided data
          sender: messageData.sender === user.id ? "self" : "other",
          time: new Date(messageData.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        // Add new message, avoiding duplicates
        setChatMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg.id === newMessage.id)) {
            return prevMessages; // Skip if message already exists
          }
          return [...prevMessages, newMessage];
        });
      } else {
        console.log("Message ignored: Not relevant to current chat");
      }
    });

    socket.on("message_sent", (data) => {
      console.log("Message sent confirmation:", data);
    });

    socket.on("error", (error) => {
      console.error("Socket.IO error:", error);
      alert(`Socket.IO error: ${error.message || JSON.stringify(error)}`);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      alert(`Connection failed: ${error.message || JSON.stringify(error)}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO server:", reason);
    });

    return () => {
      socket.off("connect");
      socket.off("auth_success");
      socket.off("auth_error");
      socket.off("new_message");
      socket.off("message_sent");
      socket.off("error");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [user, userDetails]);

  // File reading for documents
  useEffect(() => {
    const readFiles = async () => {
      const textFiles = selectedFiles.filter(
        (file) => file.type === "text/plain"
      );
      const docxFiles = selectedFiles.filter(
        (file) =>
          file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );

      for (const file of textFiles) {
        const text = await file.text();
        setFileContents((prev) => ({ ...prev, [file.name]: text }));
      }

      for (const file of docxFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFileContents((prev) => ({ ...prev, [file.name]: result.value }));
      }
    };
    readFiles();
  }, [selectedFiles]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleMenu = () => setShowMenu(!showMenu);
  const togglePinDropdown = () => {
    setIsPinDropdownOpen(!isPinDropdownOpen);
    setIsEmojiPickerOpen(false);
  };
  const toggleEmojiPicker = () => {
    setIsEmojiPickerOpen(!isEmojiPickerOpen);
    setIsPinDropdownOpen(false);
  };

  const onEmojiClick = (emojiObject) => {
    if (!isUserBlocked) setMessage(message + emojiObject.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleBlockUser = () => {
    if (isUserBlocked) {
      alert("User Unblocked!");
      setIsUserBlocked(false);
    } else {
      alert("User Blocked!");
      setIsUserBlocked(true);
      setMessage("");
      setSelectedFiles([]);
    }
    setShowMenu(false);
  };

  const handleFileSelect = (type, event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    }
    setIsPinDropdownOpen(false);
  };

  const openFileInput = (inputRef) => inputRef.current.click();

  const removeFile = (index) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    if (isUserBlocked || isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File(
          [audioBlob],
          `recording-${Date.now()}.webm`,
          {
            type: "audio/webm",
          }
        );
        setSelectedFiles((prevFiles) => [...prevFiles, audioFile]);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!isUserBlocked && (message.trim() || selectedFiles.length > 0)) {
      let fileData = [];
      if (selectedFiles.length > 0) {
        try {
          fileData = await Promise.all(
            selectedFiles.map(async (file) => ({
              name: file.name,
              type: file.type,
              base64: await fileToBase64(file),
            }))
          );
        } catch (error) {
          console.error("Error converting files to base64:", error);
          alert("Failed to process files.");
          return;
        }
      }

      const messageData = {
        sender: user.id,
        receiver: userDetails.id,
        content: message.trim(),
        files: fileData,
        timestamp: new Date().toISOString(),
      };

      console.log("Sending private_message:", messageData);
      socket.emit("private_message", messageData, (response) => {
        if (response && response.error) {
          console.error("Error sending message:", response.error);
          alert("Failed to send message.");
        } else {
          console.log("Message sent successfully:", response);
          // Fetch messages instantly after sending
          fetchMessages();
        }
      });

      const newMessage = {
        id: Date.now(), // Temporary ID until server responds
        text: message.trim(),
        files: selectedFiles.map((file, index) => ({
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
        })),
        sender: "self",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatMessages((prevMessages) => [...prevMessages, newMessage]);

      setMessage("");
      setSelectedFiles([]);
    }
  };

  const renderFilePreview = (file, isPreviewModal = false) => {
    const fileType = file.type.split("/")[0];
    const fileUrl = file.url;

    if (!fileUrl) {
      return (
        <div className="flex items-center gap-2">
          <MdInsertDriveFile className="text-gray-400" />
          <span>{file.name} (File not available)</span>
        </div>
      );
    }

    switch (fileType) {
      case "image":
        return (
          <img
            src={fileUrl}
            alt={file.name}
            className={
              isPreviewModal
                ? "max-w-full max-h-[80vh] object-contain"
                : "max-w-[300px] max-h-[150px] rounded-lg object-cover"
            }
          />
        );
      case "video":
        return (
          <video
            src={fileUrl}
            controls
            className={
              isPreviewModal
                ? "max-w-[80vw] max-h-[80vh] w-auto h-auto"
                : "max-w-[300px] max-h-[150px] rounded-lg"
            }
          />
        );
      case "audio":
        return (
          <audio
            src={fileUrl}
            controls
            className={isPreviewModal ? "w-[250px]" : "max-w-[250px]"}
          />
        );
      case "application":
        if (file.type === "application/pdf") {
          return isPreviewModal ? (
            <iframe
              src={fileUrl}
              title={file.name}
              className="w-[70vw] h-[70vh]"
            />
          ) : (
            <div className="flex items-center gap-2">
              <MdInsertDriveFile className="text-gray-400" />
              <span>{file.name}</span>
            </div>
          );
        } else if (
          file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          return isPreviewModal ? (
            <div
              className="text-white w-[70vw] h-[70vh] overflow-y-auto p-4"
              dangerouslySetInnerHTML={{
                __html: fileContents[file.name] || "Loading...",
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <MdInsertDriveFile className="text-gray-400" />
              <span>{file.name}</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <MdInsertDriveFile className="text-gray-400" />
            <span>{file.name}</span>
          </div>
        );
      case "text":
        return isPreviewModal ? (
          <div className="w-[70vw] h-[70vh] overflow-y-auto p-4">
            <pre className="text-white whitespace-pre-wrap">
              {fileContents[file.name] || "Loading..."}
            </pre>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MdInsertDriveFile className="text-gray-400" />
            <span>{file.name}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <MdInsertDriveFile className="text-gray-400" />
            <span>{file.name}</span>
          </div>
        );
    }
  };

  const handleFileClick = (file) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isuserEmpty) {
    return (
      <div className="flex flex-col h-full w-full bg-gray-900 justify-center items-center">
        <h2 className="text-white text-lg font-semibold">
          Start Your Conversation
        </h2>
        <p className="text-gray-400 mt-2">Select a user to begin chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-3 bg-gray-800 border-b border-gray-700 shrink-0">
        <div
          onClick={openProfileModal}
          className="cursor-pointer flex items-center flex-1 min-w-0"
        >
          <div className="relative">
            <img
              src={
                userDetails?.avatar === null
                  ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                  : userDetails?.avatar
              }
              alt="User Avatar"
              className="w-8 h-8 rounded-full mr-2"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">
              {userDetails?.username || "User"}
            </h2>
            <p className="text-xs text-gray-400 truncate">
              {userDetails?.is_active ? "online" : "offline"}
            </p>
          </div>
        </div>
        <div className="flex space-x-3 relative">
          <button className="text-gray-400 hover:text-white">
            <FaPhone className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-white">
            <FaVideo className="w-4 h-4" />
          </button>
          <button
            className="text-gray-400 hover:text-white"
            onClick={toggleMenu}
          >
            <HiDotsVertical className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownVariants}
                transition={{ duration: 0.2 }}
                className="absolute top-8 right-0 mt-2 w-36 bg-gray-700 text-white rounded shadow-lg z-20"
              >
                <button
                  className="block px-3 py-2 text-sm hover:bg-gray-600 w-full text-left"
                  onClick={handleBlockUser}
                >
                  {isUserBlocked ? "Unblock User" : "Block User"}
                </button>
                <button
                  className="block px-3 py-2 text-sm hover:bg-gray-600 w-full text-left"
                  onClick={() => {
                    alert("Chat Cleared");
                    setChatMessages([]);
                  }}
                >
                  Clear Chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 p-3 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p>No messages yet.</p>
            <p>Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((msg, index) => (
            <motion.div
              key={msg.id || index}
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              className={`flex ${
                msg.sender === "self" ? "justify-end" : "items-start"
              } mb-3`}
            >
              {msg.sender === "other" && (
                <img
                  src={
                    userDetails?.avatar === null
                      ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                      : userDetails?.avatar
                  }
                  alt="User Avatar"
                  className="w-6 h-6 rounded-full mr-2 flex-shrink-0"
                />
              )}
              <div className="max-w-[80%]">
                {msg.text && (
                  <div
                    className={`p-2 rounded-lg text-sm ${
                      msg.sender === "self"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {msg.files.map((file, fileIndex) => (
                      <div
                        key={fileIndex}
                        className={`p-2 rounded-lg cursor-pointer ${
                          msg.sender === "self"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-white"
                        }`}
                        onClick={() => handleFileClick(file)}
                      >
                        {renderFilePreview(file)}
                      </div>
                    ))}
                  </div>
                )}
                <p
                  className={`text-xs text-gray-400 mt-1 ${
                    msg.sender === "self" ? "text-right" : ""
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </motion.div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative p-3 bg-gray-800 border-t border-gray-700 shrink-0">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <button
              className="text-gray-400 hover:text-white"
              onClick={togglePinDropdown}
              disabled={isUserBlocked}
            >
              <FaMapPin className="w-4 h-4" />
            </button>
            <button
              disabled={isUserBlocked}
              className="text-gray-400 hover:text-white"
            >
              <FaCamera className="w-4 h-4" />
            </button>
            <button
              onClick={handleMicClick}
              disabled={isUserBlocked}
              className={`text-gray-400 hover:text-white ${
                isRecording ? "text-red-500" : ""
              }`}
            >
              <FaMicrophone className="w-4 h-4" />
            </button>
            {isRecording && (
              <span className="text-white text-xs">
                {Math.floor(recordingTime / 60)}:
                {(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>

          <div
            className={`flex-1 min-w-0 bg-gray-700 p-2 rounded-lg text-white text-sm flex flex-col gap-2 ${
              isUserBlocked ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-gray-600 text-white px-2 py-1 rounded truncate max-w-[120px] text-xs"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="ml-2 text-red-400 hover:text-red-600"
                      disabled={isUserBlocked}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder={
                isUserBlocked
                  ? "User is blocked"
                  : selectedFiles.length > 0
                  ? "Add a message (optional)"
                  : "Type a message"
              }
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 w-full text-sm"
              value={message}
              onChange={(e) => !isUserBlocked && setMessage(e.target.value)}
              disabled={isUserBlocked}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="text-gray-400 hover:text-white"
              onClick={toggleEmojiPicker}
              disabled={isUserBlocked}
            >
              <FaSmile className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={
                isUserBlocked || (!message.trim() && selectedFiles.length === 0)
              }
              className={`px-3 py-2 rounded-lg text-sm text-white ${
                isUserBlocked || (!message.trim() && selectedFiles.length === 0)
                  ? "bg-blue-600 opacity-50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Send
            </button>
          </div>
        </div>

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={documentInputRef}
          onChange={(e) => handleFileSelect("Document", e)}
          accept=".pdf,.doc,.docx,.txt"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={photoInputRef}
          onChange={(e) => handleFileSelect("Photo", e)}
          accept="image/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileSelect("Video", e)}
          accept="video/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={audioInputRef}
          onChange={(e) => handleFileSelect("Audio", e)}
          accept="audio/*"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={contactInputRef}
          onChange={(e) => handleFileSelect("Contact", e)}
          accept=".vcf"
          multiple
          className="hidden"
        />

        <AnimatePresence>
          {isPinDropdownOpen && !isUserBlocked && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={dropdownVariants}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 left-2 w-40 bg-gray-700 rounded-lg shadow-lg z-20"
            >
              <ul className="py-2 text-white">
                <li
                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center text-sm"
                  onClick={() => openFileInput(documentInputRef)}
                >
                  <MdInsertDriveFile className="mr-2 text-gray-400" /> Documents
                </li>
                <li
                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center text-sm"
                  onClick={() => openFileInput(photoInputRef)}
                >
                  <MdPhoto className="mr-2 text-gray-400" /> Photos
                </li>
                <li
                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center text-sm"
                  onClick={() => openFileInput(videoInputRef)}
                >
                  <MdVideoCall className="mr-2 text-gray-400" /> Video
                </li>
                <li
                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center text-sm"
                  onClick={() => openFileInput(audioInputRef)}
                >
                  <MdAudiotrack className="mr-2 text-gray-400" /> Audio
                </li>
                <li
                  className="px-3 py-2 hover:bg-gray-600 cursor-pointer flex items-center text-sm"
                  onClick={() => openFileInput(contactInputRef)}
                >
                  <MdPerson className="mr-2 text-gray-400" /> Contact
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isEmojiPickerOpen && !isUserBlocked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-16 left-2 right-2 bg-gray-700 rounded-lg shadow-lg z-20"
            >
              <Picker
                onEmojiClick={onEmojiClick}
                theme="dark"
                emojiStyle="apple"
                height={250}
                width="100%"
                previewConfig={{ showPreview: false }}
                searchDisabled
                skinTonesDisabled
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* File Preview Modal */}
        <AnimatePresence>
          {previewFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
              onClick={closePreview}
            >
              <div
                className="relative bg-gray-800 p-4 rounded-lg max-w-[80vw] max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-xl text-white hover:text-gray-400"
                  onClick={closePreview}
                >
                  ×
                </button>
                <div className="flex justify-center items-center">
                  {renderFilePreview(previewFile, true)}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Modal */}
        <AnimatePresence>
          {isProfileModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
              onClick={closeProfileModal}
            >
              <div
                className="relative bg-gray-800 p-4 rounded-lg w-[24rem] max-w-[80vw] max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-xl text-white hover:text-gray-400"
                  onClick={closeProfileModal}
                  aria-label="Close Profile"
                >
                  ×
                </button>
                <div className="flex flex-col items-center w-full p-6">
                  <img
                    src={
                      userDetails?.avatar === null
                        ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                        : userDetails?.avatar
                    }
                    alt="User Avatar"
                    className={`w-[7rem] h-[7rem] rounded-full ${
                      userDetails?.is_active
                        ? "ring-4 ring-green-500"
                        : "ring-4 ring-gray-700"
                    }`}
                  />
                  <h2 className="text-lg mt-3 font-semibold text-white">
                    {userDetails?.username}
                  </h2>
                  <p className="text-gray-400 mb-4">
                    {userDetails?.is_active ? "online" : "offline"}
                  </p>
                  <div className="w-full mt-4 space-y-4 text-left py-4 px-2 flex flex-col">
                    {[
                      {
                        label: "Add to Favorites",
                        icon: <FaHeart />,
                        action: () => alert("Added to Favorites!"),
                      },
                      {
                        label: isUserBlocked ? "Unblock User" : "Block User",
                        icon: <FaUserTimes className="text-red-500" />,
                        action: handleBlockUser,
                      },
                      {
                        label: "Report",
                        icon: (
                          <FaExclamationTriangle className="text-red-500" />
                        ),
                        action: () => alert("Reported!"),
                      },
                      {
                        label: "Delete Chat",
                        icon: <FaTrashAlt className="text-red-500" />,
                        action: () => {
                          alert("Chat Deleted!");
                          setChatMessages([]);
                        },
                      },
                    ].map((button, index) => (
                      <button
                        key={index}
                        className="flex items-center px-3 py-2 bg-transparent text-white rounded-lg hover:bg-gray-700 text-sm"
                        onClick={button.action}
                        aria-label={button.label}
                      >
                        <span className="mr-2">{button.icon}</span>
                        {button.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatWindow;

