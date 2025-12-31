# Eagle Vision MVP - Backend

This is the backend service for the Eagle Vision MVP application, built with Node.js, Express, and Apollo Server, using Firebase for authentication and data storage.

## Prerequisites

- Node.js (v16 or later)
- npm (v8 or later) or yarn
- Firebase project with Firestore and Authentication enabled

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd /path/to/backend
   npm install
   ```

2. **Set up Firebase Service Account**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (church-website-123-ba1e2)
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `serviceAccountKey.json` in the `/backend/config/firebase/` directory

3. **Environment Variables**
   Copy the `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:4000`

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot-reload
- `npm test` - Run tests
- `npm run lint` - Lint the code

## API Documentation

The GraphQL Playground is available at `http://localhost:4000/graphql` when the server is running.

## Project Structure

```
backend/
├── config/                   # Configuration files
│   └── firebase/             # Firebase configuration
│       └── serviceAccountKey.json  # Firebase Admin SDK credentials
├── src/
│   ├── schema/               # GraphQL schema definitions
│   │   ├── types/            # Type definitions
│   │   └── resolvers/        # Resolver implementations
│   ├── firebase.js           # Firebase initialization
│   └── index.js              # Application entry point
├── .env                      # Environment variables
└── package.json              # Dependencies and scripts
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4000 |
| NODE_ENV | Node environment | development |
| FRONTEND_URL | URL of the frontend for CORS | http://localhost:3000 |
| JWT_SECRET | Secret key for JWT tokens | - |
| JWT_EXPIRES_IN | JWT token expiration | 1d |
| REFRESH_TOKEN_EXPIRES_IN | Refresh token expiration | 7d |

## Deployment

For production deployment, make sure to:

1. Set `NODE_ENV=production`
2. Set proper CORS origins
3. Use HTTPS in production
4. Set up proper logging and monitoring

## License

This project is proprietary and confidential.
