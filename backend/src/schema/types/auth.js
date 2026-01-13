const { gql } = require('graphql-tag');

const typeDefs = gql`
  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type SignUpResponse {
    success: Boolean!
    message: String
    user: User
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input SignUpInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
  }

  extend type Mutation {
    login(input: LoginInput!): AuthPayload!
    signUp(input: SignUpInput!): SignUpResponse
    refreshToken(refreshToken: String!): AuthPayload!
    logout: Boolean!
  }
`;

module.exports = typeDefs;
