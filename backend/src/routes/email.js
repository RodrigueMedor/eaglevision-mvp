const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const firebase = require('../firebase');
const { logAudit } = require('../utils/audit');

// Get db instance when needed
const getDb = () => {
  try {
    return firebase.db;
  } catch (error) {
    console.error('Firebase not initialized:', error.message);
    throw new Error('Database service is not available. Please try again later.');
  }
};

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
    const db = getDb();

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Check if user exists
    const userSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    
    if (userSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;

    // Generate verification token
    const verificationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

    // Save verification token to user document
    await db.collection('users').doc(userId).update({
      emailVerificationToken: verificationToken,
      emailVerificationExpires: expiresAt.toISOString()
    });

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
      userId: userId,
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

/**
 * @route POST /api/verify-email
 * @desc Verify the user's email using the verification token
 * @access Public
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;
    
    if (!token || !email) {
      return res.status(400).json({ 
        error: 'Token and email are required' 
      });
    }

    const db = getDb();

    // Find user with matching verification token and email
    const usersSnapshot = await db.collection('users')
      .where('emailVerificationToken', '==', token)
      .where('email', '==', email)
      .where('emailVerificationExpires', '>', new Date().toISOString())
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid, expired, or already used verification link' 
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Check if already verified
    if (userData.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified',
        alreadyVerified: true
      });
    }

    // Update user as verified
    await db.collection('users').doc(userId).update({
      isEmailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
      updatedAt: new Date().toISOString()
    });

    // Log the action
    try {
      await logAudit({
        action: 'EMAIL_VERIFIED',
        userId: userId,
        userEmail: email,
        metadata: { 
          verifiedAt: new Date().toISOString(),
          method: 'email' 
        }
      });
    } catch (auditError) {
      console.error('Error logging email verification:', auditError);
      // Continue even if audit logging fails
    }

    // Send welcome email
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Eagle Vision Edge" <${process.env.EMAIL_FROM || 'noreply@eaglevisionedge.com'}>`,
          to: email,
          subject: 'Welcome to Eagle Vision Edge - Email Verified',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Eagle Vision Edge!</h2>
              <p>Your email has been successfully verified. Thank you for joining our community!</p>
              <p>You can now log in to your account and start using our services.</p>
              <p>If you have any questions, feel free to contact our support team.</p>
              <br>
              <p>Best regards,<br>The Eagle Vision Edge Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue even if welcome email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      userId: userId
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to verify email. Please try again.' 
    });
  }
});

module.exports = router;
