import React, { useState } from 'react'; // Added useState import
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  useToast,
  FormControl,
  Input,
  FormLabel,
  Box,
  VStack,
} from '@chakra-ui/react';
import { ChatState } from '../../Context/ChatProvider';
import axios from 'axios';
import UserListItem from '../UserAvatar/UserListItem';
import UserBadgeItem from '../UserAvatar/UserBadgeItem';

const GroupChatModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState(''); // Added default value
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const { user, chats, setChats } = ChatState(); 


  const handleSearch = async (query) => {
      setSearch(query);
      if (!query) {
        return;
      }
      try {
          setLoading(true);

          const config = {
              headers: {
                  Authorization: `Bearer ${user.token}`,
              },            
          };
          
          const { data } = await axios.get(`/api/user?search=${query}`, config);
          setLoading(false);
          setSearchResult(data);
      } catch (error) {
        toast({
        title: "Error Occured",
        description: "Failed to load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
    }; 
    
    const handleSubmit = async () => {
      if (!groupChatName || selectedUsers.length === 0) {
        toast({
        title: "Please fill all the fields",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
        });
        return;
      }
    try {
      const config = {
              headers: {
                  Authorization: `Bearer ${user.token}`,
              },            
      };
      
      const { data } = await axios.post(
        '/api/chat/group',
        {
          name: groupChatName,
          users: JSON.stringify(selectedUsers.map((users) => users._id)),
        },
        config
      );
      setChats([data, ...chats]);
      onClose();
       toast({
        title: "New Group Chat Created!",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
        });
    }
    catch (error) {
      toast({
        title: "Failed to Create the Chat!",
        description: error.response.data,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
        });
    }
  };  
    const handleDelete = async (delUser) => {
        setSelectedUsers(
            selectedUsers.filter((sel) => sel._id !== delUser._id));
    
  };  
    const handleGroup = async (userToAdd) => {
      if (selectedUsers.includes(userToAdd)) {
        toast({
        title: "User already added",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "top",
        });
          return;
      }
        setSelectedUsers([...selectedUsers, userToAdd]);
  };

  return (
    <>
      <span onClick={onOpen}>{children}</span>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent
          bg="rgba(30,30,40,0.9)"
          color="white"
          borderRadius="xl"
          boxShadow="2xl"
          border="1px solid rgba(255,255,255,0.1)"
        >
          <ModalHeader
            fontSize={"35px"}
            fontFamily={"Work sans"}
            display={"flex"}
            justifyContent={"center"}
            fontWeight="bold"
          >
            Create Group Chat
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel color="gray.200">Group Name</FormLabel>
                <Input
                  variant="filled"
                  placeholder="Enter group name"
                  value={groupChatName}
                  onChange={(e) => setGroupChatName(e.target.value)}
                  mb={1}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.200">Add Users</FormLabel>
                <Input
                  variant="filled"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  mb={1}
                />
              </FormControl>

              <Box>
                {selectedUsers.map(user => (
                  <UserBadgeItem
                    key={user._id}
                    user={user}
                    handleFunction={() => handleDelete(user)}
                  />
                ))}
              </Box>

              {loading ? <div>loading</div> : (
                searchResult?.slice(0, 4).map(user => (
                  <UserListItem
                    key={user._id}
                    user={user}
                    handleFunction={() => handleGroup(user)}
                  />
                ))
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="gradient" onClick={handleSubmit} w="100%">
              Create Group
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default GroupChatModal;