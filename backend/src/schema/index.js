const { gql } = require('graphql-tag');
const { DateTimeResolver } = require('graphql-scalars');
const { GraphQLJSON } = require('graphql-type-json');
const { merge } = require('lodash');
const fs = require('fs');
const path = require('path');

// Import type definitions
const appointmentTypeDefs = require('./types/appointment');
const userTypeDefs = require('./types/user');
const authTypeDefs = require('./types/auth');
const contactTypeDefs = require('./types/contact');

// Import resolvers
const appointmentResolvers = require('./resolvers/appointment');
const userResolvers = require('./resolvers/user');
const { authResolvers } = require('./resolvers/auth');
const contactResolvers = require('./resolvers/contact');

console.log('Auth resolvers:', Object.keys(authResolvers)); // Debug log

// Base type definitions
const baseTypeDefs = gql`
  scalar DateTime
  scalar JSON
  
  # Base Interface
  interface Node {
    id: ID!
  }

  # Pagination Info
  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
    totalCount: Int!
  }
  
  type Query {
    _empty: String
    node(id: ID!): Node
  }
  
  type Mutation {
    _empty: String
  }
  
  # Common response types
  type SuccessResponse {
    success: Boolean!
    message: String
  }
`;

// Merge all type definitions
const typeDefs = [
  baseTypeDefs,
  appointmentTypeDefs,
  userTypeDefs,
  authTypeDefs,
  contactTypeDefs
];

// Merge all resolvers
const resolvers = merge(
  { DateTime: DateTimeResolver, JSON: GraphQLJSON },
  appointmentResolvers,
  userResolvers,
  authResolvers,
  contactResolvers
);

module.exports = { typeDefs, resolvers };
