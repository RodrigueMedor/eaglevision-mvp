import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import axios from 'axios';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

export const CREATE_APPOINTMENT = gql`
  mutation CreateAppointment(
    $input: CreateAppointmentInput! {
      firstName: String!
      lastName: String!
      email: String!
      phone: String!
      service: String!
      appointmentDate: DateTime!
      notes: String
      documentSigned: Boolean
      envelopeId: String
      documentUrl: String
    }
  ) {
    createAppointment(input: {
      firstName: $input.firstName
      lastName: $input.lastName
      email: $input.email
      phone: $input.phone
      service: $input.service
      appointmentDate: $input.appointmentDate
      notes: $input.notes
      documentSigned: $input.documentSigned
      envelopeId: $input.envelopeId
      documentUrl: $input.documentUrl
    }) {
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #4a6cf7;
    box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #4a6cf7;
    box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
  }
`;

const Button = styled.button`
  background-color: #4a6cf7;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3a5ce4;
  }
  
  &:disabled {
    background-color: #a0a0a0;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #e53e3e;
  background-color: #fff5f5;
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  border: 1px solid #fc8181;
`;

const SuccessMessage = styled.div`
  color: #38a169;
  background-color: #f0fff4;
  padding: 0.75rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  border: 1px solid #9ae6b4;
`;

