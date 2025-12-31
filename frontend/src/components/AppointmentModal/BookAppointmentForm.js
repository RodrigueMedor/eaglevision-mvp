import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { appointmentsService } from '../../services/firebaseService';
import { AuthContext } from '../../context/AuthContext';

/* ================== STYLES ================== */

const Form = styled.form`
  max-width: 500px;
  margin: auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,.1);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const Input = styled.input`
  width: 100%;
  padding: .75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Select = styled.select`
  width: 100%;
  padding: .75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: .75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
`;

const Button = styled.button`
  width: 100%;
  padding: .75rem;
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;

  &:disabled {
    background: #aaa;
  }
`;

const ErrorMessage = styled.div`
  color: #e53e3e;
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  color: #38a169;
  margin-top: 1rem;
`;

/* ================== COMPONENT ================== */

export default function BookAppointmentForm() {
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

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

  const handleChange = e =>
      setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email address');
      return;
    }

    const appointmentDate = new Date(`${formData.date}T${formData.time}`);
    if (appointmentDate <= new Date()) {
      setError('Appointment must be in the future');
      return;
    }

    const payload = {
      ...formData,
      userId: currentUser?.uid || 'anonymous',
      appointmentDate: appointmentDate.toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      setLoading(true);
      await appointmentsService.createAppointment(payload);
      setSuccess('Appointment booked successfully!');
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

      setTimeout(() => navigate('/appointments'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
      <Form onSubmit={handleSubmit}>
        <h2>Book Appointment</h2>

        {['firstName','lastName','email','phone'].map(field => (
            <FormGroup key={field}>
              <Input
                  name={field}
                  placeholder={field.replace(/([A-Z])/g,' $1')}
                  value={formData[field]}
                  onChange={handleChange}
                  required
              />
            </FormGroup>
        ))}

        <FormGroup>
          <Select name="service" value={formData.service} onChange={handleChange} required>
            <option value="">Select Service</option>
            <option value="tax">Tax Preparation</option>
            <option value="bookkeeping">Bookkeeping</option>
            <option value="consulting">Consulting</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Input type="date" name="date" value={formData.date} onChange={handleChange} required />
        </FormGroup>

        <FormGroup>
          <Input type="time" name="time" value={formData.time} onChange={handleChange} required />
        </FormGroup>

        <FormGroup>
          <TextArea
              name="notes"
              placeholder="Additional notes"
              value={formData.notes}
              onChange={handleChange}
          />
        </FormGroup>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <Button disabled={loading}>
          {loading ? 'Booking...' : 'Book Appointment'}
        </Button>
      </Form>
  );
}