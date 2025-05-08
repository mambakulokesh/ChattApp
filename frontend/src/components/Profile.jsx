import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../utils/AuthProvider";
import {
  FaSignOutAlt,
  FaShieldAlt,
  FaTimes,
  FaQuestionCircle,
  FaEdit,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { socket } from "../utils/commonFunctions/SocketConnection";
import ChatSettings from "./ChatSettings";

const fadeScaleVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const modalVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, userDetails, logout } = useContext(AuthContext);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [bioText, setBioText] = useState(user?.bio || "");
  const [bioError, setBioError] = useState(null);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
        setIsBioModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (user && userDetails && user.token && userDetails.id) {
      const fetchFiles = async () => {
        setIsLoading(true);
        try {
          let apiUrl;
          let response;

          if (userDetails.type === "group") {
            apiUrl = `http://38.77.155.139:8000/messaging/get-group-media-files/?group_id=${userDetails.id}`;
          } else {
            apiUrl = `http://38.77.155.139:8000/messaging/get-media-files/?sender_id=${user.id}&receiver_id=${userDetails.id}`;
          }

          response = await axios.get(apiUrl, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });

          const files = response.data.files || [];
          const mediaTypes = ["image/jpeg", "image/png", "video/mp4"];
          const media = [];
          const docs = [];

          files.forEach((file) => {
            file.file.forEach((item) => {
              if (mediaTypes.includes(item.file_type)) {
                media.push({
                  ...item,
                  timestamp: file.timestamp,
                  sender: file.sender,
                });
              } else {
                docs.push({
                  ...item,
                  timestamp: file.timestamp,
                  sender: file.sender,
                });
              }
            });
          });

          setMediaFiles(media);
          setDocuments(docs);
        } catch (err) {
          setError("Failed to fetch files");
          console.error("Error fetching files:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFiles();
    }
  }, [user, userDetails]);

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://38.77.155.139:8000/user/logout/",
        {},
        {
          headers: {
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );

      socket.emit("make_inactive", { token: user.token });

      const logoutPromise = new Promise((resolve, reject) => {
        socket.once("logout_success", (data) => {
          console.log("Logout successful:", data.message);
          resolve(data);
        });

        socket.once("logout_error", (data) => {
          console.error("Logout error:", data.message);
          reject(new Error(data.message));
        });
      });

      await logoutPromise;

      logout();
      socket.disconnect();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error during logout:", error.message);
    }
  };

  const openPreview = () => setIsPreviewOpen(true);
  const closePreview = () => setIsPreviewOpen(false);

  return (
    <motion.div
      className="w-full h-screen bg-gray-800 flex flex-col"
      initial="hidden"
      animate="visible"
      variants={fadeScaleVariant}
    >
      {/* User Info */}
      <motion.div
        className="p-4 md:p-6 space-y-3 flex flex-col items-center border-b border-gray-700"
        variants={fadeScaleVariant}
      >
        <div className="relative">
          <motion.img
            src={
              user?.avatar === null
                ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                : user?.avatar
            }
            alt={user?.username || "User"}
            className={`w-[8rem] md:w-[11rem] h-[8rem] md:h-[11rem] rounded-full cursor-pointer ${
              user?.is_active ? "ring-4 ring-green-500" : "ring-4 ring-gray-700"
            }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
            onClick={openPreview}
            role="button"
            aria-label="Preview profile image"
          />
          {user?.is_active && (
            <motion.div
              className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-3 h-3 md:w-4 md:h-4 bg-green-500 rounded-full border-2 border-gray-800"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            />
          )}
        </div>
        <h2 className="text-base md:text-lg text-white font-semibold truncate">
          {user?.username || "Loading..."}
        </h2>
        <p className="text-xs text-gray-400">
          {user?.is_active ? "Online" : "Offline"}
        </p>
      </motion.div>

      {/* About */}
      <div className="p-3 space-y-2 text-white">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">About</h3>
        </div>
        <motion.p
          className="text-sm text-white whitespace-pre-wrap break-words p-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {user?.bio || "No bio available"}
        </motion.p>
      </div>

      {/* Chat Settings */}
      <div className="p-4 space-y-4 w-full flex-grow overflow-y-hidden">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Chat Settings
        </h3>
        <ChatSettings
          mediaFiles={mediaFiles}
          documents={documents}
          isLoading={isLoading}
          error={error}
        />

        <motion.button
          className="w-full text-left py-3 px-4 bg-gray-750 hover:bg-gray-700 rounded-xl flex items-center text-sm font-medium text-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Help"
        >
          <FaQuestionCircle className="mr-3 text-gray-300" size={18} />
          Help
        </motion.button>
        <motion.button
          className="w-full text-left py-3 px-4 bg-gray-750 hover:bg-gray-700 rounded-xl flex items-center text-sm font-medium text-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          aria-label="Privacy & Policy"
        >
          <FaShieldAlt className="mr-3 text-gray-300" size={18} />
          Privacy & Policy
        </motion.button>
      </div>

      {/* Log out */}
      <div className="p-3 bg-gray-800">
        <motion.button
          className="w-full text-left py-2 px-3 hover:bg-gray-700 rounded-lg flex items-center text-red-400 text-sm"
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <FaSignOutAlt className="mr-2" /> Log Out
        </motion.button>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePreview}
            role="dialog"
            aria-label="Profile image preview"
          >
            <motion.div
              className="relative bg-gray-800 rounded-lg p-4 max-w-[90vw] max-h-[90vh]"
              variants={modalVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-2 text-white hover:text-gray-400"
                onClick={closePreview}
                aria-label="Close preview"
              >
                <FaTimes size={16} />
              </button>
              <img
                src={
                  user?.avatar === null
                    ? "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                    : user?.avatar
                }
                alt={user?.username || "User"}
                className="max-w-[80vw] max-h-[80vh] rounded-lg object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Profile;