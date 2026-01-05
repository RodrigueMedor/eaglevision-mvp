const nodemailer = require('nodemailer');

// For development, use Ethereal Email (https://ethereal.email/)
const createTestAccount = process.env.NODE_ENV !== 'production' ? 
  require('nodemailer').createTestAccount : 
  async () => ({
    user: process.env.EMAIL_USER || 'test@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  });

// Create a reusable transporter object using the default SMTP transport
let transporter;

async function initTransporter() {
  if (process.env.NODE_ENV !== 'production') {
    // Create test account if not in production
    const testAccount = await createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    // Log the test account credentials for development
    console.log('Ethereal test account created:');
    console.log('Email:', testAccount.user);
    console.log('Password:', testAccount.pass);
    console.log('Web interface: https://ethereal.email/login');
  } else {
    // Production configuration using environment variables
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  // Verify connection configuration
  await new Promise((resolve, reject) => {
    transporter.verify(function (error) {
      if (error) {
        console.error('Error verifying email configuration:', error);
        reject(error);
      } else {
        console.log('Email server is ready to take our messages');
        resolve();
      }
    });
  });

  return transporter;
}

// Initialize and export the transporter
module.exports = initTransporter();
