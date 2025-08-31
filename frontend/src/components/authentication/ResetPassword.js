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
  InputGroup,
  InputRightElement,
  Text,
  useToast,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { useParams, useHistory, Link as RouterLink } from "react-router-dom";

const ResetPassword = () => {
  const { token } = useParams();
  const history = useHistory();
  const toast = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();

    if (!password || !confirm) {
      toast({
        title: "Please fill all the fields.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: "Passwords do not match.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      await axios.post(`/api/user/reset-password/${token}`, { password });
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      history.push("/");
    } catch (error) {
      toast({
        title: "Reset failed",
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
        p={6}
        borderRadius="lg"
        boxShadow="md"
      >
        <Heading as="h2" size="lg" textAlign="center" mb={6}>
          Reset Password
        </Heading>

        <form onSubmit={handleReset}>
          <FormControl id="new-password" isRequired mb={4}>
            <FormLabel>New Password</FormLabel>
            <InputGroup>
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <InputRightElement width="4.5rem">
                <Button
                  h="1.75rem"
                  size="sm"
                  onClick={() => setShowPwd((s) => !s)}
                >
                  {showPwd ? "Hide" : "Show"}
                </Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <FormControl id="confirm-password" isRequired mb={4}>
            <FormLabel>Confirm Password</FormLabel>
            <InputGroup>
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <InputRightElement width="4.5rem">
                <Button
                  h="1.75rem"
                  size="sm"
                  onClick={() => setShowConfirm((s) => !s)}
                >
                  {showConfirm ? "Hide" : "Show"}
                </Button>
              </InputRightElement>
            </InputGroup>
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="100%"
            isLoading={loading}
          >
            Update Password
          </Button>
        </form>

        <Text textAlign="center" mt={4}>
          Back to{" "}
          <ChakraLink as={RouterLink} to="/" color="blue.500">
            Login
          </ChakraLink>
        </Text>
      </Box>
    </Flex>
  );
};

export default ResetPassword;
