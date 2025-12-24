import { gql } from '@apollo/client';

// Query: Get all appointments
export const GET_ALL_APPOINTMENTS = gql`
  query GetAllAppointments {
    allAppointments {
      id
      firstName
      lastName
      email
      phone
      service
      appointmentDate
      status
      notes
      documentSigned
      envelopeId
      documentUrl
      createdAt
      updatedAt
    }
  }
`;

// Query: Get all contacts
export const GET_ALL_CONTACTS = gql`
  query GetAllContacts {
    allContacts {
      id
      name
      email
      phone
      subject
      message
      status
      createdAt
    }
  }
`;

// Mutation: Create a new appointment
export const CREATE_APPOINTMENT = gql`
  mutation CreateAppointment($input: CreateAppointmentInput!) {
    createAppointment(input: $input) {
      id
      firstName
      lastName
      email
      phone
      service
      appointmentDate
      status
      notes
      documentSigned
      envelopeId
      documentUrl
      createdAt
      updatedAt
    }
  }
`;

// Mutation: Update an existing appointment
export const UPDATE_APPOINTMENT = gql`
  mutation UpdateAppointment($input: UpdateAppointmentInput!) {
    updateAppointment(input: $input) {
      id
      firstName
      lastName
      email
      phone
      service
      appointmentDate
      status
      notes
      documentSigned
      envelopeId
      documentUrl
      createdAt
      updatedAt
    }
  }
`;

// Mutation: Delete an appointment
export const DELETE_APPOINTMENT = gql`
  mutation DeleteAppointment($input: DeleteAppointmentInput!) {
    deleteAppointment(input: $input)
  }
`;

// Mutation: Update appointment status
export const UPDATE_APPOINTMENT_STATUS = gql`
  mutation UpdateAppointmentStatus($appointmentId: Int!, $status: String!) {
    updateAppointmentStatus(appointmentId: $appointmentId, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

// Mutation: Update contact status
export const UPDATE_CONTACT_STATUS = gql`
  mutation UpdateContactStatus($contactId: Int!, $status: String!) {
    updateContactStatus(contactId: $contactId, status: $status) {
      id
      status
      updatedAt
    }
  }
`;
