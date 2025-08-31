import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  useToast,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Please enter your email.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      await axios.post("/api/user/forgot-password", { email });
      toast({
        title: "Reset link sent",
        description: "Check your email for a password reset link.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Failed to send reset link",
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
    <Flex w={"100%"} align="center" justify="center" >
      <Box
        w="100%"
        maxW="md"
        bg="white"
        p={10}
        borderRadius="lg"
        boxShadow="md"
      >
        <Heading as="h2" size="lg" textAlign="center" mb={6}>
          Forgot Password
        </Heading>

        <form onSubmit={handleSubmit}>
          <FormControl id="forgot-email" isRequired mb={4}>
            <FormLabel>Email Address</FormLabel>
            <Input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="100%"
            isLoading={loading}
          >
            Send Reset Link
          </Button>
        </form>

        <Text textAlign="center" mt={4}>
          Remembered your password?{" "}
          <ChakraLink as={RouterLink} to="/" color="blue.500">
            Back to Login
          </ChakraLink>
        </Text>
      </Box>
    </Flex>
  );
};

export default ForgotPassword;
