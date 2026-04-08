import React, { useState, useEffect } from 'react'
import { Container, Box, Text, Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react"
import Login from "../components/authentication/Login";
import Signup from "../components/authentication/Signup";
import { useHistory } from 'react-router-dom';

const HomePage = () => {
  const history = useHistory();
  
  useEffect(() => {
    
    const user = JSON.parse(localStorage.getItem("userInfo")); 
    
    if (user) history.push('/chats');
  }, [history]);

  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Container maxW="md" centerContent>
      {/* Title Section */}
      <Box
        as="div"
        bg="whiteAlpha.900"
        color="black"
        px={6}
        py={3}
        borderRadius="2xl"
        boxShadow="0 10px 30px rgba(0,0,0,0.2)"
        textAlign="center"
        w="fit-content"
        mx="auto"
        mt="40px"
        mb={6}
        _hover={{ boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}
      >
        <Text fontSize="2xl" fontWeight="semibold" fontFamily="Work Sans">
          Neo Chat
        </Text>
      </Box>

      {/* Tabs Section */}
      <Box
        layerStyle="glass"
        w="100%"
        p={5}
        borderRadius="2xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.4)"
        border="1px solid rgba(255,255,255,0.08)"
      >
        <Tabs
          index={tabIndex}
          onChange={(index) => setTabIndex(index)}
          isFitted
          variant="soft-rounded"
        >
          <TabList mb="1em" gap={2}>
            <Tab
              _selected={{ bg: "whiteAlpha.200", borderRadius: "lg", fontWeight: "semibold" }}
              opacity={0.85}
              px={4}
              py={2}
            >
              Login
            </Tab>
            <Tab
              _selected={{ bg: "whiteAlpha.200", borderRadius: "lg", fontWeight: "semibold" }}
              opacity={0.85}
              px={4}
              py={2}
            >
              Sign Up
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Login />
            </TabPanel>
            <TabPanel>
              <Signup />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  )
}

export default HomePage
