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

    async signUp(_, { input }, { db }) {
      console.log('=== SIGNUP REQUEST START ===');
      console.log('Signup request received:', { email: input.email });
      
      // Validate database connection
      if (!db || typeof db.collection !== 'function') {
        console.error('Database Error: Database connection is not properly initialized');
        return { success: false, message: 'Database connection error. Please try again later.' };
      }
      
      // Input validation
      if (!input.email || !input.password || !input.firstName || !input.lastName) {
        console.error('Missing required fields');
        return { success: false, message: 'All fields are required' };
      }
      
      try {
        // Check if user exists
        const usersRef = db.collection('users');
        const existingUser = await usersRef
          .where('email', '==', input.email.toLowerCase().trim())
          .limit(1)
          .get();
          
        if (!existingUser.empty) {
          console.error('User already exists:', input.email);
          return { success: false, message: 'This email is already registered. Please use a different email or try logging in.' };
        }
        
        // Hash password
        const hashedPassword = await hashPassword(input.password);
        
        // Create user data
        const userData = {
          email: input.email.toLowerCase().trim(),
          password: hashedPassword,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone ? input.phone.trim() : null,
          role: 'CLIENT',
          emailVerified: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLoginAt: null
        };
        
        // Add user to database
        const userRef = await usersRef.add(userData);
        console.log('User created with ID:', userRef.id);
        
        // Get the created user document to verify
        const userDoc = await usersRef.doc(userRef.id).get();
        
        if (!userDoc.exists) {
          console.error('User document was not created successfully, cleaning up...');
          try {
            await usersRef.doc(userRef.id).delete();
          } catch (cleanupErr) {
            console.error('Failed to clean up user document:', cleanupErr);
          }
          throw new Error('Failed to create user - document not found after creation');
        }
        
        // Helper function to convert Firestore timestamps to ISO strings
        const toISO = (v) => {
          if (!v) return new Date().toISOString();
          if (typeof v === 'string') return v;
          if (v instanceof Date) return v.toISOString();
          if (v.toDate) return v.toDate().toISOString();
          return new Date().toISOString();
        };
        
        // Generate tokens
        const token = generateToken(userRef.id);
        const refreshToken = generateRefreshToken(userRef.id);

        // Save refresh token to database
        await db.collection('refreshTokens').doc(refreshToken).set({
          userId: userRef.id,
          token: refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: Timestamp.now(),
        });

        // Prepare response with tokens
        const response = {
          success: true,
          message: 'User registered successfully',
          token,
          refreshToken,
          user: {
            id: userRef.id,
            email: userData.email,
            emailVerified: userData.emailVerified || false,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            phone: userData.phone,
            createdAt: toISO(userData.createdAt),
            updatedAt: toISO(userData.updatedAt)
          }
        };
        
        console.log('=== SIGNUP REQUEST COMPLETED SUCCESSFULLY ===', response);
        return response;
      
      } catch (error) {
        // Log the complete error with all available details
        console.error('SIGNUP ERROR:', {
          message: error.message,
          stack: error.stack,
          code: error.code,
          name: error.name,
          ...(error.originalError ? { originalError: error.originalError.message } : {})
        });
        
        return {
          success: false,
          message: error.message || 'Failed to create user account. Please try again later.',
          token: null,
          refreshToken: null,
          user: null
        };
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
