import React from "react";
import { ChatState } from "../Context/ChatProvider";
import { Box } from "@chakra-ui/react";
import SingleChat from "./SingleChat";

const ChatBox = ({ fetchAgain, setFetchAgain }) => {
  const { selectedChat } = ChatState();

  return (
    <Box
      display={{ base: selectedChat ? "flex" : "none", md: "flex" }}
      alignItems="stretch"
      flexDir="column"
      minW="0"
      w="100%"
      maxW="100%"
      overflowX="hidden"
      p={4}
      bg="whiteAlpha.100"
      border="1px solid rgba(255,255,255,0.08)"
      boxShadow="0 10px 30px rgba(0,0,0,0.3)"
      w={{ base: "100%", md: "68%" }}
      borderRadius="2xl"
    >
      <SingleChat fetchAgain={fetchAgain} setFetchAgain={setFetchAgain} />
    </Box>
  );
};

export default ChatBox;
