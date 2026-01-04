const { gql } = require('apollo-server-express');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { GraphQLJSON, GraphQLJSONObject } = require('graphql-type-json');

// Define the JSON scalar type
const typeDefs = gql`
  scalar JSON
  scalar JSONObject

  type Query {
    # Your query definitions here
    hello: String
  }

  type Mutation {
    # Your mutation definitions here
  }
`;

// Resolvers
const resolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  Query: {
    hello: () => 'Hello, world!',
  },
};

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

module.exports = { typeDefs, resolvers, schema };
