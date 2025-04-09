import "./App.css";
import ChatPage from "./pages/ChatPage";
import Login from "./pages/Login";

import { Routes, Route } from "react-router-dom";

function App() {
  // const user = true;

  return (
    <>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;
