import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const AppointmentForm = ({ open, onClose, appointment, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    appointmentDate: new Date(),
    status: 'PENDING',
    notes: '',
    documentSigned: false,
    envelopeId: '',
    documentUrl: ''
  });

  // Update form data when appointment prop changes (for edit mode)
  useEffect(() => {
    if (appointment) {
      setFormData({
        id: appointment.id,
        firstName: appointment.firstName || '',
        lastName: appointment.lastName || '',
        email: appointment.email || '',
        phone: appointment.phone || '',
        service: appointment.service || '',
        appointmentDate: new Date(appointment.appointmentDate) || new Date(),
        status: appointment.status || 'PENDING',
        notes: appointment.notes || '',
        documentSigned: appointment.documentSigned || false,
        envelopeId: appointment.envelopeId || '',
        documentUrl: appointment.documentUrl || ''
      });
    } else {
      // Reset form for new appointment
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        service: '',
        appointmentDate: new Date(),
        status: 'PENDING',
        notes: '',
        documentSigned: false,
        envelopeId: '',
        documentUrl: ''
      });
    }
  }, [appointment, open]);

  const formatPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const numbers = phone.replace(/\D/g, '');
    
    // If it's a US/Canada number (10 digits), format as (XXX) XXX-XXXX
    if (numbers.length === 10) {
      return `+1 (${numbers.substring(0, 3)}) ${numbers.substring(3, 6)}-${numbers.substring(6)}`;
    }
    // If it's already in +1 (XXX) XXX-XXXX format, return as is
    else if (numbers.length === 11 && numbers.startsWith('1')) {
      return `+1 (${numbers.substring(1, 4)}) ${numbers.substring(4, 7)}-${numbers.substring(7)}`;
    }
    // For other formats, just return the number as is
    return phone;
  };

  const handlePhoneChange = (e) => {
    const { value } = e.target;
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    
    // If it's a US/Canada number (10 digits), format it
    if (numbers.length <= 10) {
      const formatted = numbers.replace(/^1?/, ''); // Remove leading 1 if present
      setFormData(prev => ({
        ...prev,
        phone: `+1${formatted}`
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Skip if this is a phone number change (handled by handlePhoneChange)
    if (name === 'phone') return;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      appointmentDate: date
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const services = [
    'Tax Preparation',
    'Financial Planning',
    'Bookkeeping',
    'Audit',
    'Consulting'
  ];

  const statuses = [
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{appointment ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={formatPhoneNumber(formData.phone)}
                onChange={handlePhoneChange}
                required
                margin="normal"
                placeholder="+1 (555) 123-4567"
                inputProps={{
                  maxLength: 18, // +1 (XXX) XXX-XXXX is 17 characters
                  inputMode: 'tel'
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Service</InputLabel>
                <Select
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  required
                  label="Service"
                >
                  {services.map(service => (
                    <MenuItem key={service} value={service}>
                      {service}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Appointment Date & Time"
                  value={formData.appointmentDate}
                  onChange={handleDateChange}
                  minDateTime={new Date()} // This disables past dates and times
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="normal" required />
                  )}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  label="Status"
                >
                  {statuses.map(status => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.documentSigned}
                    onChange={handleChange}
                    name="documentSigned"
                    color="primary"
                  />
                }
                label="Document Signed"
              />
            </Grid>
            {formData.documentSigned && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Envelope ID"
                    name="envelopeId"
                    value={formData.envelopeId}
                    onChange={handleChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Document URL"
                    name="documentUrl"
                    value={formData.documentUrl}
                    onChange={handleChange}
                    margin="normal"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Cancel
          </Button>
          <Button type="submit" color="primary" variant="contained">
            {appointment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AppointmentForm;
