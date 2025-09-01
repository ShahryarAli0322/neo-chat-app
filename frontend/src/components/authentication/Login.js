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
} from "@chakra-ui/react";
import axios from "axios";
import { useHistory } from "react-router-dom";

const Login = () => {
  const history = useHistory();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  
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
    <VStack spacing="10px" w="100%">
      <FormControl id="login-email" isRequired>
        <FormLabel>Email Address</FormLabel>
        <Input
          type="email"
          placeholder="Enter Your Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormControl>

      <FormControl id="login-password" isRequired>
        <FormLabel>Password</FormLabel>
        <InputGroup>
          <Input
            type={show ? "text" : "password"}
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={toggleShow}>
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        colorScheme="blue"
        width="100%"
        mt={3}
        onClick={submitHandler}
        isLoading={loading}
      >
        Login
      </Button>

      {/* Forgot Password link */}
        <Button variant="link" onClick={() => history.push("/forgot-password")}>
        Forgot password?
       </Button> 

      {unverifiedEmail && (
        <Box
          bg="red.50"
          border="1px"
          borderColor="red.200"
          p={3}
          mt={3}
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
  );
};

export default Login;
