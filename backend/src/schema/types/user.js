const { gql } = require('graphql-tag');

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    emailVerified: Boolean!
    firstName: String
    lastName: String
    phone: String
    role: UserRole!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum UserRole {
    CLIENT
    ADMIN
  }

  input UpdateUserInput {
    firstName: String
    lastName: String
    phone: String
  }

  extend type Query {
    me: User
    user(id: ID!): User
  }

  extend type Mutation {
    updateUser(input: UpdateUserInput!): User!
  }
`;

module.exports = typeDefs;
