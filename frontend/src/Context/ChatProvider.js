import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

const ChatContext = createContext(null);

const ChatProvider = ({ children }) => {
  // Read localStorage during state initialization (runs before first paint)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("userInfo");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [notification, setNotification] = useState([]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "userInfo") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, selectedChat, setSelectedChat, chats, setChats, notification, setNotification }),
    [user, selectedChat, chats, notification]
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const ChatState = () => useContext(ChatContext);
export default ChatProvider;
