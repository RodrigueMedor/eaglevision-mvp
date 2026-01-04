const { gql } = require('graphql-tag');

const typeDefs = gql`
  # Base Interface
  interface Node {
    id: ID!
  }

  # Pagination Types
  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
    totalCount: Int!
  }

  # Enums
  enum ContactStatus {
    NEW
    IN_PROGRESS
    RESOLVED
    SPAM
  }

  # Types
  type ContactMetadata {
    userAgent: String
    ipAddress: String
    referrer: String
    source: String
    userId: String
  }

  type Contact implements Node {
    id: ID!
    name: String!
    email: String!
    phone: String
    subject: String
    message: String!
    status: ContactStatus!
    metadata: ContactMetadata
    createdAt: DateTime!
    updatedAt: DateTime
  }

  # Inputs
  input ContactInput {
    name: String!
    email: String!
    phone: String
    subject: String
    message: String!
    metadata: ContactMetadataInput
  }

  input ContactMetadataInput {
    userAgent: String
    ipAddress: String
    referrer: String
    source: String
    userId: String
  }

  # Responses
  type ContactResponse {
    success: Boolean!
    message: String!
    contact: Contact
  }

  type ContactConnection {
    edges: [ContactEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ContactEdge {
    node: Contact!
    cursor: String!
  }

  # Extend Root Types
  extend type Query {
    """
    Get a list of contacts with optional filtering and pagination
    """
    contacts(
      status: ContactStatus
      search: String
      first: Int = 10
      after: String
    ): ContactConnection!
    
    """
    Get a single contact by ID
    """
    contact(id: ID!): Contact
  }

  extend type Mutation {
    """
    Create a new contact form submission
    """
    createContact(input: CreateContactInput!): ContactResponse!
    
    """
    Update a contact's status
    """
    updateContactStatus(id: ID!, status: ContactStatus!): ContactResponse!
  }

  # Input for creating a new contact
  input CreateContactInput {
    name: String!
    email: String!
    phone: String
    subject: String
    message: String!
    metadata: ContactMetadataInput
  }
`;

module.exports = typeDefs;
