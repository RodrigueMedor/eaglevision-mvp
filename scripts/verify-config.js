require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verifying Production Configuration...\n');

// 1. Check required environment variables
const requiredVars = [
  'NODE_ENV',
  'FRONTEND_URL',
  'API_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
  'DOCUSIGN_CLIENT_ID',
  'DOCUSIGN_WEBHOOK_SECRET',
  'SENDGRID_API_KEY'
];

console.log('✅ Environment Variables:');
let allVarsPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✓' : '✗';
  if (!value) allVarsPresent = false;
  console.log(`   ${status} ${varName} = ${value ? '***' + value.slice(-4) : 'MISSING'}`);
});

// 2. Check private key file
const privateKeyPath = path.resolve(process.env.DOCUSIGN_PRIVATE_KEY_PATH || '');
let privateKeyExists = false;
try {
  privateKeyExists = fs.existsSync(privateKeyPath);
} catch (e) {
  console.error('   ✗ Error checking private key file');
}

console.log('\n🔑 Private Key Check:');
console.log(`   ${privateKeyExists ? '✓' : '✗'} Private key exists at: ${privateKeyPath}`);

// 3. Verify URLs
console.log('\n🌐 URL Configuration:');
const urls = {
  'Frontend': process.env.FRONTEND_URL,
  'API': process.env.API_URL,
  'DocuSign API': process.env.DOCUSIGN_API_BASE_URL
};

Object.entries(urls).forEach(([name, url]) => {
  const isHttps = url?.startsWith('https://');
  console.log(`   ${isHttps ? '✓' : '✗'} ${name}: ${url} ${!isHttps ? '(should use HTTPS)' : ''}`);
});

// 4. Final status
console.log('\n🔒 Security Check:');
const isProduction = process.env.NODE_ENV === 'production';
console.log(`   ${isProduction ? '✓' : '✗'} Running in ${isProduction ? 'PRODUCTION' : 'development'} mode`);

if (!allVarsPresent || !privateKeyExists || !isProduction) {
  console.log('\n❌ Configuration issues found. Please check the output above.');
  process.exit(1);
}

console.log('\n🎉 All configurations are valid and secure!');
console.log('You can proceed with the deployment.\n');
