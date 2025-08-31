import {
  Avatar,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Input,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { BellIcon, ChevronDownIcon, SearchIcon } from "@chakra-ui/icons";
import React, { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import ProfileModal from "./ProfileModal";
import EditProfileModal from "./EditProfileModal"; 
import { useHistory } from "react-router-dom";
import ChatLoading from "../ChatLoading";
import axios from "axios";
import UserListItem from "../UserAvatar/UserListItem";

const SideDrawer = () => {
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const {
    user,
    setSelectedChat,
    chats,
    setChats,
    notification,
    setNotification,
  } = ChatState();

  const history = useHistory();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const handleSearch = async () => {
    if (!search) {
      toast({
        title: "Please Enter something in search",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(`/api/user?search=${search}`, config);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occurred",
        description:
          error.response?.data?.message || "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    } finally {
      setLoading(false);
    }
  };

  const accessChat = async (userId) => {
    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post("/api/chat", { userId }, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);

      setSelectedChat(data);
      onClose();
    } catch (error) {
      toast({
        title: "Error fetching this chat",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    } finally {
      setLoadingChat(false);
    }
  };

  const openFromNotification = (notif) => {
    setSelectedChat(notif.chat);
    setNotification((prev) => prev.filter((n) => n._id !== notif._id));
  };

  const notifLabel = (n) => {
    const senderName = n?.sender?.name || "Someone";
    if (n?.chat?.isGroupChat) {
      return `From ${senderName} in ${n.chat.chatName}`;
    }
    return `From ${senderName}`;
  };

  const notifCount = notification?.length || 0;

  return (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bg="white"
        w="100%"
        p="5px 10px"
        borderWidth="1px"
        borderColor="gray.200"
      >
        {/* Search button */}
        <Tooltip label="Search Users to Chat" hasArrow placement="bottom-end">
          <Button variant="ghost" onClick={onOpen}>
            <SearchIcon color="black" />
            <Text px="4" display={{ base: "none", md: "flex" }}>
              Search User
            </Text>
          </Button>
        </Tooltip>

        <Text fontSize="2xl" fontFamily="Work Sans">
          Neo Chat
        </Text>

        <HStack spacing={2}>
          {/* Notifications */}
          <Menu>
            <MenuButton as={Button} variant="ghost" p={1} position="relative">
              <BellIcon boxSize={6} />
              {notifCount > 0 && (
                <Badge
                  colorScheme="red"
                  borderRadius="full"
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  fontSize="0.7em"
                  px="1.5"
                >
                  {notifCount}
                </Badge>
              )}
            </MenuButton>
            <MenuList maxW="320px">
              <Text px={3} py={2} fontWeight="semibold">
                Notifications
              </Text>
              <MenuDivider />
              {notifCount === 0 ? (
                <Text px={3} py={2} color="gray.500">
                  No new messages
                </Text>
              ) : (
                notification.map((n) => (
                  <MenuItem key={n._id} onClick={() => openFromNotification(n)}>
                    {notifLabel(n)}
                  </MenuItem>
                ))
              )}
            </MenuList>
          </Menu>

          {/* Profile menu */}
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} p={1}>
              <Avatar
                size={"sm"}
                cursor={"pointer"}
                name={user.name}
                src={user.pic}
              />
            </MenuButton>
            <MenuList>
              {/* View-only profile */}
              <ProfileModal user={user} mode="view">
                <MenuItem>My Profile</MenuItem>
              </ProfileModal>

              {/* Edit profile */}
              <EditProfileModal>
                <MenuItem>Edit Profile</MenuItem>
              </EditProfileModal>

              <MenuDivider />
              <MenuItem onClick={logoutHandler}>Logout</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>

      {/* Drawer for search */}
      <Drawer placement="left" onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader borderBottomWidth={"1px"}>Search Users</DrawerHeader>
          <DrawerBody>
            <Box display={"flex"} pb={2}>
              <Input
                placeholder={"Search by name or email"}
                mr={2}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
              />
              <Button onClick={handleSearch}>Go</Button>
            </Box>

            {loading ? (
              <ChatLoading />
            ) : (
              searchResult?.map((u) => (
                <UserListItem
                  key={u._id}
                  user={u}
                  handleFunction={() => accessChat(u._id)}
                />
              ))
            )}
            {loadingChat && <Spinner ml={"auto"} display={"flex"} />}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SideDrawer;
