import React, { useState, useRef } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_APPOINTMENT, UPDATE_APPOINTMENT } from '../../graphql/mutations';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  Box,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import DocuSignModal from '../DocuSign/DocuSignModal';

const services = [
  'Tax Preparation',
  'Immigration Consultation',
  'Document Review',
  'Business Services',
  'Other'
];

const AppointmentModal = ({ open, onClose }) => {
  const [createAppointment, { loading: creating }] = useMutation(CREATE_APPOINTMENT, {
    onError: (error) => {
      console.error('Error creating appointment:', error);
      // Extract the error message from the GraphQL error
      const errorMessage = error.graphQLErrors?.[0]?.message || 
                         error.message || 
                         'Failed to create appointment. Please try again.';
      
      setErrors(prev => ({
        ...prev,
        form: errorMessage
      }));
      
      // Auto-hide the error after 5 seconds
      setTimeout(() => {
        setErrors(prev => ({
          ...prev,
          form: ''
        }));
      }, 5000);
    }
  });
  const [updateAppointment, { loading: updating }] = useMutation(UPDATE_APPOINTMENT, {
    onError: (error) => console.error('Error updating appointment:', error)
  });
  const isSubmitting = creating || updating;
  const [showDocuSign, setShowDocuSign] = useState(false);
  const formDataRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+1 ',  // Default +1 prefix for US numbers
    service: '',
    date: null,
    time: null,
    notes: ''
  });
  const [errors, setErrors] = useState({ form: '' });

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Enhanced US phone number validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      // Remove all non-digit characters
      const cleaned = formData.phone.replace(/\D/g, '');
      // Check if it's a valid US phone number (10 digits or 11 digits starting with 1)
      const isValid = /^(\+?1\s?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|[0-9]{10})$/.test(formData.phone);
      
      if (!isValid) {
        newErrors.phone = 'Please enter a valid US phone number (e.g., +1 (123) 456-7890)';
      } else {
        // Format the phone number with +1 prefix
        const digits = cleaned.replace(/^1/, ''); // Remove leading 1 if present
        const match = digits.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
          const formattedNumber = `+1 (${match[1]}) ${match[2]}-${match[3]}`;
          setFormData(prev => ({
            ...prev,
            phone: formattedNumber
          }));
        }
      }
    }
    
    if (!formData.service) newErrors.service = 'Please select a service';
    if (!formData.date) newErrors.date = 'Please select a date';
    if (!formData.time) newErrors.time = 'Please select a time';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // If empty, return just +1
    if (cleaned === '1') return '+1 ';
    
    // Remove the 1 if it's the first digit after +1
    const digits = cleaned.startsWith('1') ? cleaned.substring(1) : cleaned;
    
    // Format the number as +1 (XXX) XXX-XXXX
    let formattedNumber = '+1 ';
    
    if (digits.length > 0) {
      formattedNumber += '(' + digits.substring(0, 3);
    }
    if (digits.length > 3) {
      formattedNumber += ') ' + digits.substring(3, 6);
    }
    if (digits.length > 6) {
      formattedNumber += '-' + digits.substring(6, 10);
    }
    
    return formattedNumber;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      // If user tries to delete +1, prevent it
      if (!value.startsWith('+1') && value !== '') {
        return;
      }
      
      // Format the phone number
      const formatted = formatPhoneNumber(value);
      
      // Update the input value
      e.target.value = formatted;
      
      // Update the form data
      setFormData(prev => ({
        ...prev,
        phone: formatted
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleTimeChange = (time) => {
    // Ensure time is stored in a consistent format
    let formattedTime = time;
    if (time && typeof time === 'object' && time.format) {
      // Handle moment.js or similar time picker
      formattedTime = time.format('HH:mm');
    }
    
    setFormData(prev => ({
      ...prev,
      time: formattedTime
    }));
  };

  const handleSigningComplete = async (signedDocumentData) => {
    if (!formDataRef.current) return;
    
    try {
      // If we have an appointment ID, update it with DocuSign info
      if (formDataRef.current.id) {
        const updateData = {
          id: formDataRef.current.id,
          documentSigned: true,
          envelopeId: signedDocumentData?.envelopeId,
          documentUrl: signedDocumentData?.documentUrl
        };

        // Call the update mutation
        await updateAppointment({
          variables: {
            input: updateData
          }
        });
      }
      
      // Show success message and close modal
      alert('Appointment booked successfully!');
      
      // Close the DocuSign modal
      setShowDocuSign(false);
      
      // Close the appointment modal
      onClose();
    } catch (error) {
      console.error('Error updating appointment with DocuSign info:', error);
      setErrors(prev => ({
        ...prev,
        form: 'Appointment was created, but there was an error updating the signature status. Please contact support.'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      // Combine date and time
      const appointmentDateTime = new Date(formData.date);
      
      // Handle different time formats
      let hours, minutes;
      if (typeof formData.time === 'string') {
        // Handle 'HH:MM' format
        [hours, minutes] = formData.time.split(':');
      } else if (formData.time && typeof formData.time === 'object') {
        // Handle time object from time picker
        hours = formData.time.getHours();
        minutes = formData.time.getMinutes();
      } else {
        throw new Error('Invalid time format');
      }
      
      appointmentDateTime.setHours(parseInt(hours, 10));
      appointmentDateTime.setMinutes(parseInt(minutes, 10));

      // Prepare the appointment data
      const appointmentData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        service: formData.service,
        date: formData.date,
        time: formData.time,
        appointmentDate: appointmentDateTime.toISOString(), // Changed from appointment_date to appointmentDate
        notes: formData.notes
      };
      
      console.log('Appointment data prepared:', JSON.stringify(appointmentData, null, 2));

      // Save the form data for DocuSign
      formDataRef.current = appointmentData;
      
      try {
        // First create the appointment
        const { data, errors: gqlErrors } = await createAppointment({
          variables: {
            input: {
              ...appointmentData,
              // Remove date and time as they're not part of the GraphQL input type
              date: undefined,
              time: undefined
            }
          },
          errorPolicy: 'all' // This allows us to handle GraphQL errors manually
        });

        if (gqlErrors && gqlErrors.length > 0) {
          // Extract the error message from the GraphQL error
          const errorMessage = gqlErrors[0]?.message || 'Failed to create appointment. Please try again.';
          
          // Handle specific error messages
          if (errorMessage.includes('already booked') || errorMessage.includes('time slot')) {
            throw new Error('This time slot is already booked. Please choose a different time.');
          } else if (errorMessage.includes('already have an appointment')) {
            throw new Error(errorMessage); // Keep the original message
          } else {
            throw new Error(errorMessage);
          }
        }

        if (data?.createAppointment?.id) {
          // Update the form data with the appointment ID
          formDataRef.current = {
            ...appointmentData,
            id: data.createAppointment.id
          };
          // Show DocuSign modal only after successful appointment creation
          setShowDocuSign(true);
        } else {
          throw new Error('Failed to create appointment. Please try again.');
        }
      } catch (error) {
        console.error('Error creating appointment:', error);
        setErrors(prev => ({
          ...prev,
          form: error.message || 'Failed to create appointment. Please try again.'
        }));
        return; // Don't proceed with DocuSign if there was an error
      }
    } catch (error) {
      console.error('Error preparing appointment:', error);
      setErrors(prev => ({
        ...prev,
        form: 'Failed to prepare the appointment. Please try again.'
      }));
    }
  };

  return (
    <>
      <DocuSignModal
        open={showDocuSign}
        onClose={() => setShowDocuSign(false)}
        onSigningComplete={handleSigningComplete}
        formData={formData}
      />
      <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
        sx: {
          borderRadius: 2,
          p: 2
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="div">
            Book an Appointment
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            aria-label="close"
            sx={{ ml: 2 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={!!errors.firstName}
              helperText={errors.firstName}
              margin="normal"
              variant="outlined"
              autoComplete="given-name"
              inputProps={{
                'data-1p-ignore': true,
                'data-lpignore': 'true',
                'data-form-type': 'other'
              }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={!!errors.lastName}
              helperText={errors.lastName}
              margin="normal"
              variant="outlined"
              autoComplete="family-name"
              inputProps={{
                'data-1p-ignore': true,
                'data-lpignore': 'true',
                'data-form-type': 'other'
              }}
              required
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
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
              variant="outlined"
              autoComplete="email"
              inputProps={{
                'data-1p-ignore': true,
                'data-lpignore': 'true',
                'data-form-type': 'other'
              }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={!!errors.phone}
              helperText={errors.phone}
              margin="normal"
              variant="outlined"
              autoComplete="tel"
              inputProps={{
                'data-1p-ignore': true,
                'data-lpignore': 'true',
                'data-form-type': 'other',
                inputMode: 'tel'
              }}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Service Needed"
              name="service"
              value={formData.service}
              onChange={handleChange}
              error={!!errors.service}
              helperText={errors.service}
              margin="normal"
              variant="outlined"
              required
            >
              {services.map((service) => (
                <MenuItem key={service} value={service}>
                  {service}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Appointment Date"
                value={formData.date}
                onChange={handleDateChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                    error={!!errors.date}
                    helperText={errors.date}
                    required
                  />
                )}
                minDate={new Date()}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Preferred Time"
                value={formData.time}
                onChange={handleTimeChange}
                shouldDisableTime={(timeValue, clockType) => {
                  if (clockType === 'minutes') {
                    // Only allow times on the hour or half hour
                    return timeValue % 30 !== 0;
                  }
                  return false;
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    margin="normal"
                    error={!!errors.time}
                    helperText={errors.time || 'Available between 9:00 AM - 5:00 PM'}
                    required
                  />
                )}
                ampm={true}
                minutesStep={30}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              margin="normal"
              variant="outlined"
              multiline
              rows={4}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 0 }}>
        {errors.form && (
          <Box sx={{ 
            color: 'error.main', 
            p: 2, 
            pt: 0, 
            width: '100%',
            textAlign: 'center'
          }}>
            {errors.form}
          </Box>
        )}
        <Button 
          onClick={() => {
            onClose();
            setErrors({ form: '' });
          }} 
          disabled={isSubmitting}
          type="button"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          color="primary" 
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          sx={{ ml: 2 }}
        >
          {isSubmitting ? 'Booking...' : 'Book Appointment'}
        </Button>
      </DialogActions>
    </Dialog>
  </>
);
};

export default AppointmentModal;
