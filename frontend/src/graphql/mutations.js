import { gql } from '@apollo/client';

export const CREATE_CONTACT = gql`
  mutation CreateContact($input: ContactInput!) {
    createContact(input: $input) {
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

export const GET_USER_APPOINTMENTS = gql`
  query GetUserAppointments($userId: Int!) {
    userAppointments(userId: $userId) {
      id
      userId
      service
      appointmentDate
      status
      notes
      documentSigned
      envelopeId
      documentUrl
      firstName
      lastName
      email
      phone
      createdAt
      updatedAt
      user {
        fullName
        email
      }
    }
  }
`;

export const CREATE_APPOINTMENT = gql`
  mutation CreateAppointment($input: CreateAppointmentInput!) {
    createAppointment(input: $input) {
      id
      userId
      service
      appointmentDate
      status
      notes
      documentSigned
      envelopeId
      documentUrl
      firstName
      lastName
      email
      phone
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_APPOINTMENT = gql`
  mutation UpdateAppointment($input: UpdateAppointmentInput!) {
    updateAppointment(input: $input) {
      id
      userId
      service
      appointmentDate
      status
      notes
      documentSigned
      envelopeId
      documentUrl
      updatedAt
    }
  }
`;
