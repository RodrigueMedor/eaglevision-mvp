const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read the .env file
const envPath = path.join(__dirname, '..', '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Update the DOCUSIGN_WEBHOOK_URL to use the full URL
const apiUrl = 'https://api.eaglevisionedge.com';
const updatedContent = envContent.replace(
  /DOCUSIGN_WEBHOOK_URL=.*/,
  `DOCUSIGN_WEBHOOK_URL=${apiUrl}/api/webhooks/docusign`
);

// Write the updated content back to .env
fs.writeFileSync(envPath, updatedContent);
console.log('✅ Updated .env with full webhook URL');

// Run the webhook test
console.log('\n🚀 Running webhook test...\n');
try {
  const result = execSync('node scripts/test-webhook.js', { stdio: 'inherit' });
  console.log('\n✅ Webhook test completed successfully!');
} catch (error) {
  console.error('\n❌ Webhook test failed:', error.message);
}

// Restore the original content
fs.writeFileSync(envPath, envContent);
console.log('\n🔧 Restored original .env configuration');
