const admin = require('firebase-admin');

class SecureConfig {
  static async getFirebaseConfig() {
    if (process.env.APP_ENV === 'development') {
      // In development, use environment variable if available, otherwise try to require the file
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      }
      try {
        return require('../../config/firebase/service-account.json');
      } catch (e) {
        throw new Error('Firebase service account not found. Please set FIREBASE_SERVICE_ACCOUNT or provide service-account.json');
      }
    }
    
    // In production, use environment variable or fetch from secure storage
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    
    throw new Error('Firebase service account configuration not found');
  }

  static getDocusignPrivateKey() {
    if (process.env.APP_ENV === 'development') {
      // In development, try to read from file if env var not set
      if (process.env.DOCUSIGN_PRIVATE_KEY_PATH) {
        return process.env.DOCUSIGN_PRIVATE_KEY_PATH;
      }
      try {
        const fs = require('fs');
        const path = require('path');
        return fs.readFileSync(path.join(__dirname, '../../../src/keys/docusign_private_key.pem'), 'utf8');
      } catch (e) {
        console.warn('DocuSign private key file not found. Using environment variable if available.');
      }
    }
    
    if (!process.env.DOCUSIGN_PRIVATE_KEY_PATH) {
      throw new Error('DocuSign private key not configured');
    }
    
    return process.env.DOCUSIGN_PRIVATE_KEY_PATH;
  }
}

module.exports = SecureConfig;
