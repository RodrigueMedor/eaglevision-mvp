const gql = require('graphql-tag');
const { DateTimeResolver } = require('graphql-scalars');
const { GraphQLJSON } = require('graphql-type-json');
const { makeExecutableSchema } = require('@graphql-tools/schema');
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
  
  # Common response interface
  interface SuccessResponse {
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

// Merge all resolvers, ensuring Query and Mutation maps are deep-merged
const resolvers = {
  DateTime: DateTimeResolver,
  JSON: GraphQLJSON,
  // Spread type-specific resolvers first (may include Appointment, etc.)
  ...appointmentResolvers,
  ...userResolvers,
  ...authResolvers,
  ...contactResolvers,
  // Override with deep-merged root fields so nothing gets overwritten
  Query: {
    ...(appointmentResolvers.Query || {}),
    ...(userResolvers.Query || {}),
    ...(contactResolvers.Query || {}),
  },
  Mutation: {
    ...(appointmentResolvers.Mutation || {}),
    ...(userResolvers.Mutation || {}),
    ...(authResolvers.Mutation || {}),
    ...(contactResolvers.Mutation || {}),
  },
};

module.exports = { typeDefs, resolvers };

// Also export a constructed executable schema to avoid version mismatches
// in environments where multiple copies of the `graphql` package may exist.
const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports.schema = schema;
