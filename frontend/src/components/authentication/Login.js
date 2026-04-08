import React, { useState } from "react";
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Text,
  useToast,
  Box,
  Flex,
  Heading,
  Stack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import axios from "axios";
import { useHistory } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider";

const Login = () => {
  const history = useHistory();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
const { setUser } = ChatState();

  
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const toggleShow = () => setShow((s) => !s);

  const submitHandler = async () => {
    if (!email || !password) {
      toast({
        title: "Please fill all the fields",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        "/api/user/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      localStorage.setItem("userInfo", JSON.stringify(data));

      toast({
        title: "Login successful",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setUser(data);              // immediately data show 


      history.push("/chats");
    } catch (error) {
      const msg =
        error?.response?.data?.message || "Login failed. Please try again.";

      toast({
        title: "Error occurred",
        description: msg,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });

      if (msg.toLowerCase().includes("verify your email")) {
        setUnverifiedEmail(email);
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      await axios.post(
        "/api/user/resend-verification",
        { email: unverifiedEmail },
        { headers: { "Content-Type": "application/json" } }
      );

      toast({
        title: "Verification email resent",
        description: "Please check your inbox (and spam).",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Failed to resend",
        description:
          error?.response?.data?.message ||
          "Could not resend verification email.",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  return (
    <Flex minH="70vh" align="center" justify="center" w="100%">
      <Box
        layerStyle="glass"
        as={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        p={{ base: 7, md: 8 }}
        borderRadius="3xl"
        boxShadow="0 20px 60px rgba(0,0,0,0.4)"
        border="1px solid rgba(255,255,255,0.08)"
        w="100%"
        maxW="md"
      >
        <Stack spacing={6}>
          <Box textAlign="center">
            <Heading fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" mb={1}>
              Welcome Back
            </Heading>
            <Text color="gray.400" fontSize="sm">
              Sign in to continue to Neo Chat
            </Text>
          </Box>

          <VStack spacing={4} w="100%">
            <FormControl id="login-email" isRequired>
              <FormLabel>Email Address</FormLabel>
              <Input
                variant="filled"
                h="50px"
                type="email"
                placeholder="Enter Your Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                _placeholder={{ color: "gray.400" }}
                _focus={{
                  boxShadow: "0 0 0 2px #7B61FF",
                  bg: "whiteAlpha.300",
                }}
              />
            </FormControl>

            <FormControl id="login-password" isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup>
                <Input
                  variant="filled"
                  h="50px"
                  type={show ? "text" : "password"}
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  _placeholder={{ color: "gray.400" }}
                  _focus={{
                    boxShadow: "0 0 0 2px #7B61FF",
                    bg: "whiteAlpha.300",
                  }}
                />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={toggleShow}>
                    {show ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Button
              variant="gradient"
              width="100%"
              h="50px"
              mt={1}
              onClick={submitHandler}
              isLoading={loading}
              transition="all 0.3s ease"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              }}
            >
              Login
            </Button>

            <Button variant="link" onClick={() => history.push("/forgot-password")}>
              Forgot password?
            </Button>

            {unverifiedEmail && (
              <Box
                bg="red.50"
                border="1px"
                borderColor="red.200"
                p={3}
                mt={2}
                borderRadius="md"
                w="100%"
                textAlign="center"
              >
                <Text color="red.500" fontWeight="semibold" mb={2}>
                  Your email is not verified.
                </Text>
                <Button variant="link" colorScheme="blue" onClick={resendVerification}>
                  Resend verification email
                </Button>
              </Box>
            )}
          </VStack>
        </Stack>
      </Box>
    </Flex>
  );
};

export default Login;
