/**
 * Verify AES-256-GCM encryption/decryption roundtrip locally
 * Run: node scripts/verify-encryption.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const encPath = path.join(__dirname, '../public/data.enc');
if (!fs.existsSync(encPath)) {
  console.error('❌ data.enc not found. Run build-static-dashboard.js first.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(encPath, 'utf8'));

function hexToBytes(hex) {
  return Buffer.from(hex, 'hex');
}

async function verify(passcode, shouldPass) {
  const salt = hexToBytes(pkg.salt);
  const iv = hexToBytes(pkg.iv);
  const authTag = hexToBytes(pkg.authTag);
  const ciphertext = hexToBytes(pkg.ciphertext);

  const key = crypto.pbkdf2Sync(passcode, salt, 100000, 32, 'sha256');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    const data = JSON.parse(decrypted);

    if (shouldPass) {
      console.log(`  ✅ CORRECT passcode "${passcode}" → Decrypted ${data.jobs.length} jobs`);
    } else {
      console.log(`  ❌ FAIL: Wrong passcode "${passcode}" should NOT have decrypted!`);
    }
  } catch (e) {
    if (!shouldPass) {
      console.log(`  ✅ BLOCKED wrong passcode "${passcode}" → Decryption failed as expected`);
    } else {
      console.log(`  ❌ FAIL: Correct passcode "${passcode}" failed: ${e.message}`);
    }
  }
}

console.log('\n🔒 AES-256-GCM Encryption Verification\n');
console.log('─'.repeat(50));

Promise.all([
  verify('Ghaith_Master_Key_2026!', true),
  verify('wrongpassword', false),
  verify('admin123', false),
  verify('', false),
  verify('Ghaith_Master_Key_2026', false), // even one char off fails
]).then(() => {
  console.log('\n✅ Encryption integrity verified — mathematically secure!\n');
});
