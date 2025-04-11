import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../utils/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { triggerAlert } from '../utils/commonFunctions/CommonFunctions';

const Login = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

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
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [showForms, setShowForms] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForms(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const onLoginSubmit = async (data) => {
    setLoginLoading(true);
    try {
      console.log('Login Data:', data);
      
      const loginResponse = await axios.post(
        'http://38.77.155.139:8001/user/login/',
        {
          email: data.email,
          password: data.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Login Response:', loginResponse.data);

      
      const { token, userId } = loginResponse.data; 

      
      const usersResponse = await axios.get('http://38.77.155.139:8001/user/get-all-users/', {
        headers: {
          Authorization: `Bearer ${token}`, // Include token if required
          'Content-Type': 'application/json',
        },
      });

      console.log('Users Response:', usersResponse.data);

     
      const loggedInUser = usersResponse.data.find((user) => user.email === data.email);

      if (!loggedInUser) {
        throw new Error('User not found in the system.');
      }

      
      login({
        ...loggedInUser, 
        token,
      });

      triggerAlert('success', 'Success', 'Login Successful');
      navigate('/');
      resetLogin();
    } catch (err) {
      console.error('Login Error:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials and try again.';
      triggerAlert('error', 'Error', errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const onSignupSubmit = async (data) => {
    setSignupLoading(true);
    const payload = {
      username: data.username,
      email: data.email,
      password: data.password,
    };

    try {
      const response = await axios.post(
        'http://38.77.155.139:8001/user/register/',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      triggerAlert('success', 'Success', 'Registered Successfully');
      console.log('Signup Response:', response.data);
      resetSignup();
    } catch (err) {
      console.error('Signup Error:', err);
      const errorMessage = err.response?.data?.message || 'Signup failed. Please try again.';
      triggerAlert('error', 'Error', errorMessage);
      resetSignup();
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        className="fixed inset-0 md:inset-y-12 md:left-12 md:right-12 bg-black/30 backdrop-blur-sm rounded-lg max-md:rounded-none max-md:inset-0 flex items-center justify-center"
        style={{
          padding: '5%',
          boxSizing: 'border-box',
          zIndex: 5,
        }}
      >
        <div className="relative z-10 w-full max-w-4xl mx-auto p-4">
          <div className="flex flex-row space-x-10 max-md:flex-col max-md:space-x-0 max-md:space-y-6">
            <form
              onSubmit={handleLoginSubmit(onLoginSubmit)}
              className={`flex-1 bg-gray-800/70 p-8 rounded-lg shadow-lg backdrop-blur-md space-y-8 transform transition-transform duration-500 ease-in-out ${
                showForms ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Welcome back,</h2>

              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Email"
                  {...registerLogin('email', { required: 'Email is required' })}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loginLoading}
                />
                {loginErrors.email && <p className="text-red-500 text-sm">{loginErrors.email.message}</p>}
              </div>
              <div className="mb-6">
                <input
                  type="password"
                  placeholder="Password"
                  {...registerLogin('password', { required: 'Password is required' })}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loginLoading}
                />
                {loginErrors.password && <p className="text-red-500 text-sm">{loginErrors.password.message}</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300"
                disabled={loginLoading}
              >
                {loginLoading ? 'Logging....' : 'Log In'}
              </button>

              <p className='text-gray-400 text-center mt-3'>Don't Have an account <span className='text-gray-50'>Register</span></p>
              
            </form>

            <div className="w-1 bg-gray-600 my-16 mx-8 max-md:hidden"></div>

            <form
              onSubmit={handleSignupSubmit(onSignupSubmit)}
              className={`flex-1 bg-gray-800/70 p-8 rounded-lg shadow-lg backdrop-blur-md transform transition-transform duration-500 ease-in-out ${
                showForms ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Create an Account</h2>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Username"
                  {...registerSignup('username', { required: 'Username is required' })}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={signupLoading}
                />
                {signupErrors.username && <p className="text-red-500 text-sm">{signupErrors.username.message}</p>}
              </div>
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Email"
                  {...registerSignup('email', { required: 'Email is required' })}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={signupLoading}
                />
                {signupErrors.email && <p className="text-red-500 text-sm">{signupErrors.email.message}</p>}
              </div>
              <div className="mb-4">
                <input
                  type="password"
                  placeholder="Password"
                  {...registerSignup('password', { required: 'Password is required' })}
                  className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={signupLoading}
                />
                {signupErrors.password && <p className="text-red-500 text-sm">{signupErrors.password.message}</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition disabled:bg-blue-300"
                disabled={signupLoading}
              >
                {signupLoading ? 'Registering.....' : 'Register'}
              </button>

              <p className='text-gray-400 text-center mt-3'>Already Have an account <span className='text-gray-50'>LogIn</span></p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;