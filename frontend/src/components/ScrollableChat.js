import React, { useState } from "react";
import ScrollableFeed from "react-scrollable-feed";
import {
  Avatar,
  Box,
  Button,
  Tooltip,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider";
import { isLastMessage, isSameSender } from "../config/ChatLogics";
import { decryptText } from "../utils/crypto"; 

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👎"];

const ScrollableChat = ({ messages, setMessages }) => {
  const { user } = ChatState();
  const [openPickerFor, setOpenPickerFor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${user?.token}`,
      "Content-Type": "application/json",
    },
  });

  const summarizeReactions = (reactions = []) => {
    const byEmoji = new Map();
    let myEmoji = null;

    reactions.forEach((r) => {
      const uid = String(r.user?._id || r.user);
      const entry = byEmoji.get(r.emoji) || { emoji: r.emoji, count: 0, my: false };
      entry.count += 1;
      if (uid === String(user._id)) {
        entry.my = true;
        myEmoji = r.emoji;
      }
      byEmoji.set(r.emoji, entry);
    });

    return { list: Array.from(byEmoji.values()), myEmoji };
  };

  const updateMessageInList = (updated) => {
    setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
  };

  const handleReact = async (message, emoji) => {
    const { myEmoji } = summarizeReactions(message.reactions);

    try {
      if (myEmoji === emoji) {
        const { data } = await axios.delete("/api/message/reaction", {
          ...authConfig(),
          data: { messageId: message._id },
        });
        updateMessageInList(data);
      } else {
        const { data } = await axios.post(
          "/api/message/reaction",
          { messageId: message._id, emoji },
          authConfig()
        );
        updateMessageInList(data);
      }
    } catch {
      
    } finally {
      setOpenPickerFor(null);
    }
  };

  const openDeleteModal = (m) => {
    if (m.isDeleted) return;
    setDeleteTarget({
      id: m._id,
      isMine: String(m.sender?._id) === String(user._id),
    });
  };

  const closeDeleteModal = () => setDeleteTarget(null);

  const confirmDeleteMessage = async (type) => {
    if (!deleteTarget?.id) return;
    try {
      const { data } = await axios.delete(`/api/message/${deleteTarget.id}`, {
        ...authConfig(),
        data: { type },
      });
      if (data.mode === "me") {
        setMessages((prev) => prev.filter((m) => m._id !== deleteTarget.id));
      } else if (data.mode === "everyone" && data.data) {
        updateMessageInList(data.data);
      }
      closeDeleteModal();
    } catch {
      // modal stays open on failure
    }
  };

  const bubbleStyle = (mine, isDeleted) =>
    isDeleted
      ? {
          bg: "whiteAlpha.200",
          color: "gray.300",
          fontStyle: "italic",
          borderRadius: "2xl",
          px: 4,
          py: 2,
          maxW: "70%",
          width: "fit-content",
          minW: "80px",
          fontSize: "sm",
          fontWeight: "normal",
          lineHeight: "1.5",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          textAlign: "left",
        }
      : {
          bg: mine ? undefined : "gray.700",
          bgGradient: mine ? "linear(to-r, #7B61FF, #FF4ECD)" : undefined,
          color: "white",
          borderRadius: "2xl",
          borderBottomRightRadius: mine ? "sm" : "2xl",
          borderBottomLeftRadius: mine ? "2xl" : "sm",
          px: 4,
          py: 2,
          maxW: "70%",
          width: "fit-content",
          minW: "80px",
          fontSize: "md",
          fontWeight: "medium",
          lineHeight: "1.5",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          transition: "0.2s",
          _hover: { transform: "scale(1.02)", boxShadow: "0 6px 16px rgba(0,0,0,0.4)" },
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          textAlign: "left",
        };

  const rowStyle = (mine, compact) => ({
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: mine ? "flex-end" : "flex-start",
    gap: "8px",
    marginTop: compact ? 4 : 8,
    marginBottom: 8,
    maxWidth: "100%",
    overflow: "hidden",
  });

  return (
    <Box overflowX="hidden" maxW="100%">
    <ScrollableFeed>
      {messages?.map((m, i) => {
        const mine = String(m.sender?._id) === String(user._id);
        const previous = messages[i - 1];
        const compact = previous && String(previous.sender?._id) === String(m.sender?._id);
        const showAvatar =
          (isSameSender(messages, m, i, user._id) ||
            isLastMessage(messages, i, user._id)) &&
          !mine;

        const { list: reactionSummary } = summarizeReactions(m.reactions);
        const renderedText = m.isDeleted
          ? "This message was deleted"
          : decryptText(m.content);
        const createdAtText = m.createdAt
          ? new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <motion.div
            key={m._id}
            style={rowStyle(mine, compact)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {!mine && showAvatar && (
              <Tooltip label={m.sender?.name} placement="bottom-start" hasArrow>
                <Avatar
                  mt="7px"
                  mr={1}
                  size="sm"
                  cursor="pointer"
                  src={m.sender?.pic}
                  name={m.sender?.name}
                />
              </Tooltip>
            )}

            <Box
              display="flex"
              flexDir="column"
              alignItems={mine ? "flex-end" : "flex-start"}
              justifyContent={mine ? "flex-end" : "flex-start"}
              w="auto"
              minW="0"
            >
              
              <Box
                className="message-bubble"
                position="relative"
                role="group"
                alignSelf={mine ? "flex-end" : "flex-start"}
              >
                {!m.isDeleted && (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<ChevronDownIcon />}
                      size="xs"
                      variant="ghost"
                      position="absolute"
                      top="-8px"
                      {...(mine ? { right: "-10px" } : { left: "-10px" })}
                      minW="20px"
                      h="20px"
                      opacity={0}
                      _groupHover={{ opacity: 1 }}
                      aria-label="Message options"
                    />
                    <MenuList bg="#1a1a2e" color="white" borderColor="whiteAlpha.300">
                      <MenuItem
                        bg="transparent"
                        _hover={{ bg: "whiteAlpha.100" }}
                        onClick={() => openDeleteModal(m)}
                      >
                        Delete message
                      </MenuItem>
                    </MenuList>
                  </Menu>
                )}

                <Box {...bubbleStyle(mine, !!m.isDeleted)}>
                  {renderedText}
                </Box>
              </Box>
              <Text
                mt={1}
                fontSize="xs"
                color="gray.400"
                textAlign={mine ? "right" : "left"}
                alignSelf={mine ? "flex-end" : "flex-start"}
                ml={!mine && showAvatar ? "2px" : 0}
              >
                {createdAtText}
              </Text>

              {!m.isDeleted && reactionSummary.length > 0 && (
                <Box mt={1} display="flex" gap="6px" flexWrap="wrap" fontSize="sm" opacity={0.9}>
                  {reactionSummary.map((r) => (
                    <Button
                      key={r.emoji}
                      size="xs"
                      variant={r.my ? "solid" : "ghost"}
                      colorScheme={r.my ? "blue" : "gray"}
                      onClick={() => handleReact(m, r.emoji)}
                    >
                      {r.emoji} {r.count > 1 ? `×${r.count}` : ""}
                    </Button>
                  ))}
                </Box>
              )}

              {!m.isDeleted && (
              <Box mt={1} display="flex" gap="6px" alignItems="center">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setOpenPickerFor((cur) => (cur === m._id ? null : m._id))}
                >
                  +
                </Button>
                {openPickerFor === m._id && (
                  <Box
                    p="4px 6px"
                    borderRadius="12px"
                    border="1px solid #ddd"
                    bg="white"
                    boxShadow="sm"
                    display="flex"
                    gap="6px"
                  >
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        style={{ fontSize: 18, lineHeight: 1.2 }}
                        onClick={() => handleReact(m, e)}
                      >
                        {e}
                      </button>
                    ))}
                  </Box>
                )}
              </Box>
              )}
            </Box>
          </motion.div>
        );
      })}
    </ScrollableFeed>

    <Modal isOpen={!!deleteTarget} onClose={closeDeleteModal} isCentered>
      <ModalOverlay />
      <ModalContent bg="#1a1a2e" color="white" borderColor="whiteAlpha.300" borderWidth="1px">
        <ModalHeader>Delete message?</ModalHeader>
        <ModalCloseButton />
        <ModalBody fontSize="sm" color="gray.300">
          Delete for everyone removes the message for all people in this chat. Delete for me only hides
          it on your device.
        </ModalBody>
        <ModalFooter gap={2} flexWrap="wrap">
          <Button variant="ghost" onClick={closeDeleteModal}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={() => confirmDeleteMessage("me")}>
            Delete for me
          </Button>
          <Button
            colorScheme="red"
            isDisabled={!deleteTarget?.isMine}
            title={!deleteTarget?.isMine ? "Only the sender can delete for everyone" : undefined}
            onClick={() => confirmDeleteMessage("everyone")}
          >
            Delete for everyone
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </Box>
  );
};

export default ScrollableChat;