function BookAppointmentForm() {
  const navigate = useNavigate();
  const [createAppointment, { loading, error, data }] = useMutation(CREATE_APPOINTMENT, {
    onError: (error) => {
      console.error('GraphQL Error:', error);
      setFormError(error.message || 'Failed to create appointment');
      setIsPreparing(false);
    },
    onCompleted: (data) => {
      console.log('Appointment created:', data);
    }
  });
  
  const [isSigning, setIsSigning] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const appointmentData = {
      firstName: formData.get('firstName').trim(),
      lastName: formData.get('lastName').trim(),
      email: formData.get('email').trim(),
      phone: formData.get('phone').trim(),
      service: formData.get('service'),
      date: formData.get('date'),
      time: formData.get('time'),
      notes: formData.get('notes')?.trim() || null
    };

    // Form validation
    if (!appointmentData.firstName || !appointmentData.lastName || !appointmentData.email || 
        !appointmentData.phone || !appointmentData.service || !appointmentData.date || !appointmentData.time) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(appointmentData.email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    try {
      setFormError(null);
      setIsPreparing(true);
      
      // 1. First create the appointment in the database
      // Format the date and time for the appointment
      const appointmentDate = new Date(`${appointmentData.date}T${appointmentData.time}`);
      
      // Format the date for the appointment
      const formattedDate = appointmentDate.toISOString();
      
      const input = {
        firstName: appointmentData.firstName,
        lastName: appointmentData.lastName,
        email: appointmentData.email,
        phone: appointmentData.phone,
        service: appointmentData.service,
        appointmentDate: formattedDate, // Make sure this matches the backend's expected field name
        notes: appointmentData.notes || '',
        documentSigned: false,
        envelopeId: null,
        documentUrl: null
      };
      
      // Debug log to verify the input structure
      console.log('Prepared input object:', JSON.stringify(input, null, 2));
      
      console.log('Sending appointment data:', JSON.stringify({ input }, null, 2));
      
      const { data } = await createAppointment({
        variables: { input }
      });
      
      if (!data?.createAppointment?.id) {
        throw new Error('Failed to create appointment');
      }
      
      // 2. Prepare DocuSign signing request
      const signer = {
        email: appointmentData.email,
        name: `${appointmentData.firstName} ${appointmentData.lastName}`,
        client_user_id: appointmentData.email,
        recipient_id: '1',
        routing_order: '1'
      };
      
      const returnUrl = `${window.location.origin}/appointment-confirmation?appointmentId=${data.createAppointment.id}`;
      
      try {
        // 3. Initiate DocuSign signing
        const response = await axios.post('/api/docusign/envelope', {
          signer,
          returnUrl,
          appointment: {
            ...appointmentData,
            id: data.createAppointment.id,
            appointmentDate: appointmentDate.toISOString()
          }
        });
        
        // 4. Redirect to DocuSign signing page
        if (response.data?.redirect_url) {
          setIsSigning(true);
          // Store appointment ID in localStorage for later reference
          localStorage.setItem('pendingAppointmentId', data.createAppointment.id);
          
          // Open in new tab for better UX
          const newWindow = window.open(response.data.redirect_url, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            // If popup was blocked, show instructions
            alert('Please allow popups for this site to complete your document signing. Click OK to proceed to DocuSign.');
            window.location.href = response.data.redirect_url;
          } else {
            // Show success message and close modal after a short delay
            setFormSuccess('Please complete the document signing to confirm your appointment.');
            // Optionally close the modal after a delay
            setTimeout(() => {
              window.location.href = returnUrl;
            }, 3000);
          }
        } else {
          throw new Error('No redirect URL received from DocuSign');
        }
      } catch (docusignError) {
        console.error('DocuSign error:', docusignError);
        // Even if DocuSign fails, we still created the appointment
        if (data?.createAppointment?.id) {
          // Show success but mention about DocuSign issue
          setFormSuccess('Appointment created! There was an issue with the document signing. We will contact you shortly.');
          // Redirect to confirmation page
          setTimeout(() => {
            navigate(`/appointment-confirmation?appointmentId=${data.createAppointment.id}`);
          }, 3000);
        }
        throw docusignError;
      }
      
    } catch (err) {
      console.error('Error in appointment process:', err);
      setFormError(err.message || 'Failed to book appointment. Please try again.');
      setIsPreparing(false);
      // Re-throw to be caught by the form's error boundary
      throw err;
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>Book an Appointment</h2>
      
      <div>
        <label htmlFor="firstName">First Name</label>
        <Input
          id="firstName"
          name="firstName"
          placeholder="John"
          required
        />
      </div>
      
      <div>
        <label htmlFor="lastName">Last Name</label>
        <Input
          id="lastName"
          name="lastName"
          placeholder="Doe"
          required
        />
      </div>
      
      <div>
        <label htmlFor="email">Email</label>
        <Input
          type="email"
          id="email"
          name="email"
          placeholder="your.email@example.com"
          required
        />
      </div>
      
      <div>
        <label htmlFor="phone">Phone Number</label>
        <Input
          type="tel"
          id="phone"
          name="phone"
          placeholder="(123) 456-7890"
          required
        />
      </div>
      
      <div>
        <label htmlFor="service">Service</label>
        <Input
          id="service"
          name="service"
          placeholder="e.g., Comprehensive Eye Exam"
          required
        />
      </div>
      
      <div>
        <label htmlFor="date">Date</label>
        <Input
          type="date"
          id="date"
          name="date"
          required
          min={new Date().toISOString().split('T')[0]}
        />
      </div>
      
      <div>
        <label htmlFor="time">Time</label>
        <Input
          type="time"
          id="time"
          name="time"
          required
          min="09:00"
          max="17:00"
        />
      </div>
      
      <div>
        <label htmlFor="notes">Additional Notes (Optional)</label>
        <TextArea
          id="notes"
          name="notes"
          placeholder="Any specific requirements or questions..."
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={loading || isPreparing || isSigning}
        onClick={(e) => {
          // Ensure the form is submitted even if there's a disabled state issue
          if (loading || isPreparing || isSigning) {
            e.preventDefault();
            return false;
          }
        }}
      >
        {isPreparing ? 'Preparing Document...' : isSigning ? 'Opening DocuSign...' : loading ? 'Saving...' : 'Book Appointment & Sign Documents'}
      </Button>
    </Form>
  );
}

export default BookAppointmentForm;
