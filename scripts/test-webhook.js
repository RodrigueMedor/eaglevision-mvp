require('dotenv').config();
const crypto = require('crypto');
const https = require('https');

// Configuration
// Expand environment variables in the URL
const expandEnvVars = (str) => {
  return str.replace(/\${(\w+)}/g, (_, varName) => process.env[varName] || '');
};

const webhookUrl = expandEnvVars(process.env.DOCUSIGN_WEBHOOK_URL);
const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;

if (!webhookUrl) {
  console.error('❌ Error: DOCUSIGN_WEBHOOK_URL is not set or invalid');
  process.exit(1);
}

if (!webhookSecret) {
  console.error('❌ Error: DOCUSIGN_WEBHOOK_SECRET is not set');
  process.exit(1);
}

console.log('Using webhook URL:', webhookUrl);

// Sample DocuSign webhook payload (simplified)
const payload = {
  event: 'envelope-sent',
  api_version: '2.0',
  uri: '/envelopes/12345',
  retry_count: '0',
  configuration_id: '123456',
  generated_date_time: new Date().toISOString(),
  data: {
    account_id: process.env.DOCUSIGN_ACCOUNT_ID,
    envelope_id: 'test-envelope-123',
    status: 'sent'
  }
};

// Calculate HMAC signature
const hmac = crypto.createHmac('sha256', webhookSecret);
const signature = hmac.update(JSON.stringify(payload)).digest('base64');

// Request options
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-DocuSign-Signature': signature
  }
};

console.log(`Testing webhook endpoint: ${webhookUrl}\n`);
console.log('Sending test payload:', JSON.stringify(payload, null, 2));

// Send the request
const req = https.request(webhookUrl, options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
    console.log('Response Body:', responseData);
    
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✅ Webhook test successful!');
    } else {
      console.log('\n❌ Webhook test failed');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

// Send the request
req.write(JSON.stringify(payload));
req.end();
