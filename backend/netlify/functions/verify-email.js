const jwt = require('jsonwebtoken');
const { JWT_SECRET, FRONTEND_URL } = process.env;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const token = event.queryStringParameters?.token;
    
    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Verification token is required' }),
      };
    }

    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { email } = decoded;

    // Here you would typically:
    // 1. Verify the email in your database
    // 2. Update the user's email verification status
    // 3. Create a session or JWT for the user

    // For now, we'll redirect to the frontend with a success status
    const redirectUrl = new URL('/appointment', FRONTEND_URL);
    redirectUrl.searchParams.set('verified', 'true');
    redirectUrl.searchParams.set('email', encodeURIComponent(email));

    return {
      statusCode: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Cache-Control': 'no-cache',
      },
      body: '',
    };
  } catch (error) {
    console.error('Email verification error:', error);
    
    // Handle different JWT errors
    let errorMessage = 'Invalid or expired verification link';
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Verification link has expired. Please request a new one.';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid verification link';
    }

    // Redirect to frontend with error
    const errorUrl = new URL('/email-verification-error', FRONTEND_URL);
    errorUrl.searchParams.set('error', encodeURIComponent(errorMessage));
    
    return {
      statusCode: 302,
      headers: {
        Location: errorUrl.toString(),
        'Cache-Control': 'no-cache',
      },
      body: '',
    };
  }
};
