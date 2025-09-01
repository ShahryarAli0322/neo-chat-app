import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useParams, useHistory } from "react-router-dom";
import axios from "axios";

const VerifyEmail = () => {
  const { token } = useParams();
  const history = useHistory();
  const toast = useToast();

  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      try {
        const { data } = await axios.get(`/api/user/verify/${token}`);
        if (!isMounted) return;
        setStatus("success");
        setMessage(data?.message || "Email verified successfully.");
        toast({
          title: "Email verified",
          status: "success",
          duration: 4000,
          isClosable: true,
          position: "bottom",
        });
      } catch (err) {
        if (!isMounted) return;
        const msg =
          err.response?.data?.message ||
          "Invalid or expired verification link.";
        setStatus("error");
        setMessage(msg);
        toast({
          title: "Verification failed",
          description: msg,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    };

    verify();
    return () => {
      isMounted = false;
    };
  }, [token, toast]);

  return (
    <Container maxW="md" centerContent>
    
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

      {/* Card */}
      <Box
        bg="white"
        w="100%"
        p={6}
        borderRadius="lg"
        borderWidth="1px"
        textAlign="center"
      >
        {status === "pending" ? (
          <>
            <Spinner size="xl" />
            <Text mt={4} fontSize="lg">
              Verifying your email…
            </Text>
          </>
        ) : (
          <>
            <Text
              fontSize="xl"
              fontWeight="semibold"
              mb={4}
              color={status === "success" ? "green.600" : "red.600"}
            >
              {message}
            </Text>
            <Button colorScheme="blue" onClick={() => history.push("/")}>
              Go to Login
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
};

export default VerifyEmail;
