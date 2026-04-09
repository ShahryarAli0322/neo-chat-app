import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";
import SideDrawer from "../components/miscellaneous/SideDrawer";
import MyChats from "../components/MyChats";
import ChatBox from "../components/ChatBox";

const ChatPage = () => {
  const history = useHistory();
  const { user } = ChatState();
  const [fetchAgain, setFetchAgain] = useState(false);


  useEffect(() => {
    let userInfo = null;
    try {
      const raw = localStorage.getItem("userInfo");
      userInfo = raw ? JSON.parse(raw) : null;
    } catch {
      userInfo = null;
    }
    if (!userInfo?.token) {
      history.replace("/");
    }
  }, [history]);
  return (
    <div style={{ width: "100%" }}>
      {user && <SideDrawer />}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="stretch"
        minW="0"
        w="100%"
        h="91.5vh"
        overflowX="hidden"
        p={{ base: 3, md: 4 }}
        gap={{ base: 3, md: 4 }}
      >
        {user && <MyChats fetchAgain={fetchAgain} />}
        {user && (
          <ChatBox fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
        )}
      </Box>
    </div>
  );
};

export default ChatPage;
