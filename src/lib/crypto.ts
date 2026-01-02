export const ENCRYPTION_KEY_STORAGE_KEY = 'coe_db_master_key';

// Generate a random 256-bit key for AES-GCM
export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key to base64 string for storage
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from base64 string
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const binaryString = atob(base64Key);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    'raw',
    bytes,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Get or create the master key
export async function getMasterKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
  if (stored) {
    return importKey(stored);
  }
  const key = await generateKey();
  const exported = await exportKey(key);
  localStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, exported);
  return key;
}

// Encrypt data (returns filter-friendly object with encrypted fields)
// We use a fixed IV size (12 bytes) prepended to the ciphertext
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  try {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoded
    );

    // Combine IV and Ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return 'ENC:' + btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Encryption failed:', e);
    return data; // Fallback to plain
  }
}

export async function decryptData(encryptedStr: string, key: CryptoKey): Promise<string> {
  if (!encryptedStr || typeof encryptedStr !== 'string' || !encryptedStr.startsWith('ENC:')) {
    return encryptedStr;
  }
  
  try {
    const base64 = encryptedStr.slice(4);
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.warn('Decryption failed, returning original:', e);
    return encryptedStr;
  }
}
