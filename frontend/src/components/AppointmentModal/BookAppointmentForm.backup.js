import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { appointmentsService } from '../../services/firebaseService';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, getDocs, serverTimestamp } from 'firebase/firestore';

// Styled components
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

  h2 {
    color: #2d3748;
    margin-bottom: 1.5rem;
    text-align: center;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: #4a6cf7;
    box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
  }
  
  &::placeholder {
    color: #a0aec0;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  min-height: 120px;
  resize: vertical;
  width: 100%;
  transition: all 0.2s ease;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #4a6cf7;
    box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
  }
  
  &::placeholder {
    color: #a0aec0;
  }
`;

const Button = styled.button`
  background-color: #4a6cf7;
  color: white;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 0.5rem;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    background-color: #3a5ce4;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
    transform: none;
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

// Main component for booking appointments
function BookAppointmentForm() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    time: '',
    notes: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Reset messages
    setFormError(null);
    setFormSuccess(null);
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.phone || !formData.service || !formData.date || !formData.time) {
      setFormError('Please fill in all required fields');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    // Format the appointment data for Firebase
    const appointmentDate = new Date(`${formData.date}T${formData.time}`);
    
    // Validate appointment date is in the future
    const now = new Date();
    if (appointmentDate <= now) {
      setFormError('Appointment date must be in the future');
      return;
    }
    
    const appointmentPayload = {
      userId: currentUser?.uid || 'anonymous',
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      service: formData.service,
      appointmentDate: appointmentDate.toISOString(),
      status: 'pending',
      notes: formData.notes || '',
      documentSigned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      console.log('Attempting to create appointment with payload:', appointmentPayload);
      setIsLoading(true);
      
      // Create appointment in Firebase
      const result = await appointmentsService.createAppointment(appointmentPayload);
      
      console.log('Appointment created successfully:', result);
      setFormSuccess('Appointment booked successfully!');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        service: '',
        date: '',
        time: '',
        notes: ''
      });
      
      // Optional: Redirect after a short delay
      setTimeout(() => {
        navigate('/appointments');
      }, 2000);
      
    } catch (error) {
      console.error('Error creating appointment:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        fullError: error
      });
      
      let errorMessage = 'Failed to book appointment. Please try again.';
      
      if (error.code) {
        switch (error.code) {
          case 'permission-denied':
            errorMessage = 'You do not have permission to create an appointment.';
            break;
          case 'unavailable':
            errorMessage = 'Service is currently unavailable. Please try again later.';
            break;
          default:
            errorMessage = `Error: ${error.message || error.code}`;
        }
      }
      
      setFormError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate time slots from 9:00 AM to 5:00 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      slots.push(
        <option key={time} value={time}>
          {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
        </option>
      );
    }
    return slots;
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>Book an Appointment</h2>
      
      {!isFirebaseConnected && (
        <Message className="info">
          Connecting to the server...
        </Message>
      )}
      
      <FormGroup>
        <label htmlFor="firstName" className="required">First Name</label>
        <Input
          id="firstName"
          name="firstName"
          value={formData.firstName}
          onChange={handleInputChange}
          placeholder="John"
          disabled={isLoading || !isFirebaseConnected}
        />
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="lastName" className="required">Last Name</label>
        <Input
          id="lastName"
          name="lastName"
          value={formData.lastName}
          onChange={handleInputChange}
          placeholder="Doe"
          disabled={isLoading || !isFirebaseConnected}
        />
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="email" className="required">Email</label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="your.email@example.com"
          disabled={isLoading || !isFirebaseConnected}
        />
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="phone" className="required">Phone Number</label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleInputChange}
          placeholder="+1 (555) 555-5555"
          disabled={isLoading || !isFirebaseConnected}
        />
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="service" className="required">Service Type</label>
        <Select
          id="service"
          name="service"
          value={formData.service}
          onChange={handleInputChange}
          disabled={isLoading || !isFirebaseConnected}
          required
        >
          <option value="">Select a service</option>
          <option value="tax-preparation">Tax Preparation</option>
          <option value="bookkeeping">Bookkeeping</option>
          <option value="financial-consulting">Financial Consulting</option>
          <option value="business-formation">Business Formation</option>
          <option value="irs-representation">IRS Representation</option>
          <option value="other">Other (please specify in notes)</option>
        </Select>
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="date" className="required">Appointment Date</label>
        <Input
          id="date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleInputChange}
          min={new Date().toISOString().split('T')[0]}
          disabled={isLoading || !isFirebaseConnected}
          required
        />
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="time" className="required">Appointment Time</label>
        <Select
          id="time"
          name="time"
          value={formData.time}
          onChange={handleInputChange}
          disabled={isLoading || !isFirebaseConnected || !formData.date}
          required
        >
          <option value="">Select a time</option>
          {formData.date && generateTimeSlots()}
        </Select>
        <small>Business hours: 9:00 AM - 5:00 PM, Monday to Friday</small>
      </FormGroup>
      
      <FormGroup>
        <label htmlFor="notes">Additional Notes</label>
        <TextArea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Please provide any additional information that might be helpful..."
          disabled={isLoading || !isFirebaseConnected}
          rows={4}
        />
      </FormGroup>
      
      {formError && (
        <Message className="error">
          {formError}
        </Message>
      )}
      
      {formSuccess && (
        <Message className="success">
          {formSuccess}
        </Message>
      )}
      
      <Button 
        type="submit" 
        disabled={isLoading || !isFirebaseConnected}
      >
        {isLoading ? (
          <>
            <span className="spinner">⏳</span> Processing...
          </>
        ) : (
          'Book Appointment'
        )}
      </Button>
      
      {!currentUser && (
        <Message className="info" style={{ marginTop: '1rem' }}>
          <strong>Note:</strong> Creating an account will allow you to manage your appointments and receive reminders.
        </Message>
      )}
    </Form>
  );
}

