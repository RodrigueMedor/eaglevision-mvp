const nodemailer = require('nodemailer');
const { logAudit } = require('../utils/audit');

// Create a test account if in development
let transporter;

if (process.env.NODE_ENV === 'test') {
  // Use ethereal.email for testing
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USER || 'test@example.com',
      pass: process.env.ETHEREAL_PASS || 'testpass'
    }
  });
} else {
  // Use environment variables for production
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

/**
 * Sends an SSO verification email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.token - Verification token
 * @param {string} params.appointmentId - Appointment ID
 * @param {string} params.firstName - User's first name
 * @param {string} params.lastName - User's last name
 * @param {string} params.service - Service name
 * @param {string} params.appointmentDate - Formatted appointment date
 * @returns {Promise<void>}
 */
const sendSSOEmail = async ({
  to,
  token,
  appointmentId,
  firstName,
  lastName,
  service,
  appointmentDate
}) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${appointmentId}/${token}?email=${encodeURIComponent(to)}`;
  
  const mailOptions = {
    from: `"Eagle Vision Edge" <${process.env.EMAIL_FROM || 'noreply@eaglevisionedge.com'}>`,
    to,
    subject: 'Verify Your Email for Eagle Vision Edge Appointment',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Hello ${firstName} ${lastName},</p>
        <p>Thank you for booking a ${service} appointment on ${appointmentDate}.</p>
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

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    if (process.env.NODE_ENV === 'test') {
      // Preview URL for testing
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};

module.exports = { sendSSOEmail };
