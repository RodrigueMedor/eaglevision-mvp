const { gql } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json');
const { signToken, verifyToken } = require('./utils/auth');
const { createUser, getUserByEmail } = require('./services/userService');

// Define the JSON scalar type
const typeDefs = gql`
  scalar JSON
  scalar JSONObject
  scalar Date

  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    createdAt: Date!
    updatedAt: Date!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input SignUpInput {
    email: String!
    password: String!
    firstName: String
    lastName: String
  }

  input SignInInput {
    email: String!
    password: String!
  }

  type Query {
    me: User
    hello: String
  }

  type Mutation {
    signUp(input: SignUpInput!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
  }
`;

// Resolvers
const resolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  
  Query: {
    hello: () => 'Hello, world!',
    me: async (_, __, { user, db }) => {
      if (!user) throw new Error('Not authenticated');
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (!userDoc.exists) throw new Error('User not found');
      return { id: userDoc.id, ...userDoc.data() };
    },
  },

  Mutation: {
    signUp: async (_, { input }, { db }) => {
      try {
        // Check if user already exists
        const existingUser = await getUserByEmail(input.email, db);
        if (existingUser) {
          throw new Error('A user with this email already exists');
        }

        // Create user in Firebase Auth
        const userRecord = await createUser(input);
        
        // Create user in Firestore
        const userData = {
          email: input.email,
          firstName: input.firstName || '',
          lastName: input.lastName || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        // Generate JWT token
        const token = signToken(userRecord.uid);

        return {
          token,
          user: {
            id: userRecord.uid,
            ...userData,
          },
        };
      } catch (error) {
        console.error('Signup error:', error);
        throw new Error(error.message || 'Error creating user');
      }
    },

    signIn: async (_, { input }, { db, firebaseAdmin }) => {
      try {
        const { email, password } = input;
        const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
        
        // In a real app, verify password here (this is simplified)
        // You would typically use Firebase Admin SDK to verify the password
        
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        const token = signToken(userRecord.uid);

        return {
          token,
          user: {
            id: userRecord.uid,
            ...userDoc.data(),
          },
        };
      } catch (error) {
        console.error('Signin error:', error);
        throw new Error('Invalid email or password');
      }
    },
  },
};

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  logger: { log: e => console.error(e) },
});

module.exports = { typeDefs, resolvers, schema };
