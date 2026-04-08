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
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider";
import { isLastMessage, isSameSender } from "../config/ChatLogics";
import { decryptText } from "../utils/crypto"; 

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👎"];

const ScrollableChat = ({ messages, setMessages }) => {
  const { user } = ChatState();
  const [openPickerFor, setOpenPickerFor] = useState(null);

  const authConfig = () => ({
    headers: { Authorization: `Bearer ${user?.token}` },
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

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`/api/message/${messageId}`, authConfig());
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch {
      
    }
  };

  const bubbleStyle = (mine) => ({
    bg: mine ? undefined : "whiteAlpha.200",
    bgGradient: mine ? "linear(to-r, purple.500, pink.500)" : undefined,
    color: "white",
    borderRadius: "2xl",
    borderBottomRightRadius: mine ? "sm" : "2xl",
    px: 4,
    py: 2,
    maxW: "75%",
    width: "fit-content",
    minW: "80px",
    lineHeight: "1.4",
    boxShadow: "md",
    transition: "0.2s",
    _hover: { transform: "scale(1.02)" },
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    textAlign: "left",
    border: "1px solid red",
  });

  const rowStyle = (mine, compact) => ({
    display: "flex",
    alignItems: "flex-end",
    justifyContent: mine ? "flex-end" : "flex-start",
    gap: "6px",
    marginTop: compact ? 4 : 8,
    marginBottom: 10,
  });

  return (
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
        const renderedText = decryptText(m.content);
        const createdAtText = m.createdAt
          ? new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <div key={m._id} style={rowStyle(mine, compact)}>
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
            >
              
              <Box
                className="message-bubble"
                position="relative"
                role="group"
                alignSelf={mine ? "flex-end" : "flex-start"}
              >
                {mine && (
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<ChevronDownIcon />}
                      size="xs"
                      variant="ghost"
                      position="absolute"
                      top="-8px"
                      right="-10px"
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
                        onClick={() => handleDeleteMessage(m._id)}
                      >
                        Delete Message
                      </MenuItem>
                    </MenuList>
                  </Menu>
                )}

                <Box {...bubbleStyle(mine)}>
                  {renderedText}
                </Box>
              </Box>
              <Text
                mt={1}
                fontSize="xs"
                color="gray.400"
                textAlign={mine ? "right" : "left"}
                alignSelf={mine ? "flex-end" : "flex-start"}
              >
                {createdAtText}
              </Text>

              {reactionSummary.length > 0 && (
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
            </Box>
          </div>
        );
      })}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
