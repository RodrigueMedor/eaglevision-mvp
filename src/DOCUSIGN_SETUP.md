# DocuSign Integration Setup

This guide explains how to set up the DocuSign integration for the Eagle Vision MVP backend.

## Prerequisites

1. Python 3.8+
2. DocuSign Developer Account (https://developers.docusign.com/)
3. DocuSign Integration Key (Client ID)
4. RSA Key Pair for JWT Grant Authentication

## Setup Instructions

### 1. Install Dependencies

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Configure DocuSign

1. Go to the [DocuSign Developer Console](https://admindemo.docusign.com/)
2. Create a new application or use an existing one
3. Enable JWT Grant authentication
4. Generate an RSA key pair (or use an existing one)
5. Copy the Integration Key (Client ID) and User ID
6. Save the private key to a secure location

### 3. Configure Environment Variables

Update the `.env` file with your DocuSign credentials:

```
# DocuSign API Configuration
DOCUSIGN_CLIENT_ID=your_integration_key_here
DOCUSIGN_USER_ID=your_user_id_here
DOCUSIGN_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----\nYour private key here\n-----END RSA PRIVATE KEY-----'
DOCUSIGN_REDIRECT_URI=http://localhost:3000/docusign/callback
```

### 4. Run the Backend Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `POST /api/docusign/envelope` - Create a new signing envelope
  - Request body: `{ "signer": { "email": "user@example.com", "name": "John Doe", "client_user_id": "123" }, "return_url": "http://yoursite.com/return" }`
  - Response: `{ "envelope_id": "...", "redirect_url": "..." }`

- `GET /api/health` - Health check endpoint

## Webhook Configuration (Optional)

To receive notifications when documents are signed:

1. Go to your DocuSign Admin Console
2. Navigate to Connect > Add Configuration
3. Set the following:
   - Name: Eagle Vision Webhook
   - URL: `https://your-api-url.com/api/docusign/webhook`
   - Events: Envelope Sent, Envelope Delivered, Envelope Completed, Envelope Declined, Envelope Voided
   - Include HMAC Signature: Yes
   - Include Certificate of Completion: Yes

## Testing

1. Start the backend server
2. Use a tool like Postman to test the API endpoints
3. For local development, you can use ngrok to expose your local server to the internet for webhook testing

## Troubleshooting

- **JWT Authentication Failed**: Verify your private key format and ensure it's correctly escaped in the .env file
- **Permission Issues**: Make sure your DocU Sign Integration Key has the necessary permissions
- **CORS Errors**: Verify the ALLOWED_ORIGINS in your .env file includes your frontend URL
