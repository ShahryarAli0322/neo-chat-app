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
  console.log("User data",user)
  const [fetchAgain, setFetchAgain] = useState(false);


  useEffect(() => {
    const info = localStorage.getItem("userInfo");
    
    if (!info) {
      history.replace("/");
    }
  }, []);
  return (
    <div style={{ width: "100%" }}>
      {user && <SideDrawer />}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="stretch"
        w="100%"
        h="91.5vh"
        p="10px"
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
