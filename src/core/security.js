/**
 * CareerForge AI — Cryptographic Security Core
 * Implements hardware-accelerated AES-256-GCM encryption and PBKDF2 key derivation.
 * 100% interoperable with WebCrypto in browser clients.
 */

const crypto = require('crypto');

class SecurityService {
  /**
   * Derive a 256-bit AES key from a passcode and salt using PBKDF2 (SHA-256)
   */
  static deriveKey(passcode, salt) {
    return crypto.pbkdf2Sync(passcode, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt a JSON object with AES-256-GCM
   * @param {Object} data - Payload to encrypt
   * @param {string} passcode - User master passcode
   * @returns {Object} { salt, iv, authTag, ciphertext } as hex strings
   */
  static encryptPayload(data, passcode) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const derivedKey = this.deriveKey(passcode, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    
    let ciphertext = cipher.update(text, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext
    };
  }

  /**
   * Decrypt an AES-256-GCM package
   * @param {Object} pkg - { salt, iv, authTag, ciphertext } (hex)
   * @param {string} passcode - Master passcode
   * @returns {Object} Decrypted JSON object
   */
  static decryptPayload(pkg, passcode) {
    const salt = Buffer.from(pkg.salt, 'hex');
    const iv = Buffer.from(pkg.iv, 'hex');
    const authTag = Buffer.from(pkg.authTag, 'hex');
    const derivedKey = this.deriveKey(passcode, salt);

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(pkg.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

module.exports = SecurityService;
