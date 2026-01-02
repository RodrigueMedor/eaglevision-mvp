const express = require('express');
const router = express.Router();
const { handleDocusignWebhook } = require('../services/docusign');
const { verifyDocusignSignature } = require('../middleware/docusign');
const rateLimit = require('express-rate-limit');

// Rate limiting configuration
// Production rate limiting for webhooks
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX_WEBHOOKS || 100,
  message: JSON.stringify({
    error: 'rate_limit_exceeded',
    message: 'Too many requests, please try again later',
    retryAfter: '15 minutes'
  }),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for DocuSign's IP ranges
  skip: (req) => {
    const docuSignIps = [
      // Add DocuSign's production IP ranges here
      '104.192.0.0/13',
      '104.198.0.0/16',
      '13.107.6.152/31',
      '13.107.18.10/31',
      '13.107.128.0/22',
      '23.103.160.0/20',
      '40.96.0.0/13',
      '40.104.0.0/15',
      '40.107.0.0/16',
      '40.126.0.0/18'
    ];
    
    const clientIp = req.ip || req.connection.remoteAddress;
    return docuSignIps.some(ipRange => {
      const [subnet, mask] = ipRange.split('/');
      return isIpInSubnet(clientIp, subnet, parseInt(mask, 10));
    });
  }
});

// Helper function to check if IP is in subnet
function isIpInSubnet(ip, subnet, mask) {
  const ipParts = ip.split('.').map(Number);
  const subnetParts = subnet.split('.').map(Number);
  
  for (let i = 0; i < 4; i++) {
    const maskByte = mask > 0 ? (mask >= 8 ? 255 : 256 - (1 << (8 - mask))) : 0;
    if ((ipParts[i] & maskByte) !== (subnetParts[i] & maskByte)) {
      return false;
    }
    mask -= 8;
    if (mask < 0) mask = 0;
  }
  return true;
}

/**
 * @route POST /api/webhooks/docusign
 * @desc Handle DocuSign webhook events
 * @access Public (but secured with signature verification)
 */
router.post('/docusign', 
  webhookLimiter,
  express.json({ type: 'application/json' }),
  verifyDocusignSignature,
  async (req, res) => {
    try {
      const event = req.body;
      const result = await handleDocusignWebhook(event);
      res.status(200).json(result);
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }
);

module.exports = router;
