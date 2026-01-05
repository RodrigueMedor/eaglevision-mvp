const { createTransport } = nodemailer;
const jwt = require('jsonwebtoken');

// Get environment variables with fallbacks
const { 
  SMTP_HOST = 'smtp.ethereal.email',
  SMTP_PORT = 587,
  SMTP_USER = 'your_ethereal_username@ethereal.email',
  SMTP_PASS = 'your_ethereal_password',
  SENDGRID_API_KEY = '2YNkxZ9US3WeK8i16ew3Ww',
  JWT_SECRET = 'test-secret-change-in-production',
  FRONTEND_URL = 'http://localhost:3000',
  APP_ENV = 'development'
} = process.env;

// Log environment variables for debugging (safely)
console.log('Environment variables:', {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER: SMTP_USER ? '***' : 'Not set',
  SMTP_PASS: SMTP_PASS ? '***' : 'Not set',
  JWT_SECRET: JWT_SECRET ? '***' : 'Not set',
  FRONTEND_URL,
  APP_ENV
});

// Simple email validation
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Configure email transport using Ethereal for development
const transporter = createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

const createVerificationToken = (email) => {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
};

exports.handler = async (event) => {
  console.log('Received event:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body
  });

  if (event.httpMethod !== 'POST') {
    console.log('Method not allowed:', event.httpMethod);
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    let email;
    try {
      const body = JSON.parse(event.body || '{}');
      email = body.email;
      console.log('Parsed request body:', { email });
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
    
    if (!email) {
      console.log('Email is required');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    console.log('Creating verification token for email:', email);
    const token = createVerificationToken(email);
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    console.log('Setting up email transport with config:', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      hasPass: !!SMTP_PASS
    });

    const transporter = createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT, 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      logger: true, // log to console
      debug: APP_ENV === 'development' // include SMTP traffic in the logs
    });

    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('Server is ready to take our messages');
    } catch (error) {
      console.error('SMTP connection error:', error);
      throw new Error(`SMTP connection failed: ${error.message}`);
    }

    console.log('Preparing email options');
    const mailOptions = {
      from: 'no-reply@eaglevisiontax.com',
      to: email,
      subject: 'Verify Your Email - Eagle Vision Tax Services',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Eagle Vision Tax Services</h2>
          <p>Please verify your email address to continue with your appointment booking.</p>
          <p style="margin: 25px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Verify Email Address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't request this email, you can safely ignore it.</p>
        </div>
      `,
    };

    console.log('Sending verification email to:', email);
    
    // Add a test email for Ethereal in development
    if (APP_ENV === 'development' && email === 'test@example.com') {
      console.warn('Using test@example.com in development - using Ethereal test account');
      mailOptions.to = SMTP_USER; // Send to self in development
    }
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    
    // Only try to get preview URL if we're using Ethereal
    if (SMTP_HOST.includes('ethereal.email')) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    if (APP_ENV === 'development') {
      console.log('Ethereal test account:', {
        user: SMTP_USER,
        pass: SMTP_PASS,
        inbox: `https://ethereal.email/message/${info.messageId}`
      });
    }

    const response = {
      success: true,
      message: 'Verification email sent successfully',
      ...(NODE_ENV === 'development' && { 
        previewUrl: SMTP_HOST.includes('ethereal.email') ? nodemailer.getTestMessageUrl(info) : undefined
      })
    };
    
    console.log('Sending success response:', response);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command
    };
    
    console.error('Error in send-verification-email:', errorDetails);
    
    // More specific error messages
    let errorMessage = 'Failed to send verification email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Check your email credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to SMTP server. Check your network and SMTP settings.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address or missing recipient.';
    }
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: errorMessage,
        ...(APP_ENV === 'development' && { 
          details: errorDetails,
          stack: error.stack 
        })
      }),
    };
  }
};
