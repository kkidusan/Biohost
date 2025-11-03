// Default 32-byte (256-bit) hex key for AES-256-GCM
const ENCRYPTION_KEY_HEX = process.env.NEXT_PUBLIC_ENCRYPTION_KEY ||
  "4a7d1b9e2c3f8a0d5e6b7c8f9a1d2e3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f";

// Convert hex string to Uint8Array with explicit ArrayBuffer
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function encrypt(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = hexToBytes(ENCRYPTION_KEY_HEX);
  if (keyData.length !== 32) {
    throw new Error("Encryption key must be 256 bits (32 bytes)");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer, // Explicitly cast to ArrayBuffer
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
  const encodedData = encoder.encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, // Explicitly cast to ArrayBuffer
    key,
    encodedData
  );

  // Combine IV and encrypted data, encode as base64
  const ivAndEncrypted = new Uint8Array([...iv, ...new Uint8Array(encrypted)]);
  return btoa(String.fromCharCode(...ivAndEncrypted));
}

export async function decrypt(encryptedData: string): Promise<string> {
  const decoder = new TextDecoder();
  const keyData = hexToBytes(ENCRYPTION_KEY_HEX);
  if (keyData.length !== 32) {
    throw new Error("Encryption key must be 256 bits (32 bytes)");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer, // Explicitly cast to ArrayBuffer
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decode base64 and extract IV and data
  const buffer = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0))
  );
  const iv = buffer.slice(0, 12); // First 12 bytes are the IV
  const data = buffer.slice(12); // Remaining bytes are the encrypted data

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, // Explicitly cast to ArrayBuffer
    key,
    data
  );

  return decoder.decode(decrypted);
}