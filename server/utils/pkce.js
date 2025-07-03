const crypto = require('crypto');

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string
 * @returns {string} - Random string
 */
function generateRandomString(length = 128) {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate PKCE code verifier and challenge
 * @returns {Object} - Object containing code_verifier and code_challenge
 */
function generatePKCE() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return {
    code_verifier: codeVerifier,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  };
}

/**
 * Store PKCE data temporarily (in production, use Redis or similar)
 * For now, we'll use a simple in-memory store
 */
const pkceStore = new Map();

/**
 * Store PKCE data for a user session
 * @param {string} userId - User ID
 * @param {Object} pkceData - PKCE data
 */
function storePKCE(userId, pkceData) {
  pkceStore.set(userId, {
    ...pkceData,
    timestamp: Date.now()
  });
  
  // Clean up old entries after 10 minutes
  setTimeout(() => {
    if (pkceStore.has(userId)) {
      const stored = pkceStore.get(userId);
      if (Date.now() - stored.timestamp > 600000) { // 10 minutes
        pkceStore.delete(userId);
      }
    }
  }, 600000);
}

/**
 * Retrieve and remove PKCE data for a user session
 * @param {string} userId - User ID
 * @returns {Object|null} - PKCE data or null if not found
 */
function retrievePKCE(userId) {
  const data = pkceStore.get(userId);
  if (data) {
    pkceStore.delete(userId);
    return data;
  }
  return null;
}

module.exports = {
  generatePKCE,
  storePKCE,
  retrievePKCE
}; 