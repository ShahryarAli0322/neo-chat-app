import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ViewIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import axios from "axios";
import UserBadgeItem from "../UserAvatar/UserBadgeItem";
import UserListItem from "../UserAvatar/UserListItem";

const UpdateGroupChatModal = ({ fetchAgain, setFetchAgain, fetchMessages }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameLoading, setRenameLoading] = useState(false);

  const { selectedChat, setSelectedChat, user } = ChatState();
  const toast = useToast();

  const authConfig = () => ({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user?.token}`,
    },
  });

  const bumpFetchAgain = () => setFetchAgain(!fetchAgain);

  // Remove user from group (also used to leave group)
  const handleRemove = async (removeUser) => {
    if (!selectedChat?._id || !removeUser?._id) return;
    try {
      setLoading(true);
      const { data } = await axios.put(
        "/api/chat/group/remove",
        { chatId: selectedChat._id, userId: removeUser._id },
        authConfig()
      );

      // If current user removed themselves, clear selection
      if (removeUser._id === user?._id) {
        setSelectedChat(null);
        onClose?.();
      } else {
        setSelectedChat(data);
      }

      bumpFetchAgain();
      fetchMessages?.();
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  // Rename group
  const handleRename = async () => {
    const nextName = groupChatName.trim();
    if (!selectedChat?._id || !nextName) return;

    try {
      setRenameLoading(true);
      const { data } = await axios.put(
        "/api/chat/rename",
        { chatId: selectedChat._id, chatName: nextName },
        authConfig()
      );
      setSelectedChat(data);
      bumpFetchAgain();
      fetchMessages?.();
      setGroupChatName("");
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setRenameLoading(false);
    }
  };

  // Search users
  const handleSearch = async (query) => {
    setSearch(query);
    const q = query.trim();
    if (!q) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/user?search=${encodeURIComponent(q)}`, authConfig());
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add user to group
  const handleAddUser = async (addUser) => {
    if (!selectedChat?._id || !addUser?._id) return;

    if (selectedChat.users.find((u) => u._id === addUser._id)) {
      toast({
        title: "User already in group!",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.put(
        "/api/chat/group/add",
        { chatId: selectedChat._id, userId: addUser._id },
        authConfig()
      );
      setSelectedChat(data);
      bumpFetchAgain();
      fetchMessages?.();
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <IconButton display={{ base: "flex" }} icon={<ViewIcon />} onClick={onOpen} />

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader
            fontSize="2xl"
            fontFamily="Work sans"
            display="flex"
            justifyContent="center"
          >
            {selectedChat?.chatName || "Group"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box display="flex" flexWrap="wrap" pb={3}>
              {selectedChat?.users?.map((u) => (
                <UserBadgeItem key={u._id} user={u} handleFunction={() => handleRemove(u)} />
              ))}
            </Box>

            <FormControl display="flex">
              <Input
                placeholder="Chat Name"
                mb={3}
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
              />
              <Button
                variant="solid"
                colorScheme="teal"
                ml={1}
                isLoading={renameLoading}
                onClick={handleRename}
              >
                Update
              </Button>
            </FormControl>

            <FormControl>
              <Input
                placeholder="Add User to group"
                mb={1}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </FormControl>

            {loading ? (
              <Spinner size="lg" />
            ) : (
              searchResult?.slice(0, 4).map((u) => (
                <UserListItem key={u._id} user={u} handleFunction={() => handleAddUser(u)} />
              ))
            )}
          </ModalBody>

          <ModalFooter>
            <Button onClick={() => handleRemove(user)} colorScheme="red">
              Leave Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
