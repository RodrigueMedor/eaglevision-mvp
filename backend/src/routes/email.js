const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../firebase');
const { logAudit } = require('../utils/audit');

// Initialize the email transporter
let transporter;
require('../config/email')
  .then(t => { transporter = t; })
  .catch(err => console.error('Failed to initialize email transporter:', err));

// Middleware to check if email is configured
const checkEmailConfigured = (req, res, next) => {
  if (!transporter) {
    return res.status(503).json({ 
      error: 'Email service is not available. Please try again later.' 
    });
  }
  next();
};

/**
 * @route POST /api/send-verification-email
 * @desc Send a verification email to the user
 * @access Public
 */
router.post('/send-verification-email', checkEmailConfigured, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Generate a verification token
    const verificationToken = uuidv4();
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 hours expiration

    // Save the token to Firestore
    const verificationDoc = {
      email,
      token: verificationToken,
      expires: tokenExpires,
      used: false,
      createdAt: new Date().toISOString()
    };

    await db.collection('emailVerifications').add(verificationDoc);

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: `"Eagle Vision Edge" <${process.env.EMAIL_FROM || 'noreply@eaglevisionedge.com'}>`,
      to: email,
      subject: 'Verify Your Email - Eagle Vision Edge',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email</h2>
          <p>Hello,</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 4px;
                      font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br/>Eagle Vision Edge Team</p>
        </div>
      `
    };

    // Send email using the transport
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }

    // Log the audit
    await logAudit({
      action: 'VERIFICATION_EMAIL_SENT',
      userId: null,
      userEmail: email,
      metadata: { email, token: verificationToken }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Verification email sent successfully' 
    });

  } catch (error) {
    console.error('Error in send-verification-email:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to send verification email' 
    });
  }
});

module.exports = router;
