// Environment variables are loaded in config.js
const config = require('../../config/config');

module.exports = {
  // Email service configuration
  emailService: 'sendgrid', // Using SendGrid as the email service
  sendgridApiKey: config.email.sendgridApiKey,
  emailFrom: config.email.from,
  
  // Frontend URL for verification links
  frontendUrl: config.app.frontendUrl,
  
  // Email templates
  templates: {
    verification: {
      subject: 'Verify Your Email - Eagle Vision Edge',
      expiresIn: '24 hours',
      fromName: 'Eagle Vision Edge'
    }
  },
  
  // Email sending options
  sendOptions: {
    // Set to true to log emails to console instead of sending them
    debug: process.env.NODE_ENV === 'development',
    // Set to true to use test account (ethereal.email)
    useTestAccount: process.env.NODE_ENV === 'test' || !process.env.EMAIL_SERVICE
  }
};
