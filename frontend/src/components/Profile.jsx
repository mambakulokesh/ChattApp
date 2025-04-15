import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../utils/AuthProvider";
import {
  FaBell,
  FaPhotoVideo,
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
      ease: "easeOut",
    },
  },
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  useEffect(() => {
    console.log("Profile user:", user);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <motion.div
      className="w-full h-full bg-gray-800 flex flex-col"
      initial="hidden"
      animate="visible"
      variants={fadeScaleVariant}
    >
      {/* User Info */}
      <motion.div
        className="p-6 space-y-3 flex flex-col items-center border-b border-gray-700"
        variants={fadeScaleVariant}
      >
        <div className="relative">
          <motion.img
            src={
              // user?.avatar === null
                 "https://i.pinimg.com/236x/00/80/ee/0080eeaeaa2f2fba77af3e1efeade565.jpg"
                // : user?.avatar
            }
            alt={user?.username || "User"}
            className={`w-[11rem] h-[11rem] rounded-full ${
              user?.active_status ? "ring-4 ring-green-500" : "ring-4 ring-gray-700"
            }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
          />
          {user?.active_status && (
            <motion.div
              className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-800"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            />
          )}
        </div>
        <h2 className="text-base text-white font-semibold truncate">
          {user?.username || "Loading..."}
        </h2>
        <p className="text-xs text-gray-400">
          {user?.active_status ? "Online" : "Offline"}
        </p>
      </motion.div>

      {/* Chat Settings */}
      <div className="p-3 space-y-2 text-white flex-1">
        <h3 className="text-xs font-semibold text-gray-400 mb-2">
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
            className="w-full text-left py-2 px-3 hover:bg-gray-700 rounded-lg flex items-center text-sm"
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
      <div className="p-3">
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
    </motion.div>
  );
};

export default Profile;