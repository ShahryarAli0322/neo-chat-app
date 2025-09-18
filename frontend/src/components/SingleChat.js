import React, { useEffect, useRef, useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import {
  Box,
  FormControl,
  IconButton,
  Input,
  Spinner,
  Text,
  useToast,
  Badge,
  Button,
  HStack,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderFull } from "../config/ChatLogics";
import ProfileModal from "./miscellaneous/ProfileModal";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import axios from "axios";
import "./styles.css";
import ScrollableChat from "./ScrollableChat";
import io from "socket.io-client";
import { encryptText, decryptText } from "../utils/crypto";

const ENDPOINT =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") || "http://localhost:5000";

let socket;

/* ----------------------- TEXT NORMALIZER -----------------------
*/
const normalizeText = (str) =>
  String(str || "")
    .replace(/\u200B/g, "")                
    .replace(/\r\n?|\u2028|\u2029/g, "\n") 
    
    .replace(/\s*\n\s*/g, " ")             
    .replace(/[ \t]+/g, " ")               
    .trim();

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [requestInfo, setRequestInfo] = useState({
    mode: "none",
    requestId: null,
    preMessageUsed: false,
    otherUser: null,
  });

  const typingTimeoutRef = useRef(null);
  const selectedChatRef = useRef(null);

  const toast = useToast();
  const { user, selectedChat, setSelectedChat, notification, setNotification } =
    ChatState();

  const authConfig = () => ({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.token}`,
    },
  });

  const otherUserInDirectChat = () => {
    if (!selectedChat || selectedChat.isGroupChat) return null;
    const me = String(user._id);
    return selectedChat.users.find((u) => String(u._id) !== me) || null;
  };

  const refreshRequestStatus = async () => {
    if (!selectedChat || selectedChat.isGroupChat) {
      setRequestInfo({ mode: "none", requestId: null, preMessageUsed: false, otherUser: null });
      return;
    }
    const other = otherUserInDirectChat();
    if (!other) {
      setRequestInfo({ mode: "none", requestId: null, preMessageUsed: false, otherUser: null });
      return;
    }

    try {
      const [incomingRes, sentRes] = await Promise.all([
        axios.get("/api/requests", { headers: { Authorization: `Bearer ${user.token}` } }),
        axios.get("/api/requests/sent", { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);

      const incoming = (incomingRes.data || []).find((r) => String(r.from?._id) === String(other._id));
      if (incoming) {
        setRequestInfo({
          mode: "incoming",
          requestId: incoming._id,
          preMessageUsed: false,
          otherUser: incoming.from,
        });
        return;
      }

      const sent = (sentRes.data || []).find((r) => String(r.to?._id) === String(other._id));
      if (sent) {
        setRequestInfo({
          mode: "sent",
          requestId: sent._id,
          preMessageUsed: !!sent.preMessageUsed,
          otherUser: sent.to,
        });
        return;
      }

      setRequestInfo({ mode: "none", requestId: null, preMessageUsed: false, otherUser: other });
    } catch {
      
    }
  };

  const handleAccept = async () => {
    if (requestInfo.mode !== "incoming" || !requestInfo.requestId) return;
    try {
      await axios.post(`/api/requests/${requestInfo.requestId}/accept`, {}, authConfig());
      toast({
        title: "Request accepted",
        status: "success",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
      await refreshRequestStatus();
    } catch (err) {
      toast({
        title: "Failed to accept request",
        description: err.response?.data?.message,
        status: "error",
        duration: 4000,
        position: "bottom",
        isClosable: true,
      });
    }
  };

  const handleDecline = async () => {
    if (requestInfo.mode !== "incoming" || !requestInfo.requestId) return;
    try {
      await axios.post(`/api/requests/${requestInfo.requestId}/decline`, {}, authConfig());
      toast({
        title: "Request declined",
        status: "info",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
      await refreshRequestStatus();
    } catch (err) {
      toast({
        title: "Failed to decline request",
        description: err.response?.data?.message,
        status: "error",
        duration: 4000,
        position: "bottom",
        isClosable: true,
      });
    }
  };

  
  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      setLoading(true);
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      // decrypt + normalize before showing
      const decrypted = data.map((msg) => ({
        ...msg,
        content: normalizeText(decryptText(msg.content)),
      }));

      setMessages(decrypted);
      socket.emit("joinchat", selectedChat._id);

      // Clear notifications for this chat
      setNotification((prev) => prev.filter((n) => n.chat._id !== selectedChat._id));
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------- SOCKET SETUP ----------
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);

    const onConnected = () => setSocketConnected(true);
    const onTyping = () => setIsTyping(true);
    const onStopTyping = () => setIsTyping(false);

    socket.on("connected", onConnected);
    socket.on("typing", onTyping);
    socket.on("stop typing", onStopTyping);

    return () => {
      socket.off("connected", onConnected);
      socket.off("typing", onTyping);
      socket.off("stop typing", onStopTyping);
      socket.disconnect();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
    
  }, [user?._id]);

  // Load messages + request status on chat change
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    if (!selectedChat) return;
    fetchMessages();
    refreshRequestStatus();
    
  }, [selectedChat]);

  // Incoming messages
  useEffect(() => {
    const handleMessageReceived = (incoming) => {
      const current = selectedChatRef.current;
      if (!current || current._id !== incoming.chat._id) {
        // notification for other chat
        setNotification((prev) => {
          const already = prev.some((n) => n._id === incoming._id);
          return already ? prev : [incoming, ...prev];
        });
        const name =
          incoming.sender?.name ||
          (incoming.chat?.isGroupChat ? incoming.chat?.chatName : "New message");
        toast({
          title: "New Message",
          description: `From ${name}`,
          status: "info",
          duration: 3000,
          isClosable: true,
          position: "bottom-right",
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { ...incoming, content: normalizeText(decryptText(incoming.content)) },
        ]);
      }
    };

    socket.on("message received", handleMessageReceived);
    return () => socket.off("message received", handleMessageReceived);
    
  }, []);

  // Reaction updates
  useEffect(() => {
    const handleReactionUpdated = (updatedMessage) => {
      const current = selectedChatRef.current;
      if (!current || current._id !== updatedMessage.chat._id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m._id === updatedMessage._id
            ? { ...updatedMessage, content: normalizeText(decryptText(updatedMessage.content)) }
            : m
        )
      );
    };

    socket.on("reaction updated", handleReactionUpdated);
    return () => socket.off("reaction updated", handleReactionUpdated);
  }, []);

  // ---------- SEND ----------
  const sendMessage = async (event) => {
    if (event.key !== "Enter") return;

   
    const plain = normalizeText(newMessage);
    if (!plain) return;

    // stop typing
    if (selectedChat) socket.emit("stop typing", selectedChat._id);
    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      const encrypted = encryptText(plain);
      setNewMessage("");

      const { data } = await axios.post(
        "/api/message",
        { content: encrypted, chatId: selectedChat._id },
        authConfig()
      );

      // show locally as plain text
      socket.emit("new message", data);
      setMessages((prev) => [...prev, { ...data, content: plain }]);

     
      if (!selectedChat.isGroupChat) {
        refreshRequestStatus();
      }
    } catch (error) {
      // Handle request rules
      const code = error?.response?.data?.code;
      if (code === "REQUEST_PENDING_FROM_THEM") {
        setRequestInfo((prev) => ({
          ...prev,
          mode: "incoming",
          requestId: error.response.data.requestId || null,
          preMessageUsed: false,
          otherUser: otherUserInDirectChat(),
        }));
        toast({
          title: "Message request pending",
          description: "Accept the other user's request to continue.",
          status: "warning",
          duration: 4000,
          position: "bottom",
          isClosable: true,
        });
      } else if (code === "REQUEST_LIMIT_REACHED") {
        setRequestInfo((prev) => ({
          ...prev,
          mode: "sent",
          requestId: error.response.data.requestId || null,
          preMessageUsed: true,
          otherUser: otherUserInDirectChat(),
        }));
        toast({
          title: "Limit reached",
          description: "You can send only one message until they accept.",
          status: "info",
          duration: 4000,
          position: "bottom",
          isClosable: true,
        });
      } else {
        toast({
          title: "Error Occurred!",
          description: error.response?.data?.message || "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  const typingHandler = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!socketConnected || !selectedChat) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (value.trim() === "") {
      socket.emit("stop typing", selectedChat._id);
      setTyping(false);
      return;
    }

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, 2000);
  };

  
  let canType = true;
  if (selectedChat && !selectedChat.isGroupChat) {
    if (requestInfo.mode === "incoming") canType = false;
    if (requestInfo.mode === "sent" && requestInfo.preMessageUsed) canType = false;
  }

  const chatNotificationCount = notification.filter(
    (n) => n.chat._id === selectedChat?._id
  ).length;

  if (!selectedChat) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" h="100%">
        <Text fontSize="3xl" pb={3} fontFamily="Work sans">
          Click on a user to start chatting
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Text
        fontSize={{ base: "28px", md: "30px" }}
        pb={3}
        px={2}
        w="100%"
        fontFamily="Work sans"
        display="flex"
        justifyContent={{ base: "space-between" }}
        alignItems="center"
      >
        <IconButton
          display={{ base: "flex", md: "none" }}
          icon={<ArrowBackIcon />}
          onClick={() => setSelectedChat(null)}
          aria-label="Go back"
        />

        {!selectedChat.isGroupChat ? (
          <>
            {getSender(user, selectedChat.users)}
            <ProfileModal user={getSenderFull(user, selectedChat.users)} />
          </>
        ) : (
          <>
            {selectedChat.chatName.toUpperCase()}
            <UpdateGroupChatModal
              fetchAgain={fetchAgain}
              setFetchAgain={setFetchAgain}
              fetchMessages={fetchMessages}
            />
          </>
        )}

        {chatNotificationCount > 0 && (
          <Badge colorScheme="red" borderRadius="full" px={2} py={1} ml={2}>
            {chatNotificationCount}
          </Badge>
        )}
      </Text>

      
      {!selectedChat.isGroupChat && requestInfo.mode !== "none" && (
        <Alert status="info" borderRadius="md" mb={2}>
          <AlertIcon />
          <Box flex="1">
            {requestInfo.mode === "incoming" ? (
              <>
                <Text fontWeight="semibold" mb={1}>
                  {requestInfo.otherUser?.name || "Someone"} wants to message you.
                </Text>
                <HStack>
                  <Button colorScheme="blue" size="sm" onClick={handleAccept}>
                    Accept
                  </Button>
                  <Button colorScheme="gray" size="sm" onClick={handleDecline}>
                    Decline
                  </Button>
                </HStack>
              </>
            ) : (
              <>
                <Text fontWeight="semibold" mb={1}>
                  Message request pending.
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {requestInfo.preMessageUsed
                    ? "You can’t send more messages until they accept."
                    : "You can send one message until they accept."}
                </Text>
              </>
            )}
          </Box>
        </Alert>
      )}

      <Box
        display="flex"
        flexDir="column"
        justifyContent="flex-end"
        p={3}
        bg="#E8E8E8"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {loading ? (
          <Spinner size="xl" w={20} h={20} alignSelf="center" margin="auto" />
        ) : (
          <div className="messages">
            <ScrollableChat messages={messages} setMessages={setMessages} />
            {isTyping && (
              <Box fontSize="sm" color="gray.500" fontStyle="italic" p={2}>
                  Typing...
              </Box>
            )}
          </div>
        )}

        <FormControl onKeyDown={sendMessage} isRequired mt={3}>
          <Input
            variant="filled"
            bg="#E0E0E0"
            placeholder={
              canType
                ? "Enter a message..."
                : requestInfo.mode === "incoming"
                ? "Accept the request to start messaging…"
                : "Pending acceptance…"
            }
            onChange={typingHandler}
            value={newMessage}
            isDisabled={!canType}
          />
        </FormControl>
      </Box>
    </>
  );
};

export default SingleChat;
