const { gql } = require('graphql-tag');

const typeDefs = gql`
  type Appointment {
    id: ID!
    userId: ID!
    service: String!
    appointmentDate: DateTime!
    status: AppointmentStatus!
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    documentSigned: Boolean!
    envelopeId: String
    documentUrl: String
    signedDocumentUrl: String
    signedAt: DateTime
    firstName: String!
    lastName: String!
    email: String!
    phone: String!
    ssoToken: String
    ssoVerified: Boolean!
    ssoVerifiedAt: DateTime
    auditLog: [AuditLogEntry!]!
  }

  type AuditLogEntry {
    timestamp: DateTime!
    action: String!
    status: String!
    message: String
    metadata: JSON
    error: String
  }

  enum AppointmentStatus {
    DRAFT
    PENDING_SSO
    PENDING_SIGNATURE
    SIGNED
    COMPLETED
    CANCELLED
    DECLINED
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
    notes: String
    status: AppointmentStatus
    documentSigned: Boolean
    envelopeId: String
    documentUrl: String
    ssoVerified: Boolean
    ssoVerifiedAt: DateTime
  }
  
  input VerifySSOInput {
    email: String!
    token: String!
    appointmentId: ID
  }
  
  type SSOVerificationResult {
    success: Boolean!
    message: String
    appointment: Appointment
    requiresSigning: Boolean!
    signingUrl: String
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
    # Create a new appointment (starts in DRAFT status)
    createAppointment(input: CreateAppointmentInput!): Appointment!
    
    # Update an existing appointment
    updateAppointment(id: ID!, input: UpdateAppointmentInput!): Appointment!
    
    # Delete an appointment
    deleteAppointment(id: ID!): Boolean!
    
    # Initiate SSO verification process
    initiateSSO(email: String!): Boolean!
    
    # Verify SSO token and complete the appointment creation
    verifySSO(input: VerifySSOInput!): SSOVerificationResult!
    
    # Resend SSO verification email
    resendSSO(appointmentId: ID!): Boolean!
  }
`;

module.exports = typeDefs;
