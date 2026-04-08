import React, { useEffect, useState, useCallback } from 'react'
import { ChatState } from '../Context/ChatProvider';
import { Box, Button, Stack, useToast, Text } from '@chakra-ui/react';
import axios from 'axios';
import { AddIcon } from '@chakra-ui/icons';
import ChatLoading from './ChatLoading';
import { getSender } from '../config/ChatLogics';
import GroupChatModal from './miscellaneous/GroupChatModal';

const MyChats = ({ fetchAgain }) => {
    const [loggedUser, setLoggedUser] = useState();
    const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();
    const toast = useToast();

    const fetchChats = useCallback(async () => {
        try {
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const { data } = await axios.get("/api/chat", config);
            setChats(data);
        } catch (error) {
            toast({
                title: "Error Occurred",
                description: "Failed to Load the Search Results",
                status: "error",
                duration: 5000,
                isClosable: true,
                position: "bottom-left",
            });
        }
    }, [user.token, setChats, toast]);

    useEffect(() => {
        setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
        fetchChats();
    }, [fetchChats]);

    return (
        <Box
            display={{ base: selectedChat ? "none" : "flex", md: "flex" }}
            flexDir={"column"}
            alignItems={"stretch"}
            p={4}
            bg="whiteAlpha.100"
            border="1px solid rgba(255,255,255,0.08)"
            boxShadow="0 10px 30px rgba(0,0,0,0.3)"
            w={{ base: "100%", md: "31%" }}
            borderRadius={"2xl"}
            gap={3}
            h={{ base: "unset", md: "100%" }}
        >
            <Box
                pb={1}
                px={1}
                fontSize="xl"
                fontWeight="semibold"
                color="white"
                opacity={0.9}
                display={"flex"}
                w={"100%"}
                justifyContent={"space-between"}
                alignItems={"center"}
            >
                <Text>My Chats</Text>
                <GroupChatModal>
                    <Button
                        variant="gradient"
                        rightIcon={<AddIcon />}
                        size="sm"
                    >
                        New Group Chat
                    </Button>
                </GroupChatModal>
            </Box>
            <Box
                display="flex"
                flexDir={"column"}
                p={2}
                bg={"transparent"}
                w={"100%"}
                h={"100%"}
                borderRadius={"lg"}
                overflowY="hidden"
            >
                {chats ? (
                    <Stack
                        spacing={2}
                        overflowY='scroll'
                        css={{
                            '&::-webkit-scrollbar': { width: '6px' },
                            '&::-webkit-scrollbar-thumb': { background: '#4A5568', borderRadius: '10px' },
                            '-ms-overflow-style': 'none',
                            'scrollbar-width': 'none',
                        }}
                    >
                        {chats.map((chat) => (
                            <Box
                                onClick={() => setSelectedChat(chat)}
                                bg={selectedChat === chat ? "whiteAlpha.300" : "whiteAlpha.100"}
                                color="gray.100"
                                px={3}
                                py={2}
                                borderRadius={"lg"}
                                key={chat._id}
                                transition="all 0.2s ease"
                                _hover={{ bg: "whiteAlpha.200", cursor: "pointer", transform: "scale(1.02)" }}
                            >
                                <Text>
                                    {!chat.isGroupChat && loggedUser
                                        ? getSender(loggedUser, chat.users)
                                        : chat.chatName}
                                </Text>
                            </Box>
                        ))}
                    </Stack>
                ) : (
                    <ChatLoading />
                )}
            </Box>
        </Box>
    );
};

export default MyChats;