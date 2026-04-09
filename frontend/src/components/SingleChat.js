import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { ArrowBackIcon, ChevronDownIcon, DeleteIcon } from "@chakra-ui/icons";
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

const CLIENT_ONLY_CHAT_KEYS = ["haveIBlockedOther", "amIBlockedByOther"];

function mergeChatPatch(prev, updated) {
  if (!updated) return prev;
  const next = { ...prev, ...updated };
  CLIENT_ONLY_CHAT_KEYS.forEach((k) => {
    if (updated[k] === undefined && prev && prev[k] !== undefined) {
      next[k] = prev[k];
    }
  });
  return next;
}

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
  const refreshRequestStatusRef = useRef(null);
  const cancelChatDeleteRef = useRef(null);

  const {
    isOpen: isDeleteChatOpen,
    onOpen: onOpenDeleteChat,
    onClose: onCloseDeleteChat,
  } = useDisclosure();

  const toast = useToast();
  const {
    user,
    setUser,
    selectedChat,
    setSelectedChat,
    notification,
    setNotification,
    chats,
    setChats,
  } = ChatState();

  const authConfig = () => ({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.token}`,
    },
  });

  const mergeChatIntoState = useCallback(
    (updated) => {
      if (!updated?._id) return;
      setSelectedChat((prev) => {
        if (!prev || String(prev._id) !== String(updated._id)) return prev;
        return mergeChatPatch(prev, updated);
      });
      setChats((prev) =>
        (prev || []).map((c) =>
          String(c._id) === String(updated._id) ? mergeChatPatch(c, updated) : c
        )
      );
    },
    [setSelectedChat, setChats]
  );

  const otherUserInDirectChat = useCallback(() => {
    if (!selectedChat || selectedChat.isGroupChat) return null;
    const me = String(user._id);
    return selectedChat.users.find((u) => String(u._id) !== me) || null;
  }, [selectedChat, user._id]);

  const refreshRequestStatus = useCallback(async () => {
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
  }, [selectedChat, otherUserInDirectChat, user.token]);

  refreshRequestStatusRef.current = refreshRequestStatus;

  const handleAccept = async () => {
    if (requestInfo.mode !== "incoming" || !requestInfo.requestId) return;
    try {
      const { data } = await axios.post(
        `/api/requests/${requestInfo.requestId}/accept`,
        {},
        authConfig()
      );
      if (data.chat) mergeChatIntoState(data.chat);
      toast({
        title: "Request accepted",
        status: "success",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
      refreshRequestStatus();
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
    if (!selectedChat?._id || selectedChat.isGroupChat) return;
    if (requestInfo.mode !== "incoming" || !requestInfo.requestId) return;
    try {
      const { data } = await axios.patch(
        `/api/chat/${selectedChat._id}/decline`,
        {},
        authConfig()
      );
      if (data.chat) mergeChatIntoState(data.chat);
      toast({
        title: "Request declined",
        status: "info",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
      refreshRequestStatus();
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

  const handleUndoDecline = async () => {
    if (!selectedChat?._id || selectedChat.isGroupChat) return;
    try {
      const { data } = await axios.patch(
        `/api/chat/${selectedChat._id}/undo-decline`,
        {},
        authConfig()
      );
      if (data.chat) mergeChatIntoState(data.chat);
      toast({
        title: "Decline undone",
        description: "You can accept or decline the request again.",
        status: "success",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
      refreshRequestStatus();
    } catch (err) {
      toast({
        title: "Could not undo decline",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        position: "bottom",
        isClosable: true,
      });
    }
  };

  const handleFinalizeDecline = async () => {
    if (!selectedChat?._id || selectedChat.isGroupChat) return;
    const chatId = selectedChat._id;
    try {
      await axios.patch(`/api/chat/${chatId}/finalize-decline`, {}, authConfig());
      const idStr = String(chatId);
      setChats((prev) => (prev || []).filter((c) => String(c._id) !== idStr));
      setSelectedChat(null);
      setMessages([]);
      setRequestInfo({
        mode: "none",
        requestId: null,
        preMessageUsed: false,
        otherUser: null,
      });
      toast({
        title: "Decline finalized",
        description: "This request will stay declined.",
        status: "info",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Could not finalize decline",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        position: "bottom",
        isClosable: true,
      });
    }
  };

  const [undoClock, setUndoClock] = useState(() => Date.now());
  useEffect(() => {
    setUndoClock(Date.now());
  }, [selectedChat?._id, selectedChat?.status, selectedChat?.declinedAt, selectedChat?.isFinalDecline]);

  useEffect(() => {
    if (
      !selectedChat ||
      selectedChat.isGroupChat ||
      selectedChat.status !== "declined" ||
      !selectedChat.declinedAt
    ) {
      return undefined;
    }
    const id = setInterval(() => setUndoClock(Date.now()), 15000);
    return () => clearInterval(id);
  }, [selectedChat]);

  const declinedById =
    selectedChat?.declinedByUser?._id ?? selectedChat?.declinedByUser;
  const isDeclinedByMe =
    selectedChat &&
    !selectedChat.isGroupChat &&
    selectedChat.status === "declined" &&
    String(declinedById) === String(user._id);

  const undoWindowMs = 30 * 60 * 1000;
  const undoEndsAt =
    selectedChat?.declinedAt && isDeclinedByMe
      ? new Date(selectedChat.declinedAt).getTime() + undoWindowMs
      : 0;
  const undoRemainingMs = Math.max(0, undoEndsAt - undoClock);
  const isUndoAvailable =
    isDeclinedByMe && !selectedChat?.isFinalDecline && undoRemainingMs > 0;
  const undoMinutesLeft = Math.max(1, Math.ceil(undoRemainingMs / 60000));

  const canSendMessage = Boolean(
    selectedChat &&
      (selectedChat.isGroupChat || selectedChat.status === "accepted")
  );

  
  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    try {
      setLoading(true);
      const { data } = await axios.get(`/api/message/${selectedChat._id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const decrypted = data.map((msg) =>
        msg.isDeleted
          ? { ...msg }
          : { ...msg, content: normalizeText(decryptText(msg.content)) }
      );

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
  }, [selectedChat, user.token, setNotification, toast]);

  // ---------- SOCKET SETUP ----------
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);

    const onConnected = () => setSocketConnected(true);
    const onTyping = () => setIsTyping(true);
    const onStopTyping = () => setIsTyping(false);

    const onChatUpdated = (chatPayload) => {
      if (!chatPayload?._id) return;
      const me = String(user._id);
      const hiddenForMe = (chatPayload.deletedFor || []).some(
        (id) => String(id) === me
      );
      if (hiddenForMe) {
        setChats((prev) =>
          (prev || []).filter((c) => String(c._id) !== String(chatPayload._id))
        );
        const cur = selectedChatRef.current;
        if (cur && String(cur._id) === String(chatPayload._id)) {
          setSelectedChat(null);
          setMessages([]);
          setRequestInfo({
            mode: "none",
            requestId: null,
            preMessageUsed: false,
            otherUser: null,
          });
        }
        refreshRequestStatusRef.current?.();
        return;
      }

      mergeChatIntoState(chatPayload);
      refreshRequestStatusRef.current?.();

      const dBy = chatPayload.declinedByUser?._id ?? chatPayload.declinedByUser;
      if (
        chatPayload.status === "declined" &&
        dBy &&
        String(dBy) !== me
      ) {
        toast({
          title: "Request Declined",
          description: "Your message request was declined",
          status: "error",
          duration: 3000,
          position: "bottom",
          isClosable: true,
        });
      }
    };

    socket.on("connected", onConnected);
    socket.on("typing", onTyping);
    socket.on("stop typing", onStopTyping);
    socket.on("chat updated", onChatUpdated);

    return () => {
      socket.off("connected", onConnected);
      socket.off("typing", onTyping);
      socket.off("stop typing", onStopTyping);
      socket.off("chat updated", onChatUpdated);
      socket.disconnect();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
    
  }, [user, toast, mergeChatIntoState, setChats, setSelectedChat]);

  // Load messages + request status on chat change
  useEffect(() => {
    selectedChatRef.current = selectedChat;
    if (!selectedChat) return;
    fetchMessages();
    refreshRequestStatus();
    
  }, [selectedChat, fetchMessages, refreshRequestStatus]);

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
          incoming.isDeleted
            ? { ...incoming }
            : { ...incoming, content: normalizeText(decryptText(incoming.content)) },
        ]);
      }
    };

    socket.on("message received", handleMessageReceived);
    return () => socket.off("message received", handleMessageReceived);
    
  }, [setNotification, toast]);

  // Reaction updates
  useEffect(() => {
    const handleReactionUpdated = (updatedMessage) => {
      const current = selectedChatRef.current;
      if (!current || current._id !== updatedMessage.chat._id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m._id === updatedMessage._id
            ? updatedMessage.isDeleted
              ? { ...updatedMessage }
              : { ...updatedMessage, content: normalizeText(decryptText(updatedMessage.content)) }
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

    if (!canSendMessage) return;

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
      } else if (code === "USER_BLOCKED") {
        setNewMessage(plain);
        const rel = error.response?.data?.relation;
        mergeChatIntoState({
          haveIBlockedOther: rel === "i_blocked" ? true : !!selectedChat?.haveIBlockedOther,
          amIBlockedByOther: rel === "blocked_me" ? true : !!selectedChat?.amIBlockedByOther,
        });
        setFetchAgain((x) => !x);
        toast({
          title: "Messaging blocked",
          description: error.response?.data?.message || "You cannot message this user.",
          status: "warning",
          duration: 4000,
          position: "bottom",
          isClosable: true,
        });
      } else if (error?.response?.data?.message === "Chat not accepted") {
        setNewMessage(plain);
        toast({
          title: "Messaging unavailable",
          description: "Messaging disabled until the chat is accepted.",
          status: "warning",
          duration: 4000,
          position: "bottom",
          isClosable: true,
        });
        refreshRequestStatus();
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

    if (!canSendMessage) return;

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

  const persistUser = (nextUser) => {
    try {
      localStorage.setItem("userInfo", JSON.stringify(nextUser));
    } catch {
      /* ignore */
    }
    setUser(nextUser);
  };

  const handleBlockUser = async () => {
    const other = otherUserInDirectChat();
    if (!other?._id) return;
    try {
      const { data } = await axios.patch(`/api/user/block/${other._id}`, {}, authConfig());
      persistUser({ ...user, blockedUsers: data.blockedUsers || [] });
      mergeChatIntoState({
        haveIBlockedOther: true,
        amIBlockedByOther: !!selectedChat?.amIBlockedByOther,
      });
      toast({
        title: "User blocked",
        status: "success",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Could not block user",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        position: "bottom",
        isClosable: true,
      });
    }
  };

  const handleUnblockUser = async () => {
    const other = otherUserInDirectChat();
    if (!other?._id) return;
    try {
      const { data } = await axios.patch(`/api/user/unblock/${other._id}`, {}, authConfig());
      persistUser({ ...user, blockedUsers: data.blockedUsers || [] });
      mergeChatIntoState({
        haveIBlockedOther: false,
        amIBlockedByOther: !!selectedChat?.amIBlockedByOther,
      });
      toast({
        title: "User unblocked",
        status: "success",
        duration: 3000,
        position: "bottom",
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Could not unblock user",
        description: err.response?.data?.message || err.message,
        status: "error",
        duration: 4000,
        position: "bottom",
        isClosable: true,
      });
    }
  };

  const confirmRemoveChatFromList = async () => {
    if (!selectedChat?._id) return;
    try {
      await axios.delete(`/api/chat/${selectedChat._id}`, authConfig());
      setChats((prev) => (prev || []).filter((c) => c._id !== selectedChat._id));
      setNotification((prev) =>
        (prev || []).filter((n) => n.chat?._id !== selectedChat._id)
      );
      setSelectedChat(null);
      setMessages([]);
      setFetchAgain(!fetchAgain);
      toast({
        title: "Chat removed from your list",
        description:
          "Older messages stay on the server but won’t show for you after you open this chat again.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      onCloseDeleteChat();
    } catch (error) {
      toast({
        title: "Could not remove chat",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const otherParticipant = otherUserInDirectChat();
  const blockedIds = (user?.blockedUsers || []).map(String);
  const haveIBlockedOther =
    selectedChat?.haveIBlockedOther ??
    (otherParticipant ? blockedIds.includes(String(otherParticipant._id)) : false);
  const amIBlockedByOther = !!selectedChat?.amIBlockedByOther;
  const isMessagingBlocked =
    !!selectedChat && !selectedChat.isGroupChat && (haveIBlockedOther || amIBlockedByOther);

  const status = selectedChat?.status || "accepted";
  const isDirectRequestUi =
    !!selectedChat && !selectedChat.isGroupChat && !isMessagingBlocked;

  const showPendingRequestBanner = isDirectRequestUi && status === "pending";
  const showIncomingActions =
    showPendingRequestBanner &&
    requestInfo.mode === "incoming" &&
    !!requestInfo.requestId;

  const showDeclinedSenderBanner =
    isDirectRequestUi && status === "declined" && !isDeclinedByMe;

  const showDeclinedUndoCancel =
    !!selectedChat &&
    !selectedChat.isGroupChat &&
    status === "declined" &&
    isDeclinedByMe &&
    !isMessagingBlocked;

  const chatNotificationCount = notification.filter(
    (n) => n.chat._id === selectedChat?._id
  ).length;

  if (!selectedChat) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        h="100%"
        bg="whiteAlpha.100"
        border="1px solid rgba(255,255,255,0.12)"
        borderRadius="2xl"
        p={6}
      >
        <HStack spacing={3}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" color="whiteAlpha.800" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16v10H5.17L4 15.17V4zm0-2c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H4z"/>
          </svg>
          <Text fontSize={{ base: "xl", md: "2xl" }} opacity={0.85}>
            Start a conversation
          </Text>
        </HStack>
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
          transition="all 0.2s ease"
          _hover={{ bg: "whiteAlpha.200", borderRadius: "md" }}
        />

        {!selectedChat.isGroupChat ? (
          <>
            <Text as="span" fontSize="xl" fontWeight="semibold" color="white" letterSpacing="0.5px" opacity={0.95}>
              {getSender(user, selectedChat.users)}
            </Text>
            <HStack spacing={2}>
              <ProfileModal user={getSenderFull(user, selectedChat.users)} />
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<ChevronDownIcon />}
                  size="sm"
                  variant="ghost"
                  aria-label="Chat actions"
                />
                <MenuList bg="gray.800" color="white" borderColor="whiteAlpha.300" minW="150px" maxW="180px" p={2} borderRadius="lg">
                  <MenuItem
                    fontSize="sm"
                    px={3}
                    py={2}
                    borderRadius="md"
                    bg="transparent"
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={() => setSelectedChat(null)}
                  >
                    Close Chat
                  </MenuItem>
                  <MenuItem
                    fontSize="sm"
                    px={3}
                    py={2}
                    borderRadius="md"
                    bg="transparent"
                    _hover={{ bg: "red.500", color: "white" }}
                    onClick={onOpenDeleteChat}
                    icon={<DeleteIcon />}
                  >
                    Delete Chat
                  </MenuItem>
                  {haveIBlockedOther ? (
                    <MenuItem
                      fontSize="sm"
                      px={3}
                      py={2}
                      borderRadius="md"
                      bg="transparent"
                      _hover={{ bg: "whiteAlpha.200" }}
                      onClick={handleUnblockUser}
                    >
                      Unblock User
                    </MenuItem>
                  ) : (
                    <MenuItem
                      fontSize="sm"
                      px={3}
                      py={2}
                      borderRadius="md"
                      bg="transparent"
                      _hover={{ bg: "whiteAlpha.200" }}
                      onClick={handleBlockUser}
                    >
                      Block User
                    </MenuItem>
                  )}
                </MenuList>
              </Menu>
            </HStack>
          </>
        ) : (
          <>
            <Text as="span" fontSize="xl" fontWeight="semibold" color="white" letterSpacing="0.5px" opacity={0.95}>
              {selectedChat.chatName.toUpperCase()}
            </Text>
            <HStack spacing={2}>
              <UpdateGroupChatModal
                fetchAgain={fetchAgain}
                setFetchAgain={setFetchAgain}
                fetchMessages={fetchMessages}
              />
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<ChevronDownIcon />}
                  size="sm"
                  variant="ghost"
                  aria-label="Chat actions"
                />
                <MenuList bg="gray.800" color="white" borderColor="whiteAlpha.300" minW="150px" maxW="180px" p={2} borderRadius="lg">
                  <MenuItem
                    fontSize="sm"
                    px={3}
                    py={2}
                    borderRadius="md"
                    bg="transparent"
                    _hover={{ bg: "whiteAlpha.200" }}
                    onClick={() => setSelectedChat(null)}
                  >
                    Close Chat
                  </MenuItem>
                  <MenuItem
                    fontSize="sm"
                    px={3}
                    py={2}
                    borderRadius="md"
                    bg="transparent"
                    _hover={{ bg: "red.500", color: "white" }}
                    onClick={onOpenDeleteChat}
                    icon={<DeleteIcon />}
                  >
                    Delete Chat
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </>
        )}

        {chatNotificationCount > 0 && (
          <Badge colorScheme="red" borderRadius="full" px={2} py={1} ml={2}>
            {chatNotificationCount}
          </Badge>
        )}
      </Text>

      
      {!selectedChat.isGroupChat && isMessagingBlocked && (
        <Alert
          status="error"
          bg="red.900"
          color="white"
          borderRadius="lg"
          p={3}
          mb={2}
          alignItems="center"
        >
          <AlertIcon color="white" />
          <Box flex="1" textAlign="center">
            {haveIBlockedOther ? (
              <Text fontWeight="semibold" mb={2}>
                You have blocked this user.
              </Text>
            ) : (
              <Text fontWeight="semibold" mb={2}>
                You&apos;ve been blocked and cannot send messages.
              </Text>
            )}
            {haveIBlockedOther && (
              <Button size="sm" colorScheme="blue" onClick={handleUnblockUser}>
                Unblock User
              </Button>
            )}
          </Box>
        </Alert>
      )}

      {showPendingRequestBanner && (
        <Alert status="warning" borderRadius="lg" p={3} mb={2} alignItems="center">
          <AlertIcon />
          <Box flex="1">
            {showIncomingActions ? (
              <>
                <Text fontWeight="semibold" mb={1} textAlign="center" color="black">
                  {requestInfo.otherUser?.name || "Someone"} wants to message you.
                </Text>
                <HStack justify="center">
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
                <Text fontWeight="semibold" mb={1} textAlign="center" color="black">
                  Message request pending.
                </Text>
                <Text fontSize="sm" color="blackAlpha.800" textAlign="center">
                  You can&apos;t send more messages until they accept.
                </Text>
              </>
            )}
          </Box>
        </Alert>
      )}

      {showDeclinedSenderBanner && (
        <Alert status="error" borderRadius="lg" p={3} mb={2} alignItems="center">
          <AlertIcon />
          <Box flex="1" textAlign="center">
            <Text fontWeight="semibold" mb={1}>
              {selectedChat.isFinalDecline
                ? "This request was declined permanently"
                : "Message request declined."}
            </Text>
            {!selectedChat.isFinalDecline && (
              <Text fontSize="sm" opacity={0.9}>
                You can no longer send messages.
              </Text>
            )}
          </Box>
        </Alert>
      )}

      {showDeclinedUndoCancel && (
        <Alert
          status="warning"
          bg="orange.300"
          color="black"
          borderRadius="lg"
          p={3}
          mb={2}
          alignItems="center"
        >
          <AlertIcon />
          <Box flex="1" textAlign="center">
            <Text fontWeight="semibold" mb={1}>
              You declined this message request.
            </Text>
            {selectedChat.isFinalDecline ? (
              <Text fontSize="sm" color="blackAlpha.800">
                This request was declined permanently.
              </Text>
            ) : isUndoAvailable ? (
              <>
                <Text fontSize="sm" color="blackAlpha.800" mb={2}>
                  Undo available for about {undoMinutesLeft}{" "}
                  {undoMinutesLeft === 1 ? "minute" : "minutes"}. Cancel makes this
                  final.
                </Text>
                <HStack justify="center" spacing={3} flexWrap="wrap">
                  <Button size="sm" colorScheme="yellow" onClick={handleUndoDecline}>
                    Undo
                  </Button>
                  <Button size="sm" variant="outline" colorScheme="blackAlpha" onClick={handleFinalizeDecline}>
                    Cancel
                  </Button>
                </HStack>
              </>
            ) : (
              <>
                <Text fontSize="sm" color="blackAlpha.800" mb={2}>
                  The 30-minute undo window has expired. Use Cancel to keep this
                  decline final, or they may message you again.
                </Text>
                <Button size="sm" variant="outline" colorScheme="blackAlpha" onClick={handleFinalizeDecline}>
                  Cancel
                </Button>
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
        bg="transparent"
        w="100%"
        h="100%"
        borderRadius="lg"
        overflowY="hidden"
      >
        {loading ? (
          <Spinner size="xl" w={20} h={20} alignSelf="center" margin="auto" />
        ) : messages.length === 0 ? (
          <Box
            flex="1"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="120px"
            px={4}
          >
            <Text color="whiteAlpha.700" fontSize="md" textAlign="center">
              Start a new conversation
            </Text>
          </Box>
        ) : (
          <div className="messages">
            <ScrollableChat messages={messages} setMessages={setMessages} />
            {isTyping && (
              <Box fontSize="sm" color="white" fontStyle="italic" p={2}>
                  Typing...
              </Box>
            )}
          </div>
        )}

        <FormControl onKeyDown={sendMessage} isRequired mt={3}>
          <Input
            variant="filled"
            bg="whiteAlpha.200"
            color="white"
            focusBorderColor="brand.500"
            _placeholder={{ color: "gray.400" }}
            placeholder={
              canSendMessage
                ? "Enter a message..."
                : "Messaging disabled until accepted"
            }
            onChange={typingHandler}
            value={newMessage}
            isDisabled={!canSendMessage}
            opacity={!canSendMessage ? 0.6 : 1}
          />
        </FormControl>
      </Box>

      <AlertDialog
        isOpen={isDeleteChatOpen}
        leastDestructiveRef={cancelChatDeleteRef}
        onClose={onCloseDeleteChat}
      >
        <AlertDialogOverlay />
        <AlertDialogContent bg="gray.800" color="white" borderColor="whiteAlpha.300">
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete this chat?
          </AlertDialogHeader>
          <AlertDialogBody>
            Are you sure you want to delete this chat? It will disappear from your list. When you start
            the conversation again, previous messages will not be shown to you. Other people are not
            affected.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelChatDeleteRef} onClick={onCloseDeleteChat}>
              Cancel
            </Button>
            <Button colorScheme="red" ml={3} onClick={confirmRemoveChatFromList}>
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SingleChat;
