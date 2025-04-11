import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import Login from './pages/Login'
import ChatPage from './pages/ChatPage'
import PrivateRoute from './components/PrivateRoute'
import { AuthProvider } from './utils/AuthProvider'

const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
    children: []
  },

  {
    path: '/',
    element: <PrivateRoute>
      <ChatPage />
    </PrivateRoute>,
    children: []
  }
])

function App() {

  return (
    <>
      <AuthProvider>
        <RouterProvider router={appRouter} />
      </AuthProvider>

    </>
  )
}

export default App
