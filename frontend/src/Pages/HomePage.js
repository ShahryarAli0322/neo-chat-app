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
        display="flex"
        justifyContent="center"
        bg="white"
        p={3}
        w="100%"
        m="40px 0 15px 0"
        borderRadius="lg"
        borderWidth="1px"
      >
        <Text fontSize="2xl" fontWeight="bold" fontFamily="Work Sans" color="black">
          Neo Chat
        </Text>
      </Box>

      {/* Tabs Section */}
      <Box
        bg="white"
        w="100%"
        p={4}
        borderRadius="lg"
        borderWidth="1px"
      >
        <Tabs index={tabIndex} onChange={(index) => setTabIndex(index)} isFitted variant="enclosed">
          <TabList mb="1em">
            <Tab>Login</Tab>
            <Tab>Sign Up</Tab>
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
