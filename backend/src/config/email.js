require('dotenv').config();

module.exports = {
  // Email service configuration
  emailService: process.env.EMAIL_SERVICE || 'gmail',
  emailUser: process.env.EMAIL_USER || process.env.SENDGRID_USERNAME,
  emailPassword: process.env.EMAIL_PASSWORD || process.env.SENDGRID_PASSWORD,
  emailFrom: process.env.EMAIL_FROM || 'noreply@eaglevisionedge.com',
  
  // Frontend URL for verification links
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
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
