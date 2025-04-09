import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaPhotoVideo,
  FaLock,
  FaHeart,
  FaSignOutAlt,
  FaShieldAlt,
} from "react-icons/fa";
import { motion } from "framer-motion";

const fadeScaleVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut"
    }
  }
};

const Profile = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <motion.div
      className="w-full h-screen sm:w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
      initial="hidden"
      animate="visible"
      variants={fadeScaleVariant}
    >
      {/* User Info */}
      <motion.div
        className="p-4 space-y-3 flex flex-col items-center border-b border-gray-700"
        variants={fadeScaleVariant}
      >
        <motion.img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoHTqPZNwC0ss2kF13g6VKiYHhkx-pwU_78g&s"
          alt="User Avatar"
          className="w-40 h-40 sm:w-40 rounded-full mr-3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
        />
        <h2 className="text-lg text-white font-semibold">John Doe</h2>
        <p className="text-sm text-gray-400">Be Happy.......</p>
      </motion.div>

      {/* Chat Settings */}
      <div className="p-4 space-y-3 text-white">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">
          Chat settings
        </h3>

        {[
          { icon: <FaBell className="mr-2" />, label: "Notification" },
          { icon: <FaPhotoVideo className="mr-2" />, label: "Media" },
          { icon: <FaHeart className="mr-2" />, label: "Add to Favourite" },
          { icon: <FaShieldAlt className="mr-2" />, label: "Privacy & Policy" },
        ].map((item, index) => (
          <motion.button
            key={index}
            className="w-full text-left py-2 px-3 hover:bg-gray-700 rounded-lg flex items-center"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            {item.icon} {item.label}
          </motion.button>
        ))}
      </div>

      {/* Log out */}
      <div className="p-4 mt-auto">
        <motion.button
          className="w-full text-left py-2 px-3 hover:bg-gray-700 rounded-lg flex items-center text-red-400"
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
    </motion.div>
  );
};

export default Profile;
