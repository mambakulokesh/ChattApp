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
  MdVideoCall,
} from "react-icons/md";
import Picker from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import mammoth from "mammoth";
import axios from "axios";
import { socket } from "../utils/commonFunctions/SocketConnection";
import { fileToBase64 } from "../utils/commonFunctions/ConvertToBase64";

const getDateLabel = (timestamp) => {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (date1, date2) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  const isWithinWeek = (date) => {
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    return date >= oneWeekAgo && date <= today;
  };

  if (isSameDay(messageDate, today)) {
    return "Today";
  } else if (isSameDay(messageDate, yesterday)) {
    return "Yesterday";
  } else if (isWithinWeek(messageDate)) {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[messageDate.getDay()];
  } else {
    return messageDate.toLocaleDateString();
  }
};

const getTimeString = (timestamp) => {
  const messageDate = new Date(timestamp);
  return messageDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ChatWindow = () => {
  const { user, userDetails, getUserDetails } = useContext(AuthContext);
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
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingTime, setVideoRecordingTime] = useState(0);
  const [videoMediaRecorder, setVideoMediaRecorder] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const audioChunksRef = useRef([]);
  const videoChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const documentInputRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const allowedFileTypes = [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "text/plain",
    "video/mp4",
    "audio/mp3",
    "audio/mpeg",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];

  const fetchFileContent = async (file) => {
    if (!file.url) return null;
    try {
      const proxiedUrl = file.url.startsWith("http")
        ? file.url
        : `/api/proxy${file.url}`;
      if (file.type === "text/plain") {
        const response = await fetch(proxiedUrl, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch text file");
        return await response.text();
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const response = await fetch(proxiedUrl, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch docx file");
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value;
      } else if (file.type === "application/pdf") {
        return proxiedUrl;
      }
    } catch (error) {
      console.error(`Error fetching content for ${file.name}:`, error);
      setErrorMessage(`Failed to load content for ${file.name}`);
      return null;
    }
    return null;
  };

  useEffect(() => {
    const readFile = async () => {
      if (!selectedFiles.length) return;
      for (const file of selectedFiles) {
        if (fileContents[file.name]) continue;
        let content = null;
        try {
          if (file.type === "text/plain") {
            content = await file.text();
          } else if (
            file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            content = result.value;
          }
          setFileContents((prev) => ({
            ...prev,
            [file.name]: content || "Loading...",
          }));
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error);
          setErrorMessage(`Failed to read file ${file.name}`);
          setFileContents((prev) => ({
            ...prev,
            [file.name]: "Error loading file",
          }));
        }
      }
    };
    readFile();
  }, [selectedFiles]);

  useEffect(() => {
    const loadPreviewContent = async () => {
      if (!previewFile || !previewFile.url || fileContents[previewFile.name])
        return;
      if (
        previewFile.type === "text/plain" ||
        previewFile.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        previewFile.type === "application/pdf"
      ) {
        const content = await fetchFileContent(previewFile);
        setFileContents((prev) => ({
          ...prev,
          [previewFile.name]: content || "Error loading file",
        }));
      }
    };
    loadPreviewContent();
  }, [previewFile]);

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
        setIsLoading(true);
        try {
          let apiUrl;
          let response;

          if (userDetails.type === "group") {
            apiUrl = `http://38.77.155.139:8000/messaging/get-group-messages/?group_id=${userDetails.id}`;
          } else {
            apiUrl = `http://38.77.155.139:8000/messaging/get-message/?sender_id=${user.id}&receiver_id=${userDetails.id}`;
          }

          console.log(
            `Fetching ${userDetails.type === "group" ? "group" : "private"} messages for ${
              userDetails.type === "group" ? "group" : "user"
            }:`,
            userDetails.id
          );

          response = await axios.get(apiUrl, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });

          let data;
          if (userDetails.type === "group") {
            data = response.data;
          } else {
            data = response.data.results.data;
          }

          const messages = data.map((msg) => ({
            id: msg.id,
            text: msg.content || "",
            files: msg.files
              ? msg.files.map((file) => ({
                  name: file.file_name || "File",
                  url: file.file_url,
                  type: file.file_type || "application/octet-stream",
                }))
              : [],
            sender:
              userDetails.type === "group"
                ? msg.sender === user.id
                  ? "self"
                  : msg.sender
                : msg.sender === user.id
                ? "self"
                : "other",
            timestamp: msg.timestamp,
            time: getTimeString(msg.timestamp),
            dateLabel: getDateLabel(msg.timestamp),
          }));

          setChatMessages(messages);
        } catch (error) {
          console.error(
            `Error fetching ${
              userDetails.type === "group" ? "group" : "private"
            } messages:`,
            error
          );
          setErrorMessage(
            `Failed to load ${userDetails.type === "group" ? "group" : "private"} messages`
          );
          setChatMessages([]);
        } finally {
          setIsLoading(false);
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
      socket.emit("make_active", { token: user.token });
    });

    socket.on("auth_success", (data) => {
      console.log("Authentication successful:", data);
    });

    socket.on("auth_error", (error) => {
      console.error("Authentication error:", error.message);
      socket.disconnect();
      socket.connect();
    });

    socket.on("new_message", async (messageData) => {
      console.log("Received new_message:", messageData);
      const isRelevantMessage =
        (messageData.receiver_id === user.id &&
          messageData.sender_id === userDetails.id) ||
        (messageData.sender_id === user.id &&
          messageData.receiver_id === userDetails.id);

      if (isRelevantMessage) {
        const newMessage = {
          id: messageData.id || `temp-${Date.now()}-${Math.random()}`,
          text: messageData.content || "",
          files: messageData.files.map((file) => ({
            name: file.file_name || "File",
            url: file.file_url,
            type: file.file_type || "application/octet-stream",
          })),
          sender: messageData.sender_id === user.id ? "self" : "other",
          timestamp: messageData.timestamp,
          time: getTimeString(messageData.timestamp),
          dateLabel: getDateLabel(messageData.timestamp),
        };

        setChatMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });

        for (const file of newMessage.files) {
          if (
            file &&
            (file.type === "text/plain" ||
              file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              file.type === "application/pdf") &&
            !fileContents[file.name]
          ) {
            const content = await fetchFileContent(file);
            setFileContents((prev) => ({
              ...prev,
              [file.name]: content || "Error loading file",
            }));
          }
        }
      }
    });

    socket.on("new_group_message", async (messageData) => {
      console.log("Received new_group_message:", messageData);
      if (
        userDetails.type === "group" &&
        messageData.group_id === userDetails.id
      ) {
        const newMessage = {
          id: messageData.id || `temp-${Date.now()}-${Math.random()}`,
          text: messageData.content || "",
          files: messageData.files
            ? messageData.files.map((file) => ({
                name: file.file_name || "File",
                url: file.file_url,
                type: file.file_type || "application/octet-stream",
              }))
            : [],
          sender:
            messageData.sender_id === user.id ? "self" : messageData.sender_id,
          timestamp: messageData.timestamp,
          time: getTimeString(messageData.timestamp),
          dateLabel: getDateLabel(messageData.timestamp),
        };

        setChatMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });

        for (const file of newMessage.files) {
          if (
            file &&
            (file.type === "text/plain" ||
              file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              file.type === "application/pdf") &&
            !fileContents[file.name]
          ) {
            const content = await fetchFileContent(file);
            setFileContents((prev) => ({
              ...prev,
              [file.name]: content || "Error loading file",
            }));
          }
        }
      }
    });

    socket.on("message_sent", (data) => {
      console.log("Message sent confirmation:", data);
      setChatMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.tempId === data.tempId
            ? {
                ...msg,
                id: data.id || msg.id, 
                tempId: undefined, 
                files: data.file_urls
                  ? msg.files.map((file, index) => ({
                      ...file,
                      url: data.file_urls[index] || file.url,
                    }))
                  : msg.files,
              }
            : msg
        )
      );
    });

    socket.on("group_message_sent", (data) => {
      console.log("Group message sent confirmation:", data);
      // setChatMessages((prevMessages) =>
      //   prevMessages.map((msg) =>
      //     msg.tempId === data.tempId
      //       ? {
      //           ...msg,
      //           id: data.id || msg.id,
      //           tempId: undefined,
      //           files: data.files
      //             ? data.files.map((file) => ({
      //                 name: file.file_name || "File",
      //                 url: file.file_url,
      //                 type: file.file_type || "application/octet-stream",
      //               }))
      //             : msg.files,
      //         }
      //       : msg
      //   )
      // );
    });

    socket.on("group_message_error", (error) => {
      console.error("Group message error:", error.message);
      setErrorMessage(error.message || "Failed to send group message");
    });

    socket.on("status_updated", (data) => {
      console.log("Received status_updated in ChatWindow:", data);
      if (userDetails && userDetails.id === data.user_id) {
        getUserDetails({ ...userDetails, is_active: data.active });
      }
    });

    socket.on("error", (error) => {
      console.error("Socket.IO error:", error);
      setErrorMessage("Socket error occurred");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
      setErrorMessage("Failed to connect to server");
    });

    socket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO server:", reason);
    });

    return () => {
      socket.off("connect");
      socket.off("auth_success");
      socket.off("auth_error");
      socket.off("new_message");
      socket.off("new_group_message");
      socket.off("message_sent");
      socket.off("group_message_sent");
      socket.off("group_message_error");
      socket.off("status_updated");
      socket.off("error");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [user, userDetails, getUserDetails]);

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

  useEffect(() => {
    let interval;
    if (isVideoRecording) {
      interval = setInterval(() => {
        setVideoRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVideoRecording]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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
    if (files.length) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...files]);
    }
    setIsPinDropdownOpen(false);
    event.target.value = null;
  };

  const openFileInput = (inputRef) => inputRef.current.click();

  const removeFile = (fileToRemove) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file !== fileToRemove)
    );
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
      setErrorMessage("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const startVideoRecording = async () => {
    if (isUserBlocked || isVideoRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      setVideoMediaRecorder(recorder);
      videoChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        videoChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, {
          type: "video/webm",
        });
        const videoFile = new File([videoBlob], `video-${Date.now()}.webm`, {
          type: "video/webm",
        });
        setSelectedFiles((prevFiles) => [...prevFiles, videoFile]);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsVideoRecording(true);
      setVideoRecordingTime(0);
    } catch (error) {
      console.error("Error starting video recording:", error);
      setErrorMessage(
        "Failed to access camera or microphone. Please check permissions."
      );
    }
  };

  const stopVideoRecording = () => {
    if (videoMediaRecorder && isVideoRecording) {
      videoMediaRecorder.stop();
      setIsVideoRecording(false);
      setVideoMediaRecorder(null);
    }
  };

  const resumeVideoRecording = () => {
    if (
      videoMediaRecorder &&
      !isVideoRecording &&
      videoMediaRecorder.state === "paused"
    ) {
      videoMediaRecorder.resume();
      setIsVideoRecording(true);
    }
  };

  const pauseVideoRecording = () => {
    if (videoMediaRecorder && isVideoRecording) {
      videoMediaRecorder.pause();
      setIsVideoRecording(false);
    }
  };

  // const handleMicClick = () => {
  //   if (isRecording) {
  //     stopRecording();
  //   } else {
  //     startRecording();
  //   }
  // };

  // const handleCameraClick = () => {
  //   if (isVideoRecording) {
  //     pauseVideoRecording();
  //   } else if (videoMediaRecorder && videoMediaRecorder.state === "paused") {
  //     resumeVideoRecording();
  //   } else {
  //     startVideoRecording();
  //   }
  // };

  const handleSend = async () => {
    if (!isUserBlocked && (message.trim() || selectedFiles.length)) {
      const tempId = Date.now() + Math.random();

      if (userDetails.type === "group") {
        let fileDataArray = [];
        if (selectedFiles.length > 0) {
          try {
            fileDataArray = await Promise.all(
              selectedFiles.map(async (file) => {
                if (!allowedFileTypes.includes(file.type)) {
                  throw new Error(`Invalid file type: ${file.type}`);
                }
                if (file.size > 5 * 1024 * 1024) {
                  throw new Error(`File ${file.name} exceeds 5MB limit`);
                }
                const base64 = await fileToBase64(file);
                return {
                  file_url: base64,
                  file_type: file.type,
                  file_name: file.name,
                };
              })
            );
          } catch (error) {
            console.error("Error converting files to base64:", error);
            setErrorMessage(error.message || "Failed to process files");
            return;
          }
        }

        const messageData = {
          sender_id: user.id,
          group_id: userDetails.id,
          content: message.trim() || "",
          files: fileDataArray,
          tempId,
        };

        console.log("Sending group_message:", messageData);
        socket.emit("group_message", messageData);

        const newMessage = {
          id: tempId,
          tempId,
          text: message.trim() || "",
          files: selectedFiles.map((file) => ({
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
          })),
          sender: "self",
          timestamp: new Date().toISOString(),
          time: getTimeString(new Date()),
          dateLabel: getDateLabel(new Date()),
        };

        setChatMessages((prevMessages) => [...prevMessages, newMessage]);
        setMessage("");
        setSelectedFiles([]);
      } else {
        let fileDataArray = [];
        if (selectedFiles.length) {
          try {
            fileDataArray = await Promise.all(
              selectedFiles.map(async (file) => {
                if (!allowedFileTypes.includes(file.type)) {
                  throw new Error(`Invalid file type: ${file.type}`);
                }
                if (file.size > 5 * 1024 * 1024) {
                  throw new Error(`File ${file.name} exceeds 5MB limit`);
                }
                const base64 = await fileToBase64(file);
                return {
                  file_type: file.type,
                  file_name: file.name,
                  file_url: base64,
                };
              })
            );
          } catch (error) {
            console.error("Error converting files to base64:", error);
            setErrorMessage(error.message || "Failed to process files");
            return;
          }
        }

        const messageData = {
          sender_id: user.id,
          receiver_id: userDetails.id,
          content: message.trim() || "",
          files: fileDataArray,
          timestamp: new Date().toISOString(),
          tempId,
        };

        console.log("Sending private_message:", messageData);
        socket.emit("private_message", messageData);

        const newMessage = {
          id: tempId,
          tempId,
          text: message.trim() || "",
          files: selectedFiles.map((file) => ({
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
          })),
          sender: "self",
          timestamp: new Date().toISOString(),
          time: getTimeString(new Date()),
          dateLabel: getDateLabel(new Date()),
        };

        setChatMessages((prevMessages) => [...prevMessages, newMessage]);
        setMessage("");
        setSelectedFiles([]);
      }
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

  const groupedMessages = chatMessages.reduce((acc, msg) => {
    const label = msg.dateLabel;
    if (!acc[label]) {
      acc[label] = [];
    }
    acc[label].push(msg);
    return acc;
  }, {});

  if (isuserEmpty) {
    return (
      <div className="flex flex-col h-screen w-full bg-gray-900 justify-center items-center">
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
      {errorMessage && (
        <div className="bg-red-600 text-white text-xs sm:text-sm p-2 rounded-lg mx-2 mt-2">
          {errorMessage}
        </div>
      )}

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
              alt={
                userDetails.type === "group" ? "Group Avatar" : "User Avatar"
              }
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full mr-2"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
              {userDetails?.username ||
                (userDetails.type === "group" ? "Group Chat" : "User")}
            </h2>
            {userDetails.type === "group" ? (
              <p className="flex text-xs text-gray-400 truncate">
                {userDetails.members?.map((member, index) => (
                  <span key={index}>
                    {member}
                    {index < userDetails.members.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-xs text-gray-400 truncate">
                {userDetails.is_active ? "online" : "offline"}
              </p>
            )}
          </div>
        </div>
        <div className="flex space-x-2 sm:space-x-3 relative">
          <button
            className="text-gray-400 hover:text-white"
            onClick={toggleMenu}
          >
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
                {userDetails.type !== "group" && (
                  <button
                    className="block px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm hover:bg-gray-600 w-full text-left"
                    onClick={handleBlockUser}
                  >
                    {isUserBlocked ? "Unblock User" : "Block User"}
                  </button>
                )}
                <button
                  className="block px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm hover:bg-gray-600 w-full text-left"
                  onClick={() => alert("Reported!")}
                >
                  Report
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 p-2 sm:p-3 overflow-y-auto scrollbar-hide relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <p className="text-white text-xs sm:text-sm">Loading messages...</p>
          </div>
        )}
        {chatMessages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-xs sm:text-sm">No messages yet.</p>
            <p className="text-xs sm:text-sm">Start the conversation!</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedMessages).map(([dateLabel, messages]) => (
              <div key={dateLabel}>
                <div className="flex justify-center my-2">
                  <span className="bg-gray-700 text-white text-xs sm:text-sm px-3 py-1 rounded-full">
                    {dateLabel}
                  </span>
                </div>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id || msg.tempId || index}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className={`flex ${
                      msg.sender === "self" ? "justify-end" : "justify-start"
                    } mb-2 sm:mb-3`}
                  >
                    {msg.sender !== "self" && (
                      <div className="flex items-start">
                        <img
                          src={
                            userDetails?.avatar === null
                              ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                              : userDetails?.avatar
                          }
                          alt="Avatar"
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-1 sm:mr-2 flex-shrink-0"
                        />
                        <div>
                          {userDetails.type === "group" && (
                            <span className="text-xs text-gray-400 block">
                              {msg.sender}
                            </span>
                          )}
                          <div className="w-full">
                            {msg.text && (
                              <div
                                className={`p-1 sm:p-2 rounded-lg text-xs sm:text-sm bg-gray-700 text-white`}
                              >
                                {msg.text}
                              </div>
                            )}
                            {msg.files && msg.files.length > 0 && (
                              <div className="mt-1 sm:mt-2 space-y-1 sm:space-y-2">
                                {msg.files.map((file, fileIndex) => (
                                  <div
                                    key={fileIndex}
                                    className={`p-1 sm:p-2 rounded-lg cursor-pointer bg-gray-700 text-white`}
                                    onClick={() => handleFileClick(file)}
                                  >
                                    {file.url ? (
                                      <>
                                        {file.type.startsWith("image/") && (
                                          <img
                                            src={file.url}
                                            alt={file.name}
                                            className="max-w-[150px] sm:max-w-[200px] max-h-[100px] sm:max-h-[150px] rounded-lg object-cover"
                                          />
                                        )}
                                        {file.type.startsWith("video/") && (
                                          <video
                                            src={file.url}
                                            controls
                                            className="max-w-[200px] sm:max-w-[250px] max-h-[150px] sm:max-h-[180px] rounded-lg"
                                          />
                                        )}
                                        {file.type.startsWith("audio/") && (
                                          <audio
                                            src={file.url}
                                            controls
                                            className="max-w-[200px] sm:max-w-[250px]"
                                          />
                                        )}
                                        {file.type === "application/pdf" && (
                                          <div className="flex items-center gap-2">
                                            <MdInsertDriveFile className="text-gray-400" />
                                            <span>{file.name}</span>
                                          </div>
                                        )}
                                        {file.type ===
                                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                                          <div className="flex items-center gap-2">
                                            <MdInsertDriveFile className="text-gray-400" />
                                            <span>{file.name}</span>
                                          </div>
                                        )}
                                        {file.type.startsWith("text/") && (
                                          <div className="flex items-center gap-2">
                                            <MdInsertDriveFile className="text-gray-400" />
                                            <span>{file.name}</span>
                                          </div>
                                        )}
                                        {!file.type.startsWith("image/") &&
                                          !file.type.startsWith("video/") &&
                                          !file.type.startsWith("audio/") &&
                                          ![
                                            "application/pdf",
                                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                            "text/plain",
                                          ].includes(file.type) && (
                                            <div className="flex items-center gap-2">
                                              <MdInsertDriveFile className="text-gray-400" />
                                              <span>{file.name}</span>
                                            </div>
                                          )}
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <MdInsertDriveFile className="text-gray-400" />
                                        <span>{file.name} (File not available)</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-400 mt-1 text-left">
                              {msg.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.sender === "self" && (
                      <div className="max-w-[80%]">
                        {msg.text && (
                          <div
                            className="p-1 sm:p-2 rounded-lg text-xs sm:text-sm bg-blue-600 text-white"
                          >
                            {msg.text}
                          </div>
                        )}
                        {msg.files && msg.files.length > 0 && (
                          <div className="mt-1 sm:mt-2 space-y-1 sm:space-y-2">
                            {msg.files.map((file, fileIndex) => (
                              <div
                                key={fileIndex}
                                className="p-1 sm:p-2 rounded-lg cursor-pointer bg-blue-600 text-white"
                                onClick={() => handleFileClick(file)}
                              >
                                {file.url ? (
                                  <>
                                    {file.type.startsWith("image/") && (
                                      <img
                                        src={file.url}
                                        alt={file.name}
                                        className="max-w-[150px] sm:max-w-[200px] max-h-[100px] sm:max-h-[150px] rounded-lg object-cover"
                                      />
                                    )}
                                    {file.type.startsWith("video/") && (
                                      <video
                                        src={file.url}
                                        controls
                                        className="max-w-[200px] sm:max-w-[250px] max-h-[150px] sm:max-h-[180px] rounded-lg"
                                      />
                                    )}
                                    {file.type.startsWith("audio/") && (
                                      <audio
                                        src={file.url}
                                        controls
                                        className="max-w-[200px] sm:max-w-[250px]"
                                      />
                                    )}
                                    {file.type === "application/pdf" && (
                                      <div className="flex items-center gap-2">
                                        <MdInsertDriveFile className="text-gray-400" />
                                        <span>{file.name}</span>
                                      </div>
                                    )}
                                    {file.type ===
                                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                                      <div className="flex items-center gap-2">
                                        <MdInsertDriveFile className="text-gray-400" />
                                        <span>{file.name}</span>
                                      </div>
                                    )}
                                    {file.type.startsWith("text/") && (
                                      <div className="flex items-center gap-2">
                                        <MdInsertDriveFile className="text-gray-400" />
                                        <span>{file.name}</span>
                                      </div>
                                    )}
                                    {!file.type.startsWith("image/") &&
                                      !file.type.startsWith("video/") &&
                                      !file.type.startsWith("audio/") &&
                                      ![
                                        "application/pdf",
                                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                        "text/plain",
                                      ].includes(file.type) && (
                                        <div className="flex items-center gap-2">
                                          <MdInsertDriveFile className="text-gray-400" />
                                          <span>{file.name}</span>
                                        </div>
                                      )}
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <MdInsertDriveFile className="text-gray-400" />
                                    <span>{file.name} (File not available)</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1 text-right">
                          {msg.time}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* input Area */}
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
            {/* <button
              onClick={handleCameraClick}
              disabled={isUserBlocked}
              className={`text-gray-400 hover:text-white ${
                isVideoRecording ? "text-red-500" : ""
              }`}
            >
              <FaCamera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button> */}
            {/* <button
              onClick={handleMicClick}
              disabled={isUserBlocked}
              className={`text-gray-400 hover:text-white ${
                isRecording ? "text-red-500" : ""
              }`}
            >
              <FaMicrophone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button> */}
            {(isRecording || isVideoRecording) && (
              <span className="text-white text-xs">
                {Math.floor(
                  (isRecording ? recordingTime : videoRecordingTime) / 60
                )}
                :
                {((isRecording ? recordingTime : videoRecordingTime) % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            )}
            {videoMediaRecorder && videoMediaRecorder.state === "paused" && (
              <button
                onClick={stopVideoRecording}
                className="text-red-500 hover:text-red-600 text-xs"
              >
                Stop
              </button>
            )}
          </div>

          <div
            className={`flex-1 min-w-0 bg-gray-700 p-1 sm:p-2 rounded-lg text-white text-xs sm:text-sm flex flex-col gap-1 sm:gap-2 ${
              isUserBlocked ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-gray-600 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded truncate max-w-[100px] sm:max-w-[120px] text-xs"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(file)}
                      className="ml-1 sm:ml-2 text-red-400 hover:text-red-600"
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
                  ? userDetails.type === "group"
                    ? "Group messaging disabled"
                    : "User is blocked"
                  : selectedFiles.length > 0
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
              disabled={
                isUserBlocked || (!message.trim() && !selectedFiles.length)
              }
              className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg text-xs sm:text-sm text-white ${
                isUserBlocked || (!message.trim() && !selectedFiles.length)
                  ? "bg-blue-600 opacity-50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Send
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={documentInputRef}
          onChange={(e) => handleFileSelect("Document", e)}
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
          multiple={userDetails.type !== "group"}
          className="hidden"
        />
        <input
          type="file"
          ref={photoInputRef}
          onChange={(e) => handleFileSelect("Photo", e)}
          accept="image/*"
          multiple={userDetails.type !== "group"}
          className="hidden"
        />
        <input
          type="file"
          ref={videoInputRef}
          onChange={(e) => handleFileSelect("Video", e)}
          accept="video/*"
          multiple={userDetails.type !== "group"}
          className="hidden"
        />
        <input
          type="file"
          ref={audioInputRef}
          onChange={(e) => handleFileSelect("Audio", e)}
          accept="audio/*"
          multiple={userDetails.type !== "group"}
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
                className="relative bg-gray-800 p-2 sm:p-4 rounded-lg max-w-[90vw] sm:max-w-[80vw] max-h-[80vh] sm:max-h-[80vh] overflow-auto"
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
                          src={
                            fileContents[previewFile.name] || previewFile.url
                          }
                          title={previewFile.name}
                          className="w-[70vw] h-[70vh]"
                        />
                      )}
                      {previewFile.type ===
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && (
                        <div
                          className="text-white w-[70vw] h-[70vh] overflow-y-auto p-4"
                          dangerouslySetInnerHTML={{
                            __html:
                              fileContents[previewFile.name] || "Loading...",
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
                      {!(
                        previewFile.type.startsWith("image/") ||
                        previewFile.type.startsWith("video/") ||
                        previewFile.type.startsWith("audio/") ||
                        previewFile.type === "application/pdf" ||
                        previewFile.type ===
                          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                        previewFile.type.startsWith("text/")
                      ) && (
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
                    alt={
                      userDetails.type === "group" ? "Group Avatar" : "User Avatar"
                    }
                    className={`w-[5rem] sm:w-[7rem] h-[5rem] sm:h-[7rem] rounded-full ${
                      userDetails.type === "group"
                        ? "ring-2 sm:ring-4 ring-gray-700"
                        : userDetails?.is_active
                        ? "ring-2 sm:ring-4 ring-green-500"
                        : "ring-2 sm:ring-4 ring-gray-700"
                    }`}
                  />
                  <h2 className="text-base sm:text-lg mt-2 sm:mt-3 font-semibold text-white">
                    {userDetails?.username ||
                      (userDetails.type === "group" ? "Group Chat" : "User")}
                  </h2>

                  <div className="w-full mt-2 sm:mt-4 space-y-2 sm:space-y-4 text-left py-2 sm:py-4 px-1 sm:px-2 flex flex-col">
                    {userDetails.type !== "group" &&
                      [
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
                    {userDetails.type === "group" && (
                      <div className="text-white text-xs sm:text-sm">
                        <p className="font-semibold">Members:</p>
                        <ul className="list-disc pl-4">
                          {userDetails.members?.map((member, index) => (
                            <li key={index}>{member}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
