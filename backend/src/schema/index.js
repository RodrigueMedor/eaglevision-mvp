const { gql } = require('graphql-tag');
const { DateTimeResolver } = require('graphql-scalars');
const { merge } = require('lodash');
const fs = require('fs');
const path = require('path');

// Import type definitions
const appointmentTypeDefs = require('./types/appointment');
const userTypeDefs = require('./types/user');

// Import resolvers
const appointmentResolvers = require('./resolvers/appointment');
const userResolvers = require('./resolvers/user');

// Base type definitions
const baseTypeDefs = gql`
  scalar DateTime
  
  type Query {
    _empty: String
  }
  
  type Mutation {
    _empty: String
  }
`;

// Merge all type definitions
const typeDefs = [
  baseTypeDefs,
  appointmentTypeDefs,
  userTypeDefs,
];

// Merge all resolvers
const resolvers = {
  DateTime: DateTimeResolver,
  Query: {
    ...appointmentResolvers.Query,
    ...userResolvers.Query,
  },
  Mutation: {
    ...appointmentResolvers.Mutation,
    ...userResolvers.Mutation,
  },
};

module.exports = { typeDefs, resolvers };