export default BookAppointmentForm;
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
      setFormError(null);
      setIsPreparing(true);
      
      // 1. First create the appointment in the database
      // Format the date and time for the appointment
      const appointmentDate = new Date(`${appointmentData.date}T${appointmentData.time}`);
      
      // Validate appointment date is in the future
      const now = new Date();
      if (appointmentDate <= now) {
        throw new Error('Appointment date must be in the future');
      }
      
      // Format the date for the appointment
      const formattedDate = appointmentDate.toISOString();
      
      // Prepare the input object with all required fields
      const input = {
        firstName: appointmentData.firstName,
        lastName: appointmentData.lastName,
        email: appointmentData.email,
        phone: appointmentData.phone,
        service: appointmentData.service,
        appointmentDate: formattedDate,
        notes: appointmentData.notes || '',
        documentSigned: false,
        status: 'pending', // Ensure a default status is set
        envelopeId: null,
        documentUrl: null
      };
      
      // Debug log to verify the input structure
      console.log('Prepared input object:', JSON.stringify(input, null, 2));
      
      // Execute the mutation
      const { data, errors } = await createAppointment({
        variables: { input },
        errorPolicy: 'all' // This ensures we get partial results even if there are errors
      });
      
      // Check for errors in the response
      if (errors && errors.length > 0) {
        const errorMessages = errors.map(err => err.message).join('; ');
        throw new Error(`Appointment creation failed: ${errorMessages}`);
      }
      
      // Verify we got a valid response
      if (!data?.createAppointment?.id) {
        console.error('Unexpected response format:', { data });
        throw new Error('Received an invalid response from the server');
      }
      
      console.log('Appointment created with ID:', data.createAppointment.id);
      
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

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(formData.email)) {
  setFormError('Please enter a valid email address');
  return;
}

// Format the appointment data for Firebase
const appointmentDate = new Date(`${formData.date}T${formData.time}`);

// Validate appointment date is in the future
const now = new Date();
if (appointmentDate <= now) {
  setFormError('Appointment date must be in the future');
  return;
}

