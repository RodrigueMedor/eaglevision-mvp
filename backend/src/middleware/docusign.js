const crypto = require('crypto');

/**
 * Middleware to verify DocuSign webhook signature
 */
const verifyDocusignSignature = (req, res, next) => {
  try {
    const signature = req.get('X-DocuSign-Signature');
    const hmac = crypto.createHmac('sha256', process.env.DOCUSIGN_WEBHOOK_SECRET || '');
    const digest = hmac.update(JSON.stringify(req.body)).digest('base64');
    
    if (signature !== digest) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
  } catch (error) {
    console.error('Signature verification error:', error);
    return res.status(500).json({ error: 'Error verifying signature' });
  }
};

module.exports = { verifyDocusignSignature };
