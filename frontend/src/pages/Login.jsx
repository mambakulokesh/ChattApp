import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../utils/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { triggerAlert } from '../utils/commonFunctions/CommonFunctions';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login'); 
  const [showForms, setShowForms] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
    formState: { errors: loginErrors },
  } = useForm();
  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    reset: resetSignup,
    formState: { errors: signupErrors },
  } = useForm();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForms(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const onLoginSubmit = async (data) => {
    setLoginLoading(true);
    try {
      const loginResponse = await axios.post(
        'http://38.77.155.139:8000/user/login/',
        { email: data.email, password: data.password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const loggedInData = loginResponse.data.data;
      
      login({ ...loggedInData });
      triggerAlert('success', 'Success', 'Login Successful');
      navigate('/');
      resetLogin();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      triggerAlert('error', 'Error', errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const onSignupSubmit = async (data) => {
    setSignupLoading(true);
    try {
      let avatarBase64 = '';
      if (data.avatar[0]) {
        avatarBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(",")[1];
            resolve(base64String);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(data.avatar[0]);
        });
      }

      const payload = {
        username: data.username,
        email: data.email,
        password: data.password,
        avatar: avatarBase64 || null, // Send null if no avatar is provided
      };

      await axios.post(
        'http://38.77.155.139:8000/user/register/',
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );
      triggerAlert('success', 'Success', 'Registered Successfully');
      resetSignup();
      setActiveTab('login');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Signup failed. Please try again.';
      triggerAlert('error', 'Error', errorMessage);
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 bg-cover bg-center relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4 bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-2xl p-6 sm:p-8"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">ChatApp</h1>
          <p className="text-gray-400 mt-2">Connect with friends seamlessly</p>
        </div>

        <div className="flex border-b border-gray-600 mb-6">
          <button
            type="button"
            className={`flex-1 py-3 text-center text-lg font-semibold transition-colors duration-300 ${
              activeTab === 'login' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('login')}
            aria-label="Login Tab"
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 py-3 text-center text-lg font-semibold transition-colors duration-300 ${
              activeTab === 'signup' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
            }`}
            onClick={() => setActiveTab('signup')}
            aria-label="Signup Tab"
          >
            Register
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'login' ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleLoginSubmit(onLoginSubmit)}
              className="space-y-6"
              aria-labelledby="login-heading"
            >
              <h2 id="login-heading" className="sr-only">
                Login Form
              </h2>
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  {...registerLogin('email', { required: 'Email is required' })}
                  className="w-full p-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={loginLoading}
                  aria-invalid={loginErrors.email ? 'true' : 'false'}
                />
                {loginErrors.email && (
                  <p className="text-red-400 text-sm mt-1" role="alert">
                    {loginErrors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  {...registerLogin('password', { required: 'Password is required' })}
                  className="w-full p-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={loginLoading}
                  aria-invalid={loginErrors.password ? 'true' : 'false'}
                />
                {loginErrors.password && (
                  <p className="text-red-400 text-sm mt-1" role="alert">
                    {loginErrors.password.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:bg-blue-400"
                disabled={loginLoading}
                aria-busy={loginLoading}
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Log In'
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSignupSubmit(onSignupSubmit)}
              className="space-y-6"
              aria-labelledby="signup-heading"
              encType="multipart/form-data"
            >
              <h2 id="signup-heading" className="sr-only">
                Signup Form
              </h2>
              <div>
                <label htmlFor="signup-username" className="block text-sm font-medium text-gray-300 mb-1">
                  Username
                </label>
                <input
                  id="signup-username"
                  type="text"
                  placeholder="Choose a username"
                  {...registerSignup('username', { required: 'Username is required' })}
                  className="w-full p-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={signupLoading}
                  aria-invalid={signupErrors.username ? 'true' : 'false'}
                />
                {signupErrors.username && (
                  <p className="text-red-400 text-sm mt-1" role="alert">
                    {signupErrors.username.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  {...registerSignup('email', { required: 'Email is required' })}
                  className="w-full p-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={signupLoading}
                  aria-invalid={signupErrors.email ? 'true' : 'false'}
                />
                {signupErrors.email && (
                  <p className="text-red-400 text-sm mt-1" role="alert">
                    {signupErrors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  {...registerSignup('password', { required: 'Password is required' })}
                  className="w-full p-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={signupLoading}
                  aria-invalid={signupErrors.password ? 'true' : 'false'}
                />
                {signupErrors.password && (
                  <p className="text-red-400 text-sm mt-1" role="alert">
                    {signupErrors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="signup-avatar" className="block text-sm font-medium text-gray-300 mb-1">
                  Profile Picture
                </label>
                <input
                  id="signup-avatar"
                  type="file"
                  accept="image/*"
                  {...registerSignup('avatar', {
                    validate: (files) => {
                      if (files.length > 0) {
                        const file = files[0];
                        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                        if (!validTypes.includes(file.type)) {
                          return 'Only JPEG, PNG, or GIF images are allowed';
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          return 'Image size must be less than 5MB';
                        }
                      }
                      return true;
                    },
                  })}
                  className="w-full p-3 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={signupLoading}
                  aria-invalid={signupErrors.avatar ? 'true' : 'false'}
                />
                {signupErrors.avatar && (
                  <p className="text-red-400 text-sm mt-1" role="alert">
                    {signupErrors.avatar.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors disabled:bg-blue-400"
                disabled={signupLoading}
                aria-busy={signupLoading}
              >
                {signupLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Registering...
                  </span>
                ) : (
                  'Register'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;