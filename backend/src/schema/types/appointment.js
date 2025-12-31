const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Appointment {
    id: ID!
    userId: ID # Made nullable to support unauthenticated users
    service: String!
    appointmentDate: DateTime!
    status: AppointmentStatus!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    documentSigned: Boolean
    envelopeId: String
    documentUrl: String
    firstName: String!
    lastName: String!
    email: String!
    phone: String!
  }

  enum AppointmentStatus {
    PENDING
    CONFIRMED
    CANCELLED
    COMPLETED
  }

  input CreateAppointmentInput {
    service: String!
    appointmentDate: DateTime!
    notes: String
    firstName: String!
    lastName: String!
    email: String!
    phone: String!
  }

  input UpdateAppointmentInput {
    service: String
    appointmentDate: DateTime
    status: AppointmentStatus
    notes: String
    documentSigned: Boolean
    envelopeId: String
    documentUrl: String
  }

  extend type Query {
    appointments: [Appointment!]!
    appointment(id: ID!): Appointment
    userAppointments(userId: ID!): [Appointment!]!
  }

  extend type Mutation {
    createAppointment(input: CreateAppointmentInput!): Appointment!
    updateAppointment(id: ID!, input: UpdateAppointmentInput!): Appointment!
    cancelAppointment(id: ID!): Boolean!
    deleteAppointment(id: ID!): Boolean!
  }
`;

module.exports = typeDefs;
