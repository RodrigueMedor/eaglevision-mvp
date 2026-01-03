const fs = require('fs');
const path = require('path');

// Required environment variables
const requiredVars = [
  'NODE_ENV',
  'FRONTEND_URL',
  'API_URL',
  'JWT_SECRET',
  'DOCUSIGN_INTEGRATION_KEY',
  'DOCUSIGN_USER_ID',
  'DOCUSIGN_ACCOUNT_ID',
  'DOCUSIGN_API_BASE_URL',
  'DOCUSIGN_AUTH_SERVER',
  'DOCUSIGN_WEBHOOK_SECRET'
];

// Optional environment variables with defaults
const optionalVars = {
  'EMAIL_FROM': 'noreply@eaglevisionedge.com',
  'EMAIL_SERVICE': 'gmail',
  'COOKIE_DOMAIN': 'localhost'
};

console.log('🔍 Verifying environment configuration...\n');

// Check required variables
let hasErrors = false;
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    hasErrors = true;
  } else if (process.env[varName].includes('YOUR_') || process.env[varName] === '') {
    console.error(`⚠️  Environment variable ${varName} appears to be using a placeholder value`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName} is set`);
  }
}

// Check optional variables
console.log('\n🔧 Optional variables:');
for (const [varName, defaultValue] of Object.entries(optionalVars)) {
  const value = process.env[varName] || `[using default: ${defaultValue}]`;
  console.log(`   ${varName}: ${value}`);
}

// Check for large variables
const largeVars = [];
for (const [key, value] of Object.entries(process.env)) {
  if (value && value.length > 500) {
    largeVars.push({
      name: key,
      size: `${Math.round(value.length / 1024)}KB`
    });
  }
}

if (largeVars.length > 0) {
  console.log('\n⚠️  Large environment variables detected (over 0.5KB):');
  for (const { name, size } of largeVars) {
    console.log(`   ${name}: ${size}`);
    if (name === 'FIREBASE_SERVICE_ACCOUNT' || name === 'DOCUSIGN_PRIVATE_KEY') {
      console.log('      This variable should be loaded from a secure source at runtime');
    }
  }
}

// Check total environment size
const totalSize = JSON.stringify(process.env).length / 1024;
console.log(`\n📊 Total environment size: ${totalSize.toFixed(2)}KB`);
if (totalSize > 3.5) { // 3.5KB to leave some buffer
  console.error(`❌ Environment size exceeds recommended 4KB limit for Netlify Functions`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Configuration issues found. Please fix the above errors before deploying.');
  process.exit(1);
} else {
  console.log('\n🎉 Environment configuration looks good!');}
