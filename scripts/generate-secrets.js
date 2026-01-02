const crypto = require('crypto');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

const secrets = {
  JWT_SECRET: generateSecret(),
  SESSION_SECRET: generateSecret(),
  DOCUSIGN_WEBHOOK_SECRET: generateSecret(32),
  SENDGRID_API_KEY: 'your_sendgrid_api_key_here' // Replace with actual key
};

console.log('Copy these secrets to your .env file:');
console.log('------------------------------------');
Object.entries(secrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});
console.log('------------------------------------');
console.log('IMPORTANT: Keep these secrets secure and never commit them to version control!');
