import React, { useState } from "react";
import {
  FaPhotoVideo,
  FaFileAlt,
  FaTimes,
  FaChevronRight,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const modalVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
};

const fileItemVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const ChatSettings = ({ mediaFiles, documents, isLoading, error }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("media");

  const totalFiles = mediaFiles.length + documents.length;

  const previewImages = mediaFiles
    .filter((file) => file.file_type.includes("image"))
    .slice(0, 5);

  const renderMediaItem = (file, index) => (
    <motion.div
      key={`${file.file_url}-${index}`}
      className="relative p-1 w-full sm:w-1/2 md:w-1/3"
      variants={fileItemVariant}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
    >
      {file.file_type.includes("image") ? (
        <img
          src={file.file_url}
          alt={file.file_name}
          className="w-full h-24 object-cover rounded-md"
        />
      ) : (
        <video
          src={file.file_url}
          className="w-full h-24 object-cover rounded-md"
          controls={false}
        />
      )}
    </motion.div>
  );

  const renderDocItem = (file, index) => (
    <motion.div
      key={`${file.file_url}-${index}`}
      className="flex items-center p-2 bg-gray-800 rounded-lg"
      variants={fileItemVariant}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
    >
      <FaFileAlt className="w-12 h-12 text-gray-400 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <a
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-300 hover:underline font-medium"
        >
          {file.file_name}
        </a>
        <p className="text-xs text-gray-400">
          {new Date(file.timestamp).toLocaleDateString()} • Sender: {file.sender}
        </p>
      </div>
    </motion.div>
  );

  const renderPreviewImages = () => (
    <div className="flex space-x-1">
      {previewImages.map((file, index) => (
        <motion.div
          key={`${file.file_url}-${index}`}
          className="w-12 h-12 flex-shrink-0"
          variants={fileItemVariant}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.1 }}
        >
          <img
            src={file.file_url}
            alt={file.file_name}
            className="w-full h-full object-cover rounded-md"
          />
        </motion.div>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-xs px-2 font-semibold text-gray-300">Media</h3>
        <motion.button
          className="w-full text-left py-3 px-4 bg-gray-750 hover:bg-gray-700 rounded-xl flex items-center justify-between text-sm font-medium text-white"
          onClick={() => setIsModalOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex items-center space-x-1">
              {previewImages.length > 0 ? (
                renderPreviewImages()
              ) : (
                <FaPhotoVideo className="text-gray-300" size={18} />
              )}
            </div>
            <span className="truncate">Media, links, and docs</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-400 mr-2">{totalFiles}</span>
            <FaChevronRight className="text-gray-300" />
          </div>
        </motion.button>
      </div>

      {/* Media Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              className="bg-gray-800 w-full max-w-lg rounded-2xl p-4 max-h-[80vh] overflow-y-auto"
              variants={modalVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Media & Docs</h3>
                <button
                  className="text-gray-300 hover:text-white"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close modal"
                >
                  <FaTimes size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-700 mb-4">
                <button
                  className={`flex-1 py-2 text-sm font-medium text-center ${
                    activeTab === "media"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400"
                  }`}
                  onClick={() => setActiveTab("media")}
                >
                  Media
                </button>
                <button
                  className={`flex-1 py-2 text-sm font-medium text-center ${
                    activeTab === "docs"
                      ? "text-blue-400 border-b-2 border-blue-400"
                      : "text-gray-400"
                  }`}
                  onClick={() => setActiveTab("docs")}
                >
                  Docs
                </button>
              </div>

              {/* Tab Content */}
              {isLoading ? (
                <div className="flex justify-center items-center py-4">
                  <svg
                    className="animate-spin h-6 w-6 text-blue-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
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
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                    />
                  </svg>
                </div>
              ) : error ? (
                <p className="text-sm text-red-400 text-center py-4">{error}</p>
              ) : (
                <div className="space-y-3">
                  {activeTab === "media" &&
                    (mediaFiles.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No media files found
                      </p>
                    ) : (
                      <div className="flex flex-wrap -mx-1">
                        {mediaFiles.map((file, index) => renderMediaItem(file, index))}
                      </div>
                    ))}
                  {activeTab === "docs" &&
                    (documents.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No documents found
                      </p>
                    ) : (
                      documents.map((file, index) => renderDocItem(file, index))
                    ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatSettings;