const appointmentPayload = {
  userId: currentUser?.uid || 'anonymous',
  firstName: formData.firstName,
  lastName: formData.lastName,
  email: formData.email,
  phone: formData.phone,
  service: formData.service,
  appointmentDate: appointmentDate.toISOString(),
  status: 'pending',
  notes: formData.notes || '',
  documentSigned: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

try {
  setIsLoading(true);
  
  // Create appointment in Firebase
  const result = await appointmentsService.createAppointment(appointmentPayload);
  
  console.log('Appointment created successfully:', result);
  setFormSuccess('Appointment booked successfully!');
  
  // Reset form
  setFormData({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    date: '',
    time: '',
    notes: ''
  });
  
  // Optional: Redirect or close modal after success
  // navigate('/appointments');
  
} catch (error) {
  console.error('Error creating appointment:', error);
  setFormError(error.message || 'Failed to book appointment. Please try again.');
} finally {
  setIsLoading(false);
}

try {
  setFormError(null);
  setIsPreparing(true);
  
  // 1. First create the appointment in the database
  // Format the date and time for the appointment
  const appointmentDate = new Date(`${appointmentData.date}T${appointmentData.time}`);
  
  // Validate appointment date is in the future
  const now = new Date();
  if (appointmentDate <= now) {
    throw new Error('Appointment date must be in the future');
  }
  
  // Format the date for the appointment
  const formattedDate = appointmentDate.toISOString();
  
  // Prepare the input object with all required fields
  const input = {
    firstName: appointmentData.firstName,
    lastName: appointmentData.lastName,
    email: appointmentData.email,
    phone: appointmentData.phone,
    service: appointmentData.service,
    appointmentDate: formattedDate,
    notes: appointmentData.notes || '',
    documentSigned: false,
    status: 'pending', // Ensure a default status is set
    envelopeId: null,
    documentUrl: null
  };
  
  // Debug log to verify the input structure
  console.log('Prepared input object:', JSON.stringify(input, null, 2));
  
  // Execute the mutation
  const { data, errors } = await createAppointment({
    variables: { input },
    errorPolicy: 'all' // This ensures we get partial results even if there are errors
  });
  
  // Check for errors in the response
  if (errors && errors.length > 0) {
    const errorMessages = errors.map(err => err.message).join('; ');
    throw new Error(`Appointment creation failed: ${errorMessages}`);
  }
  
  // Verify we got a valid response
  if (!data?.createAppointment?.id) {
    console.error('Unexpected response format:', { data });
    throw new Error('Received an invalid response from the server');
  }
  
  console.log('Appointment created with ID:', data.createAppointment.id);
  
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

return (
  <Form onSubmit={handleSubmit}>
    <h2>Book an Appointment</h2>
    
    <div>
      <label htmlFor="firstName">First Name *</label>
      <Input
        id="firstName"
        name="firstName"
        value={formData.firstName}
        onChange={handleInputChange}
        placeholder="John"
        required
      />
    </div>
    
    <div>
      <label htmlFor="lastName">Last Name *</label>
      <Input
        id="lastName"
        name="lastName"
        value={formData.lastName}
        onChange={handleInputChange}
        placeholder="Doe"
        required
      />
    </div>
    
    <div>
      <label htmlFor="email">Email *</label>
      <Input
        id="email"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleInputChange}
        placeholder="your.email@example.com"
        required
      />
    </div>
    
    <div>
      <label htmlFor="phone">Phone *</label>
      <Input
        id="phone"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleInputChange}
        placeholder="+1 (555) 555-5555"
        required
      />
    </div>
    
    <div>
      <label htmlFor="service">Service *</label>
      <select
        id="service"
        name="service"
        value={formData.service}
        onChange={handleInputChange}
        required
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '1rem',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}
      >
        <option value="">Select a service</option>
        <option value="consultation">Consultation</option>
        <option value="tax-preparation">Tax Preparation</option>
        <option value="bookkeeping">Bookkeeping</option>
        <option value="financial-planning">Financial Planning</option>
      </select>
    </div>
    
    <div>
      <label htmlFor="date">Date *</label>
      <Input
        id="date"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleInputChange}
        min={new Date().toISOString().split('T')[0]}
        required
      />
    </div>
    
    <div>
      <label htmlFor="time">Time *</label>
      <Input
        id="time"
        name="time"
        type="time"
        value={formData.time}
        onChange={handleInputChange}
        min="09:00"
        max="17:00"
        required
      />
      <small>Business hours: 9:00 AM - 5:00 PM</small>
    </div>
    
    <div>
      <label htmlFor="notes">Notes (Optional)</label>
      <TextArea
        id="notes"
        name="notes"
        value={formData.notes}
        onChange={handleInputChange}
        placeholder="Any additional information..."
      />
    </div>
    
    {formError && <ErrorMessage>{formError}</ErrorMessage>}
    {formSuccess && <SuccessMessage>{formSuccess}</SuccessMessage>}
    
    <Button type="submit" disabled={isLoading}>
      {isLoading ? 'Booking...' : 'Book Appointment'}
    </Button>
    
    {!currentUser && (
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '1rem' }}>
        Note: Creating an account will allow you to manage your appointments.
      </p>
    )}
  </Form>
);
        {isPreparing ? 'Preparing Document...' : isSigning ? 'Opening DocuSign...' : loading ? 'Saving...' : 'Book Appointment & Sign Documents'}
      </Button>
    </Form>
  );
}

export default BookAppointmentForm;
