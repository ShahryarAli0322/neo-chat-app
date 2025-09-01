import CryptoJS from "crypto-js";

// Use a shared secret
const SECRET_KEY = process.env.REACT_APP_E2EE_SECRET || "neoChatSuperSecretKey123";

/* Encrypt plain text into AES ciphertext */
export const encryptText = (plainText) => {
  try {
    return CryptoJS.AES.encrypt(plainText, SECRET_KEY).toString();
  } catch (err) {
    console.error("Encryption error:", err);
    return plainText; 
  }
};

/**
 * Decrypt AES ciphertext back into plain text
 * - Handles legacy/plain text gracefully
 */
export const decryptText = (cipherText) => {
  try {
    if (!cipherText || typeof cipherText !== "string") return "";

    
    const looksEncrypted =
      cipherText.includes(":") || /^[A-Za-z0-9+/=]+$/.test(cipherText);

    if (!looksEncrypted) {
      return cipherText;
    }

    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    return decrypted || cipherText; 
  } catch (err) {
    console.warn("Decryption failed, showing raw text:", err);
    return cipherText; 
  }
};
