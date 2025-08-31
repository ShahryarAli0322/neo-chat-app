// src/components/ScrollableChat.jsx
import React, { useState } from "react";
import ScrollableFeed from "react-scrollable-feed";
import { Avatar, Box, Button, Tooltip } from "@chakra-ui/react";
import axios from "axios";
import { ChatState } from "../Context/ChatProvider";
import { isLastMessage, isSameSender } from "../config/ChatLogics";
import { decryptText } from "../utils/crypto"; // ✅ use unified decryptor

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "👎"];

const ScrollableChat = ({ messages, setMessages }) => {
  const { user } = ChatState();
  const [openPickerFor, setOpenPickerFor] = useState(null);

  const authConfig = () => ({
    headers: { Authorization: `Bearer ${user?.token}` },
  });

  // Aggregate reactions per message
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
        // remove my reaction
        const { data } = await axios.delete("/api/message/reaction", {
          ...authConfig(),
          data: { messageId: message._id },
        });
        updateMessageInList(data);
      } else {
        // add/swap my reaction
        const { data } = await axios.post(
          "/api/message/reaction",
          { messageId: message._id, emoji },
          authConfig()
        );
        updateMessageInList(data);
      }
    } catch {
      // optional: toast here
    } finally {
      setOpenPickerFor(null);
    }
  };

  // ✅ FIXED: message bubble style
  const bubbleStyle = (mine) => ({
    backgroundColor: mine ? "#BEE3F8" : "#B9F5D0",
    borderRadius: "18px",
    padding: "6px 12px",
    maxWidth: "75%",
    whiteSpace: "pre-wrap",       // ✅ preserves normal text wrapping
    overflowWrap: "break-word",   // ✅ wraps long words properly
    wordBreak: "break-word",
    display: "inline-block",      // ✅ keeps bubble inline
    fontSize: "15px",             // ✅ consistent size
    lineHeight: "1.4",            // ✅ prevents cramped/broken text
  });

  const rowStyle = (mine) => ({
    display: "flex",
    alignItems: "flex-end",
    justifyContent: mine ? "flex-end" : "flex-start",
    gap: "6px",
    marginTop: 7,
  });

  return (
    <ScrollableFeed>
      {messages?.map((m, i) => {
        const mine = String(m.sender?._id) === String(user._id);
        const showAvatar =
          (isSameSender(messages, m, i, user._id) ||
            isLastMessage(messages, i, user._id)) &&
          !mine;

        const { list: reactionSummary } = summarizeReactions(m.reactions);
        const renderedText = decryptText(m.content);

        return (
          <div key={m._id} style={rowStyle(mine)}>
            {/* Left avatar for OTHER user's messages */}
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

            {/* Message bubble + reactions */}
            <Box display="flex" flexDir="column" alignItems={mine ? "flex-end" : "flex-start"}>
              <Box style={bubbleStyle(mine)}>{renderedText}</Box>

              {/* Reactions list */}
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

              {/* Emoji picker */}
              <Box mt={1} display="flex" gap="6px" alignItems="center">
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    setOpenPickerFor((cur) => (cur === m._id ? null : m._id))
                  }
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
