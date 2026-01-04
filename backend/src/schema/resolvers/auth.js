const { AuthenticationError, UserInputError } = require('../../errors');
const { Timestamp } = require('firebase-admin/firestore');
const { generateToken, verifyToken, generateRefreshToken, comparePasswords, hashPassword } = require('../../utils/auth');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { ApolloError } = require('apollo-server-express');

// Export the resolvers as a named export
const authResolvers = {
  Mutation: {
    async login(_, { input: { email, password } }, { db }) {
      try {
        if (!email || !password) {
          throw new UserInputError('Email and password are required', {
            invalidArgs: !email ? ['email'] : ['password']
          });
        }

        // Find user by email
        const usersRef = await db.collection('users')
          .where('email', '==', email.toLowerCase().trim())
          .limit(1)
          .get();

        if (usersRef.empty) {
          throw new AuthenticationError('No account found with this email', {
            code: 'USER_NOT_FOUND',
            invalidArgs: ['email']
          });
        }

        const userDoc = usersRef.docs[0];
        const userData = userDoc.data();
      
        // Check if password is correct
        const isPasswordValid = await comparePasswords(password, userData.password);
        if (!isPasswordValid) {
          throw new AuthenticationError('Incorrect password', {
            code: 'INVALID_PASSWORD',
            invalidArgs: ['password']
          });
        }

        // Generate tokens
        const token = generateToken(userDoc.id);
        const refreshToken = generateRefreshToken(userDoc.id);

        // Save refresh token to database
        await db.collection('refreshTokens').doc(refreshToken).set({
          userId: userDoc.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: Timestamp.now(),
        });

        return {
          token,
          refreshToken,
          user: {
            id: userDoc.id,
            ...userDoc.data(),
          },
        };
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    async signup(_, { input }, { db }) {
      console.log('=== SIGNUP REQUEST START ===');
      console.log('Input received (password hidden):', { ...input, password: '[REDACTED]' });
      
      // Validate database connection
      if (!db || typeof db.collection !== 'function') {
        const error = new Error('Database connection is not properly initialized');
        console.error('Database Error:', error);
        throw new ApolloError('Database connection error', 'DATABASE_ERROR', { 
          originalError: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      try {
        // Ensure we have a valid database connection
        if (!db) {
          const error = new Error('Database connection not available');
          console.error('Database Error:', error);
          throw new ApolloError('Database connection error', 'DATABASE_ERROR');
        }
        
        // Validate input
        if (!input || typeof input !== 'object') {
          throw new ApolloError('Invalid input data', 'INVALID_INPUT');
        }
        if (!db) {
          const error = new Error('Database connection not available');
          console.error('Database Error:', error);
          throw new ApolloError('Database connection error', 'DATABASE_ERROR');
        }
        
        const { email, password, firstName, lastName, phone } = input;
        
        // Input validation
        if (!email || !password || !firstName || !lastName) {
          const errorMsg = 'Missing required fields';
          console.error('Validation Error:', errorMsg, { 
            email: !!email, 
            password: !!password, 
            firstName: !!firstName, 
            lastName: !!lastName 
          });
          throw new UserInputError(errorMsg);
        }
        
        console.log('Input validation passed');


        // Check if user already exists
        console.log('Checking if user exists:', email.toLowerCase());
        const usersRef = db.collection('users');
        console.log('Using database instance:', db ? 'valid' : 'invalid');
        
        console.log('Querying database for existing user...');
        let existingUser;
        try {
          existingUser = await usersRef
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();
            
          console.log('Database query completed, user exists:', !existingUser.empty);
          
          if (!existingUser.empty) {
            const errorMsg = 'This email is already registered. Please use a different email or try logging in.';
            console.log('Signup failed - Email already exists:', email);
            throw new UserInputError(errorMsg, {
              invalidArgs: ['email'],
              code: 'EMAIL_EXISTS'
            });
          }
        } catch (err) {
          // Handle the case where the error is already a UserInputError (like email exists)
          if (err.extensions?.code === 'BAD_USER_INPUT') {
            throw err;
          }
          
          // Log the full error for debugging
          console.error('Database query error:', {
            message: err.message,
            stack: err.stack,
            code: err.code
          });
          
          // Throw a more specific error
          throw new ApolloError(
            'Unable to complete signup at this time. Please try again later.', 
            'SERVICE_UNAVAILABLE',
            { originalError: err }
          );
        }

        // Hash password
        console.log('Hashing password...');
        let hashedPassword;
        try {
          hashedPassword = await hashPassword(password);
          console.log('Password hashed successfully');
        } catch (err) {
          console.error('Password hashing error:', err);
          throw new ApolloError('Error processing password', 'INTERNAL_SERVER_ERROR');
        }

        // Create user data
        const userData = {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone ? phone.trim() : null,
          role: 'CLIENT',
          emailVerified: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        console.log('User data prepared:', { ...userData, password: '[HASHED]' });

        // Create user document
        console.log('Creating user document in database...');
        let userRef;
        try {
          // Ensure the users collection exists
          if (!db.collection) {
            throw new Error('Database collection method not available');
          }
          
          // Add the user document
          const result = await db.collection('users').add(userData);
          
          if (!result || !result.id) {
            throw new Error('Failed to create user - no ID returned');
          }
          
          userRef = { id: result.id };
          console.log('User document created with ID:', userRef.id);
        } catch (err) {
          console.error('Failed to create user document:', {
            message: err.message,
            stack: err.stack,
            code: err.code
          });
          throw new ApolloError('Failed to create user account', 'DATABASE_ERROR');
        }
        
        // Generate tokens
        console.log('Generating tokens...');
        let token, refreshToken;
        try {
          token = generateToken(userRef.id);
          refreshToken = generateRefreshToken(userRef.id);
          console.log('Tokens generated successfully');
        } catch (err) {
          console.error('Token generation error:', err);
          throw new ApolloError('Failed to generate authentication tokens', 'TOKEN_GENERATION_ERROR');
        }

        // Save refresh token to database
        console.log('Saving refresh token to database...');
        try {
          const refreshTokenData = {
            userId: userRef.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            createdAt: Timestamp.now(),
          };
          
          await db.collection('refreshTokens').doc(refreshToken).set(refreshTokenData);
          console.log('Refresh token saved successfully');
        } catch (err) {
          console.error('Failed to save refresh token:', {
            message: err.message,
            stack: err.stack,
            code: err.code
          });
          // Don't fail the entire signup if we can't save the refresh token
          // The user can still log in again to get a new one
          console.warn('Proceeding without saving refresh token');
          
          // If we couldn't save the refresh token, we should still continue with the signup
          // but we'll log this as a warning
          refreshToken = null; // Clear the refresh token since we couldn't save it
        }

        // Get the created user document
        console.log('Fetching created user document...');
        let userDoc;
        try {
          const docRef = db.collection('users').doc(userRef.id);
          if (!docRef || typeof docRef.get !== 'function') {
            throw new Error('Invalid document reference');
          }
          
          const docSnapshot = await docRef.get();
          console.log('User document fetch result:', docSnapshot.exists ? 'exists' : 'missing');
          
          if (!docSnapshot.exists) {
            console.error('User document was not created successfully, cleaning up...');
            try {
              await db.collection('users').doc(userRef.id).delete();
            } catch (cleanupErr) {
              console.error('Failed to clean up user document:', cleanupErr);
            }
            throw new Error('Failed to create user - document not found after creation');
          }
          
          userDoc = {
            exists: true,
            data: () => docSnapshot.data()
          };
        } catch (err) {
          console.error('Error fetching user document:', {
            message: err.message,
            stack: err.stack,
            code: err.code
          });
          throw new ApolloError('Failed to verify user creation', 'DATABASE_ERROR');
        }

        // Prepare user data for response
        let user;
        try {
          user = {
            id: userRef.id,
            ...userDoc.data()
          };

          // Remove sensitive data before returning
          delete user.password;
          console.log('User data prepared for response');
        } catch (err) {
          console.error('Error preparing user data:', err);
          throw new ApolloError('Error preparing user data', 'INTERNAL_ERROR');
        }

        // Ensure we're returning the exact structure expected by AuthPayload
        const result = {
          token,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || null,
            role: user.role || 'CLIENT',
            emailVerified: user.emailVerified || false,
            createdAt: user.createdAt || Timestamp.now(),
            updatedAt: user.updatedAt || Timestamp.now()
          }
        };

        console.log('Signup successful:', { 
          userId: user.id, 
          email: user.email,
          hasToken: !!result.token,
          hasRefreshToken: !!result.refreshToken,
          hasUserData: !!result.user
        });
        
        // Verify the result matches the expected AuthPayload type
        if (!result.token || !result.refreshToken || !result.user) {
          const errorDetails = {
            tokenPresent: !!result.token,
            refreshTokenPresent: !!result.refreshToken,
            userPresent: !!result.user,
            userData: result.user ? Object.keys(result.user) : 'no user data'
          };
          console.error('Invalid response structure:', JSON.stringify(errorDetails, null, 2));
          throw new ApolloError('Internal server error - invalid response structure', 'INTERNAL_ERROR');
        }
        
        console.log('=== SIGNUP REQUEST COMPLETED SUCCESSFULLY ===');
        return result;

      } catch (error) {
        // Log the complete error with all available details
        const errorDetails = {
          message: error.message || 'No error message',
          name: error.name || 'Error',
          stack: error.stack,
          code: error.code,
          path: error.path,
          extensions: error.extensions,
          originalError: error.originalError ? {
            message: error.originalError.message,
            stack: error.originalError.stack,
            ...error.originalError
          } : null
        };
        
        console.error('SIGNUP ERROR DETAILS:', JSON.stringify(errorDetails, null, 2));
        
        // If it's already a GraphQL error, re-throw it
        if (error.extensions?.code) {
          console.error('GraphQL Error:', error);
          throw error;
        }
        
        // Convert to ApolloError with a proper error code
        if (error instanceof UserInputError || error instanceof AuthenticationError) {
          console.error('Validation/Auth Error:', error);
          throw error;
        }
        
        // For database errors or other unexpected errors
        const errorMessage = error.message || 'An unknown error occurred during signup';
        console.error('Unexpected Error:', errorMessage, error);
        
        // Ensure we always throw an ApolloError with a proper message
        if (error instanceof ApolloError) {
          throw error;
        }
        
        throw new ApolloError(
          'Failed to create user account. Please try again later.',
          'INTERNAL_SERVER_ERROR',
          { 
            originalError: {
              message: error.message,
              name: error.name,
              stack: error.stack
            },
            timestamp: new Date().toISOString(),
            code: 'SIGNUP_FAILED',
            context: 'An unexpected error occurred during user signup'
          }
        );
      } finally {
        console.log('=== SIGNUP REQUEST COMPLETED ===');
      }
    },

    async refreshToken(_, { refreshToken }, { db }) {
      try {
        if (!refreshToken) {
          throw new AuthenticationError('No refresh token provided');
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
          throw new AuthenticationError('Invalid token type');
        }

        // Check if refresh token exists in database
        const refreshTokenDoc = await db.collection('refreshTokens').doc(refreshToken).get();
        if (!refreshTokenDoc.exists) {
          throw new AuthenticationError('Invalid refresh token');
        }

        // Check if token is expired
        const tokenData = refreshTokenDoc.data();
        if (new Date() > tokenData.expiresAt.toDate()) {
          // Delete expired token
          await db.collection('refreshTokens').doc(refreshToken).delete();
          throw new AuthenticationError('Refresh token expired');
        }

        // Generate new tokens
        const newToken = generateToken(decoded.userId);
        const newRefreshToken = generateRefreshToken(decoded.userId);

        // Delete old refresh token
        await db.collection('refreshTokens').doc(refreshToken).delete();

        // Save new refresh token
        await db.collection('refreshTokens').doc(newRefreshToken).set({
          userId: decoded.userId,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: Timestamp.now(),
        });

        // Get user data
        const userDoc = await db.collection('users').doc(decoded.userId).get();
        if (!userDoc.exists) {
          throw new UserInputError('User not found');
        }

        return {
          token: newToken,
          refreshToken: newRefreshToken,
          user: {
            id: userDoc.id,
            ...userDoc.data(),
          },
        };
      } catch (error) {
        console.error('Refresh token error:', error);
        throw new AuthenticationError('Invalid refresh token');
      }
    },

    async logout(_, __, { db, token }) {
      try {
        if (!token) {
          return true; // Already logged out
        }

        // Remove 'Bearer ' prefix if present
        const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        
        // Delete refresh token if it exists
        try {
          await db.collection('refreshTokens').doc(tokenValue).delete();
        } catch (error) {
          console.error('Error deleting refresh token:', error);
        }

        return true;
      } catch (error) {
        console.error('Logout error:', error);
        throw error;
      }
    },
  },
};

// Add auth middleware to check for authentication
const withAuth = (resolver) => {
  return async (parent, args, context, info) => {
    if (!context.user) {
      throw new AuthenticationError('You must be logged in to perform this action');
    }
    return resolver(parent, args, context, info);
  };
};

// Export the resolvers with proper structure
module.exports = {
  authResolvers: {
    Mutation: {
      ...authResolvers.Mutation
    }
  },
  withAuth
};
