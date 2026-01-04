const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate secrets
const secrets = {
  JWT_SECRET: generateSecret(),
  SESSION_SECRET: generateSecret(),
  DOCUSIGN_WEBHOOK_SECRET: generateSecret(32),
  // These should be set in your Netlify environment variables
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || 'set_this_in_netlify_dashboard',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@eaglevisionedge.com',
  NODE_ENV: process.env.NODE_ENV || 'production'
};

// Create .env.example if it doesn't exist
const envExamplePath = path.join(__dirname, '..', '.env.example');
if (!fs.existsSync(envExamplePath)) {
  const exampleContent = Object.keys(secrets)
    .map(key => `${key}=`)
    .join('\n');
  fs.writeFileSync(envExamplePath, exampleContent);
  console.log('Created .env.example file');
}

// Only log the generated secrets, not the environment ones
const { SENDGRID_API_KEY, EMAIL_FROM, NODE_ENV, ...generatedSecrets } = secrets;

console.log('Copy these generated secrets to your .env file and Netlify environment variables:');
console.log('------------------------------------');
Object.entries(generatedSecrets).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});
console.log('\nSet these environment variables in your Netlify dashboard:');
console.log('SENDGRID_API_KEY=your_sendgrid_api_key');
console.log('EMAIL_FROM=your_email@example.com');
console.log('NODE_ENV=production');
console.log('------------------------------------');
console.log('IMPORTANT: Never commit .env to version control!');
console.log('           Add .env to your .gitignore file if not already present.');
