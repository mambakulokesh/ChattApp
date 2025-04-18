import React, { useState, useRef, useEffect, useContext } from "react";
import {
  FaMicrophone,
  FaSmile,
  FaMapPin,
  FaCamera,
  FaHeart,
  FaUserTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
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
import { fileToBase64 } from "../utils/commonFunctions/ConvertToBase64";

const ChatWindow = () => {
  const { user, userDetails } = useContext(AuthContext);
  const isuserEmpty = !userDetails || Object.keys(userDetails).length === 0;

  const [isPinDropdownOpen, setIsPinDropdownOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
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

  useEffect(() => {
    if (user && user.token) {
      console.log("Initiating socket connection...");
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (user && userDetails && user.token && userDetails.id) {
      const fetchMessages = async () => {
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
            file: msg.file_url
              ? {
                  name: msg.file_name || "File",
                  url: msg.file_url, // Use server-provided URL
                  type: msg.file_type || "application/octet-stream",
                }
              : null,
            sender: msg.sender === user.id ? "self" : "other",
            time: new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));

          setChatMessages(messages);
        } catch (error) {
          console.error("Error fetching messages:", error);
          setChatMessages([]);
        }
      };

      fetchMessages();
    } else {
      setChatMessages([]);
    }
  }, [user, userDetails]);

  useEffect(() => {
    if (!user || !user.token) return;

    console.log("Setting up Socket.IO listeners...");
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server with ID:", socket.id);
      socket.emit("authenticate", { token: user.token });
    });

    socket.on("auth_success", (data) => {
      console.log("Authentication successful:", data);
    });

    socket.on("auth_error", (error) => {
      console.error("Authentication error:", error.message);
      socket.disconnect();
      socket.connect();
    });

    socket.on("new_message", (messageData) => {
      console.log("Received new_message:", messageData);
      const isRelevantMessage =
        (messageData.receiver_id === user.id &&
          messageData.sender_id === userDetails.id) ||
        (messageData.sender_id === user.id &&
          messageData.receiver_id === userDetails.id);

      if (isRelevantMessage) {
        const newMessage = {
          id: messageData.id,
          text: messageData.content || "",
          file: messageData.file_url
            ? {
                name: messageData.file_name || "File",
                url: messageData.file_url, // Use server-provided URL
                type: messageData.file_type || "application/octet-stream",
              }
            : null,
          sender: messageData.sender_id === user.id ? "self" : "other",
          time: new Date(messageData.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setChatMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    });

    socket.on("message_sent", (data) => {
      console.log("Message sent confirmation:", data);
      // Update the message with the server-provided file_url
      if (data.file_url) {
        setChatMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === Date.now() && msg.file
              ? { ...msg, file: { ...msg.file, url: data.file_url } }
              : msg
          )
        );
      }
    });

    socket.on("error", (error) => {
      console.error("Socket.IO error:", error);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
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

  useEffect(() => {
    const readFile = async () => {
      if (!selectedFile) return;
      const file = selectedFile;
      if (file.type === "text/plain") {
        const text = await file.text();
        setFileContents((prev) => ({ ...prev, [file.name]: text }));
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFileContents((prev) => ({ ...prev, [file.name]: result.value }));
      }
    };
    readFile();
  }, [selectedFile]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

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
      setSelectedFile(null);
    }
    setShowMenu(false);
  };

  const handleFileSelect = (type, event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
    setIsPinDropdownOpen(false);
    event.target.value = null; // Reset input to allow re-selecting the same file
  };

  const openFileInput = (inputRef) => inputRef.current.click();

  const removeFile = () => {
    setSelectedFile(null);
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
        setSelectedFile(audioFile);
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

  const handleSend = async () => {
    if (!isUserBlocked && (message.trim() || selectedFile)) {
      let fileData = {
        file_type: null,
        file_name: null,
        file_url: null,
      };

      if (selectedFile) {
        try {
          const base64 = await fileToBase64(selectedFile);
          fileData = {
            file_type: selectedFile.type,
            file_name: selectedFile.name,
            file_url: base64, // Send base64 to server
          };
        } catch (error) {
          console.error("Error converting file to base64:", error);
          alert("Failed to process file.");
          return;
        }
      }

      const messageData = {
        sender_id: user.id,
        receiver_id: userDetails.id,
        content: message.trim() || "",
        file_type: fileData.file_type,
        file_name: fileData.file_name,
        file_url: fileData.file_url,
        timestamp: new Date().toISOString(),
      };

      console.log("Sending private_message:", messageData);

      socket.emit("private_message", messageData);

      const newMessage = {
        id: Date.now(), // Temporary ID until server confirms
        text: message.trim() || "",
        file: selectedFile
          ? {
              name: selectedFile.name,
              url: URL.createObjectURL(selectedFile), // Temporary local URL for instant preview
              type: selectedFile.type,
            }
          : null,
        sender: "self",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setChatMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
      setSelectedFile(null);
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
        <h2 className="text-white text-base sm:text-lg font-semibold">
          Start Your Conversation
        </h2>
        <p className="text-gray-400 mt-2 text-sm sm:text-base">
          Select a user to begin chatting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center p-2 sm:p-3 bg-gray-800 border-b border-gray-700 shrink-0">
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
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
              {userDetails?.username || "User"}
            </h2>
            <p className="text-xs text-gray-400 truncate">
              {userDetails?.is_active ? "online" : "offline"}
            </p>
          </div>
        </div>
        <div className="flex space-x-2 sm:space-x-3 relative">
          <button className="text-gray-400 hover:text-white" onClick={toggleMenu}>
            <HiDotsVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownVariants}
                transition={{ duration: 0.2 }}
                className="absolute top-8 right-0 mt-2 w-32 sm:w-36 bg-gray-700 text-white rounded shadow-lg z-20"
              >
                <button
                  className="block px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm hover:bg-gray-600 w-full text-left"
                  onClick={handleBlockUser}
                >
                  {isUserBlocked ? "Unblock User" : "Block User"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto scrollbar-hide">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-xs sm:text-sm">No messages yet.</p>
            <p className="text-xs sm:text-sm">Start the conversation!</p>
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
              } mb-2 sm:mb-3`}
            >
              {msg.sender === "other" && (
                <img
                  src={
                    userDetails?.avatar === null
                      ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                      : userDetails?.avatar
                  }
                  alt="User Avatar"
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-1 sm:mr-2 flex-shrink-0"
                />
              )}
              <div className="max-w-[80%]">
                {msg.text && (
                  <div
                    className={`p-1 sm:p-2 rounded-lg text-xs sm:text-sm ${
                      msg.sender === "self"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
                {msg.file && (
                  <div
                    className={`mt-1 sm:mt-2 p-1 sm:p-2 rounded-lg cursor-pointer ${
                      msg.sender === "self"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                    onClick={() => handleFileClick(msg.file)}
                  >
                    {msg.file.url ? (
                      <>
                        {msg.file.type.startsWith("image/") && (
                          <img
                            src={msg.file.url}
                            alt={msg.file.name}
                            className="max-w-[150px] sm:max-w-[200px] max-h-[100px] sm:max-h-[150px] rounded-lg object-cover"
                          />
                        )}
                        {msg.file.type.startsWith("video/") && (
                          <video
                            src={msg.file.url}
                            controls
                            className="max-w-[150px] sm:max-w-[200px] max-h-[100px] sm:max-h-[150px] rounded-lg"
                          />
                        )}
                        {msg.file.type.startsWith("audio/") && (
                          <audio
                            src={msg.file.url}
                            controls
                            className="max-w-[200px] sm:max-w-[250px]"
                          />
                        )}
                        {msg.file.type === "application/pdf" && (
                          <div className="flex items-center gap-2">
                            <MdInsertDriveFile className="text-gray-400" />
                            <span>{msg.file.name}</span>
                          </div>
                        )}
                        {msg.file.type ===
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                          <div className="flex items-center gap-2">
                            <MdInsertDriveFile className="text-gray-400" />
                            <span>{msg.file.name}</span>
                          </div>
                        )}
                        {msg.file.type.startsWith("text/") && (
                          <div className="flex items-center gap-2">
                            <MdInsertDriveFile className="text-gray-400" />
                            <span>{msg.file.name}</span>
                          </div>
                        )}
                        {!msg.file.type.startsWith("image/") &&
                          !msg.file.type.startsWith("video/") &&
                          !msg.file.type.startsWith("audio/") &&
                          msg.file.type !== "application/pdf" &&
                          msg.file.type !==
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
                          !msg.file.type.startsWith("text/") && (
                            <div className="flex items-center gap-2">
                              <MdInsertDriveFile className="text-gray-400" />
                              <span>{msg.file.name}</span>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MdInsertDriveFile className="text-gray-400" />
                        <span>{msg.file.name} (File not available)</span>
                      </div>
                    )}
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
      <div className="relative p-2 sm:p-3 bg-gray-800 border-t border-gray-700 shrink-0">
        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="text-gray-400 hover:text-white"
              onClick={togglePinDropdown}
              disabled={isUserBlocked}
            >
              <FaMapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              disabled={isUserBlocked}
              className="text-gray-400 hover:text-white"
            >
              <FaCamera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleMicClick}
              disabled={isUserBlocked}
              className={`text-gray-400 hover:text-white ${
                isRecording ? "text-red-500" : ""
              }`}
            >
              <FaMicrophone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            {isRecording && (
              <span className="text-white text-xs">
                {Math.floor(recordingTime / 60)}:
                {(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            )}
          </div>

          <div
            className={`flex-1 min-w-0 bg-gray-700 p-1 sm:p-2 rounded-lg text-white text-xs sm:text-sm flex flex-col gap-1 sm:gap-2 ${
              isUserBlocked ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {selectedFile && (
              <div className="flex items-center bg-gray-600 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[100px] sm:max-w-[120px] text-xs">
                <span className="truncate">{selectedFile.name}</span>
                <button
                  onClick={removeFile}
                  className="ml-1 sm:ml-2 text-red-400 hover:text-red-600"
                  disabled={isUserBlocked}
                >
                  ×
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder={
                isUserBlocked
                  ? "User is blocked"
                  : selectedFile
                  ? "Add a message (optional)"
                  : "Type a message"
              }
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-400 w-full text-xs sm:text-sm"
              value={message}
              onChange={(e) => !isUserBlocked && setMessage(e.target.value)}
              disabled={isUserBlocked}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className="text-gray-400 hover:text-white"
              onClick={toggleEmojiPicker}
              disabled={isUserBlocked}
            >
              <FaSmile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={isUserBlocked || (!message.trim() && !selectedFile)}
              className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm text-white ${
                isUserBlocked || (!message.trim() && !selectedFile)
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
          className="hidden"
        />
        <input
          type="file"
          ref={photoInputRef}
          onChange={(e) => handleFileSelect("Photo", e)}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileSelect("Video", e)}
          accept="video/*"
          className="hidden"
        />
        <input
          type="file"
          ref={audioInputRef}
          onChange={(e) => handleFileSelect("Audio", e)}
          accept="audio/*"
          className="hidden"
        />
        <input
          type="file"
          ref={contactInputRef}
          onChange={(e) => handleFileSelect("Contact", e)}
          accept=".vcf"
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
              className="absolute bottom-14 sm:bottom-16 left-2 w-36 sm:w-40 bg-gray-700 rounded-lg shadow-lg z-20"
            >
              <ul className="py-1 sm:py-2 text-white">
                <li
                  className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-gray-600 cursor-pointer flex items-center text-xs sm:text-sm"
                  onClick={() => openFileInput(documentInputRef)}
                >
                  <MdInsertDriveFile className="mr-2 text-gray-400" /> Documents
                </li>
                <li
                  className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-gray-600 cursor-pointer flex items-center text-xs sm:text-sm"
                  onClick={() => openFileInput(photoInputRef)}
                >
                  <MdPhoto className="mr-2 text-gray-400" /> Photos
                </li>
                <li
                  className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-gray-600 cursor-pointer flex items-center text-xs sm:text-sm"
                  onClick={() => openFileInput(videoInputRef)}
                >
                  <MdVideoCall className="mr-2 text-gray-400" /> Video
                </li>
                <li
                  className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-gray-600 cursor-pointer flex items-center text-xs sm:text-sm"
                  onClick={() => openFileInput(audioInputRef)}
                >
                  <MdAudiotrack className="mr-2 text-gray-400" /> Audio
                </li>
                <li
                  className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-gray-600 cursor-pointer flex items-center text-xs sm:text-sm"
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
              className="absolute bottom-14 sm:bottom-16 left-2 right-2 bg-gray-700 rounded-lg shadow-lg z-20"
            >
              <Picker
                onEmojiClick={onEmojiClick}
                theme="dark"
                emojiStyle="apple"
                height={200}
                width="100%"
                previewConfig={{ showPreview: false }}
                searchDisabled
                skinTonesDisabled
              />
            </motion.div>
          )}
        </AnimatePresence>

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
                className="relative bg-gray-800 p-2 sm:p-4 rounded-lg max-w-[90vw] sm:max-w-[80vw] max-h-[90vh] sm:max-h-[80vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-lg sm:text-xl text-white hover:text-gray-400"
                  onClick={closePreview}
                >
                  ×
                </button>
                <div className="flex justify-center items-center">
                  {previewFile.url ? (
                    <>
                      {previewFile.type.startsWith("image/") && (
                        <img
                          src={previewFile.url}
                          alt={previewFile.name}
                          className="max-w-full max-h-[80vh] object-contain"
                        />
                      )}
                      {previewFile.type.startsWith("video/") && (
                        <video
                          src={previewFile.url}
                          controls
                          className="max-w-[80vw] max-h-[80vh] w-auto h-auto"
                        />
                      )}
                      {previewFile.type.startsWith("audio/") && (
                        <audio
                          src={previewFile.url}
                          controls
                          className="w-[200px] sm:w-[250px]"
                        />
                      )}
                      {previewFile.type === "application/pdf" && (
                        <iframe
                          src={previewFile.url}
                          title={previewFile.name}
                          className="w-[70vw] h-[70vh]"
                        />
                      )}
                      {previewFile.type ===
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                        <div
                          className="text-white w-[70vw] h-[70vh] overflow-y-auto p-4"
                          dangerouslySetInnerHTML={{
                            __html: fileContents[previewFile.name] || "Loading...",
                          }}
                        />
                      )}
                      {previewFile.type.startsWith("text/") && (
                        <div className="w-[70vw] h-[70vh] overflow-y-auto p-4">
                          <pre className="text-white whitespace-pre-wrap">
                            {fileContents[previewFile.name] || "Loading..."}
                          </pre>
                        </div>
                      )}
                      {!previewFile.type.startsWith("image/") &&
                        !previewFile.type.startsWith("video/") &&
                        !previewFile.type.startsWith("audio/") &&
                        previewFile.type !== "application/pdf" &&
                        previewFile.type !==
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
                        !previewFile.type.startsWith("text/") && (
                          <div className="flex items-center gap-2">
                            <MdInsertDriveFile className="text-gray-400" />
                            <span>{previewFile.name}</span>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MdInsertDriveFile className="text-gray-400" />
                      <span>{previewFile.name} (File not available)</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="relative bg-gray-800 p-2 sm:p-4 rounded-lg w-[20rem] sm:w-[24rem] max-w-[90vw] max-h-[90vh] sm:max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute top-2 right-2 text-lg sm:text-xl text-white hover:text-gray-400"
                  onClick={closeProfileModal}
                  aria-label="Close Profile"
                >
                  ×
                </button>
                <div className="flex flex-col items-center w-full p-4 sm:p-6">
                  <img
                    src={
                      userDetails?.avatar === null
                        ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                        : userDetails?.avatar
                    }
                    alt="User Avatar"
                    className={`w-[5rem] sm:w-[7rem] h-[5rem] sm:h-[7rem] rounded-full ${
                      userDetails?.is_active
                        ? "ring-2 sm:ring-4 ring-green-500"
                        : "ring-2 sm:ring-4 ring-gray-700"
                    }`}
                  />
                  <h2 className="text-base sm:text-lg mt-2 sm:mt-3 font-semibold text-white">
                    {userDetails?.username}
                  </h2>
                  <p className="text-gray-400 mb-2 sm:mb-4 text-xs sm:text-sm">
                    {userDetails?.is_active ? "online" : "offline"}
                  </p>
                  <div className="w-full mt-2 sm:mt-4 space-y-2 sm:space-y-4 text-left py-2 sm:py-4 px-1 sm:px-2 flex flex-col">
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
                    ].map((button, index) => (
                      <button
                        key={index}
                        className="flex items-center px-2 sm:px-3 py-1 sm:py-2 bg-transparent text-white rounded-lg hover:bg-gray-700 text-xs sm:text-sm"
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