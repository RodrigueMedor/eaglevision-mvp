const fetch = require('node-fetch');

// Handle CORS preflight
const handleOptions = () => ({
  statusCode: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: '',
});

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }

  try {
    // Forward the request to your backend server
    const response = await fetch('https://api.eaglevisionedge.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(event.headers.authorization && { 'Authorization': event.headers.authorization }),
      },
      body: event.body,
    });

    const data = await response.json();
    
    return {
      statusCode: response.status,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    };
  } catch (error) {
    console.error('Error in Netlify function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to fetch from GraphQL server',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
};
