import React, { useState } from "react";
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  useToast,
  Image,
  Flex,
  Heading,
  Text,
  Box,
  Stack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import axios from "axios";

const Signup = () => {
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");

  const [pic, setPic] = useState("");
  const [picFile, setPicFile] = useState(null);
  const [picUploading, setPicUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClick = () => setShow((s) => !s);
  const handleClickConfirm = () => setShowConfirm((s) => !s);

  // Upload to Cloudinary (unsigned)
  const postDetails = async (file) => {
    if (!file) {
      toast({ title: "Please select an image!", status: "warning", duration: 3000, isClosable: true, position: "bottom" });
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid image type",
        description: "Please upload a JPEG/PNG/WEBP image.",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setPicUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "Chat-app"); // MUST exist & be unsigned
      data.append("cloud_name", "dgfjjbvki");

      const res = await fetch("https://api.cloudinary.com/v1_1/dgfjjbvki/image/upload", {
        method: "POST",
        body: data,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || "Cloudinary upload failed");
      }

      const imageUrl = json.secure_url || json.url;
      if (!imageUrl) throw new Error("No URL returned from Cloudinary");

      setPic(imageUrl);

      toast({ title: "Image uploaded", status: "success", duration: 2500, isClosable: true, position: "bottom" });
    } catch (err) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: err.message || "Could not upload image",
        status: "error",
        duration: 6000,
        isClosable: true,
        position: "bottom",
      });
      throw err;
    } finally {
      setPicUploading(false);
    }
  };

  // Handle signup
  const submitHandler = async () => {
    if (picUploading) {
      toast({
        title: "Please wait for image upload to finish.",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    setLoading(true);

    if (!name || !email || !password || !confirmpassword) {
      toast({ title: "Please fill all the fields!", status: "warning", duration: 3000, isClosable: true, position: "bottom" });
      setLoading(false);
      return;
    }

    if (password !== confirmpassword) {
      toast({ title: "Passwords do not match!", status: "warning", duration: 3000, isClosable: true, position: "bottom" });
      setLoading(false);
      return;
    }

    // If a file was selected but URL not set yet, finish upload now
    if (picFile && !pic) {
      try {
        await postDetails(picFile);
      } catch {
        setLoading(false);
        return;
      }
    }

    try {
      await axios.post(
        "/api/user",
        { name, email, password, pic }, // send Cloudinary URL (or "")
        { headers: { "Content-Type": "application/json" } }
      );

      // Optional: you can read `data.pic` to confirm server stored the avatar
      // console.log("Signup response:", data);

      toast({
        title: "Registration Successful!",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });

      // If you auto-login after verification, do it elsewhere after verification
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: error?.response?.data?.message || "Signup failed",
        status: "error",
        duration: 6000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
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
              Create Account
            </Heading>
            <Text color="gray.400" fontSize="sm">
              Join Neo Chat and start messaging today
            </Text>
          </Box>

          <VStack spacing={4}>
            <FormControl id="first-name" isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                variant="filled"
                h="50px"
                placeholder="Enter Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                _placeholder={{ color: "gray.400" }}
                _focus={{
                  boxShadow: "0 0 0 2px #7B61FF",
                  bg: "whiteAlpha.300",
                }}
              />
            </FormControl>

            <FormControl id="email" isRequired>
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

            <FormControl id="password" isRequired>
              <FormLabel>Password</FormLabel>
              <InputGroup size="md">
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
                  <Button h="1.75rem" size="sm" onClick={handleClick}>
                    {show ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl id="confirmpassword" isRequired>
              <FormLabel>Confirm Password</FormLabel>
              <InputGroup size="md">
                <Input
                  variant="filled"
                  h="50px"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmpassword}
                  onChange={(e) => setConfirmpassword(e.target.value)}
                  _placeholder={{ color: "gray.400" }}
                  _focus={{
                    boxShadow: "0 0 0 2px #7B61FF",
                    bg: "whiteAlpha.300",
                  }}
                />
                <InputRightElement width="4.5rem">
                  <Button h="1.75rem" size="sm" onClick={handleClickConfirm}>
                    {showConfirm ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <FormControl id="pic">
              <FormLabel>Upload your picture (Optional)</FormLabel>
              <Input
                type="file"
                p={1.5}
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setPicFile(f);
                  setPic("");
                  if (f) postDetails(f);
                }}
              />
              {pic ? (
                <Image
                  src={pic}
                  alt="preview"
                  mt={2}
                  boxSize="60px"
                  borderRadius="full"
                />
              ) : null}
            </FormControl>

            <Button
              variant="gradient"
              width="100%"
              h="50px"
              mt={2}
              onClick={submitHandler}
              isLoading={loading || picUploading}
              loadingText={picUploading ? "Uploading image..." : "Signing up..."}
              isDisabled={picUploading}
              transition="all 0.3s ease"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              }}
            >
              Sign Up
            </Button>
          </VStack>
        </Stack>
      </Box>
    </Flex>
  );
};

export default Signup;
