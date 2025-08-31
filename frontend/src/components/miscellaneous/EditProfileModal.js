import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  HStack,
  Image,
  Divider,
  Spinner,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import axios from "axios";
import { ChatState } from "../../Context/ChatProvider";

const EditProfileModal = ({ children }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { user, setUser } = ChatState();
  const toast = useToast();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [pic, setPic] = useState("");
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setPic(user.pic || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  }, [isOpen, user]);

  const uploadPic = async (file) => {
    if (!file) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      toast({ title: "Only JPEG or PNG allowed", status: "warning" });
      return;
    }
    try {
      setUploading(true);
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", "Chat-app");
      data.append("cloud_name", "dgfjjbvki");
      const res = await fetch("https://api.cloudinary.com/v1_1/dgfjjbvki/image/upload", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (json?.url) setPic(json.url.toString());
    } catch {
      toast({ title: "Upload failed", status: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmNewPassword) {
      toast({ title: "Passwords do not match", status: "error" });
      return;
    }

    try {
      setSaving(true);
      const payload = { name, bio, pic };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const { data } = await axios.put("/api/user/profile", payload, config);

      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      toast({ title: "Profile updated", status: "success" });
      onClose();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err.response?.data?.message || err.message,
        status: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {children ? (
        <span onClick={onOpen}>{children}</span>
      ) : (
        <Button leftIcon={<EditIcon />} onClick={onOpen}>
          Edit Profile
        </Button>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Bio</FormLabel>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Profile Picture</FormLabel>
                <HStack>
                  <Input type="file" accept="image/*" onChange={(e) => uploadPic(e.target.files?.[0])} />
                  {uploading && <Spinner size="sm" />}
                </HStack>
                {pic && <Image src={pic} boxSize="80px" borderRadius="md" mt={2} />}
              </FormControl>
              <Divider />
              <FormControl>
                <FormLabel>Current Password</FormLabel>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>New Password</FormLabel>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>Confirm New Password</FormLabel>
                <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave} isLoading={saving}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default EditProfileModal;
