import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button,
  Chip,
  TextField, 
  MenuItem, 
  Typography, 
  Paper, 
  Grid,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Container,
  Divider,
  InputAdornment,
  FormHelperText,
  ListSubheader
} from '@mui/material';
import { 
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Description as NotesIcon,
  Work as WorkIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays } from 'date-fns';
import { appointmentsService } from '../../services/firebaseService';
import { useAuth } from '../../context/FirebaseAuthContext';

// Service options with icons
const SERVICE_OPTIONS = [
  { value: 'tax_preparation', label: 'Tax Preparation', icon: <WorkIcon /> },
  { value: 'tax_consultation', label: 'Tax Consultation', icon: <WorkIcon /> },
  { value: 'business_tax', label: 'Business Tax Filing', icon: <WorkIcon /> },
  { value: 'personal_tax', label: 'Personal Tax Filing', icon: <PersonIcon /> },
  { value: 'tax_planning', label: 'Tax Planning', icon: <WorkIcon /> },
  { value: 'irs_problem', label: 'IRS Problem Resolution', icon: <WorkIcon /> },
  { value: 'other', label: 'Other Service', icon: <WorkIcon /> },
];

// Check if a time slot is available
const checkTimeSlotAvailability = async (date, time24) => {
  try {
    // Format the date to match the appointment date format
    const appointmentDate = new Date(date);
    const [hours, minutes] = time24.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);
    
    // Get the start and end of the selected date
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all appointments for the selected date
    const existingAppointments = await appointmentsService.getAppointmentsByDateRange(
      startOfDay.toISOString(),
      endOfDay.toISOString()
    );
    
    // Check if any appointment matches the selected time
    const isBooked = existingAppointments.some(apt => {
      const aptTime = new Date(apt.appointmentDate || apt.date);
      return aptTime.getHours() === hours && aptTime.getMinutes() === minutes;
    });
    
    return !isBooked;
  } catch (error) {
    console.error('Error checking time slot availability:', error);
    return true; // Default to available if there's an error
  }
};

// Generate time slots from 8 AM to 8 PM with 30-minute intervals, grouped by AM/PM
const generateTimeSlots = (existingAppointments = []) => {
  const slots = [];
  const startHour = 8; // 8 AM
  const endHour = 20;  // 8 PM
  
  // Create a Set of booked time slots for faster lookup
  const bookedSlots = new Set(
    existingAppointments
      .filter(apt => apt && (apt.appointmentDate || apt.date)) // Filter out invalid appointments
      .map(apt => {
        try {
          const dateStr = apt.appointmentDate || apt.date;
          if (!dateStr) return null;
          
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.error('Invalid date:', dateStr);
            return null;
          }
          
          // Convert to local time and format as HH:MM
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          
          return `${hours}:${minutes}`;
        } catch (error) {
          console.error('Error processing appointment:', apt, error);
          return null;
        }
      })
      .filter(Boolean) // Remove any null/undefined entries
  );
  
  console.log('Booked time slots:', Array.from(bookedSlots));
  
  console.log('Booked slots:', Array.from(bookedSlots)); // Debug log
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute of ['00', '30']) {
      // Skip the last 30-minute slot if it's 8:30 PM
      if (hour === endHour && minute === '30') continue;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const displayHour12 = displayHour === 0 ? 12 : displayHour; // Handle 12 AM/PM
      
      const time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
      const time12 = `${displayHour12}:${minute} ${period}`;
      const isBooked = bookedSlots.has(time24);
      
      slots.push({
        value: time24,
        label: time12,
        period: period,
        hour: hour,
        minute: minute,
        disabled: isBooked
      });
    }
  }
  
  return slots;
};

// Group time slots by AM/PM
const groupTimeSlots = (slots) => {
  return slots.reduce((groups, slot) => {
    const period = slot.period;
    if (!groups[period]) {
      groups[period] = [];
    }
    groups[period].push(slot);
    return groups;
  }, {});
};

/* ================== COMPONENT ================== */

const BookAppointmentForm = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuth();

  // Form state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1));
  const [touched, setTouched] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsGrouped, setTimeSlotsGrouped] = useState({});
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: '',
    date: addDays(new Date(), 1),
    time: '',
    notes: ''
  });
  
  // Loading and error states for time slots
  const [, setIsLoadingSlots] = useState(false);
  const [, setSlotError] = useState('');
  
  // Load time slots when the component mounts and when the selected date changes
  useEffect(() => {
    const loadTimeSlots = async () => {
      try {
        setIsLoadingSlots(true);
        setSlotError('');
        
        // Get existing appointments for the selected date
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        console.log('Fetching appointments between:', startOfDay, 'and', endOfDay);
        
        const existingAppointments = await appointmentsService.getAppointmentsByDateRange(
          startOfDay.toISOString(),
          endOfDay.toISOString()
        );
        
        console.log('Fetched appointments:', existingAppointments);
        
        // Generate time slots with booked slots marked as disabled
        const slots = generateTimeSlots(existingAppointments);
        const grouped = groupTimeSlots(slots);
        
        console.log('Generated slots:', slots);
        console.log('Grouped slots:', grouped);
        
        setTimeSlots(slots);
        setTimeSlotsGrouped(grouped);
      } catch (error) {
        console.error('Error loading time slots:', error);
        setSlotError('Failed to load available time slots. Please try again.');
        // Fallback to default time slots without availability info
        const slots = generateTimeSlots();
        setTimeSlots(slots);
        setTimeSlotsGrouped(groupTimeSlots(slots));
      } finally {
        setIsLoadingSlots(false);
      }
    };
    
    loadTimeSlots();
  }, [selectedDate]);

  // Pre-fill user data if available
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        firstName: currentUser.displayName?.split(' ')[0] || '',
        lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
        email: currentUser.email || '',
        phone: currentUser.phoneNumber || ''
      }));
    }
  }, [currentUser]);

  // Handle input changes and mark field as touched
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Clear any previous errors when user starts typing
    if (error) setError('');
  };

  // Handle date changes
  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setFormData(prev => ({
      ...prev,
      date: date,
      time: '' // Reset time when date changes
    }));
    
    // Mark date as touched
    setTouched(prev => ({
      ...prev,
      date: true
    }));
    
    // Reload time slots for the new date
    try {
      setIsLoadingSlots(true);
      setSlotError('');
      
      // Get existing appointments for the selected date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existingAppointments = await appointmentsService.getAppointmentsByDateRange(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );
      
      // Generate time slots with booked slots marked as disabled
      const slots = generateTimeSlots(existingAppointments);
      const grouped = groupTimeSlots(slots);
      
      setTimeSlots(slots);
      setTimeSlotsGrouped(grouped);
    } catch (error) {
      console.error('Error loading time slots:', error);
      setSlotError('Failed to load available time slots. Please try again.');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Handle time selection
  const handleTimeChange = (e) => {
    const selectedTime = e.target.value;
    console.log('Selected time:', selectedTime); // Debug log
    
    setFormData(prev => ({
      ...prev,
      time: selectedTime
    }));
    
    // Mark time as touched
    setTouched(prev => ({
      ...prev,
      time: true
    }));
    
    // Clear any previous errors
    setError('');
  };

  // Field validation functions
  const validateField = (name, value) => {
    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value) ? '' : 'Please enter a valid email address';
      
      case 'phone':
        const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
        return phoneRegex.test(value.replace(/[\s-]/g, '')) 
          ? '' 
          : 'Please enter a valid 10-digit phone number';
      
      case 'date':
        const selectedDate = new Date(value);
        return selectedDate >= new Date().setHours(0, 0, 0, 0)
          ? ''
          : 'Please select a future date';
      
      default:
        return value ? '' : 'This field is required';
    }
  };

  // Form validation
  const validateForm = () => {
    const fieldsToValidate = [
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email' },
      { name: 'phone', label: 'Phone' },
      { name: 'service', label: 'Service Type' },
      { name: 'date', label: 'Appointment Date' },
      { name: 'time', label: 'Preferred Time' }
    ];

    // Mark all fields as touched to show validation errors
    const newTouched = {};
    fieldsToValidate.forEach(field => {
      newTouched[field.name] = true;
    });
    setTouched(newTouched);

    // Check for empty required fields
    const emptyFields = fieldsToValidate
      .filter(field => !formData[field.name])
      .map(field => field.label);

    if (emptyFields.length > 0) {
      setError(`Please fill in all required fields: ${emptyFields.join(', ')}`);
      return false;
    }

    // Validate field formats
    for (const field of fieldsToValidate) {
      const error = validateField(field.name, formData[field.name]);
      if (error) {
        setError(`${field.label}: ${error}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Format the appointment date and time
      const time24 = formData.time;
      const [hours, minutes] = time24.split(':').map(Number);
      
      // Check if the selected time slot is still available
      const isAvailable = await checkTimeSlotAvailability(formData.date, time24);
      if (!isAvailable) {
        throw new Error('The selected time slot is no longer available. Please choose another time.');
      }
      
      const appointmentDate = new Date(formData.date);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      const payload = {
        ...formData,
        userId: currentUser?.uid || 'guest',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appointmentDate: appointmentDate.toISOString(),
        time24: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        displayDate: format(appointmentDate, 'MMMM d, yyyy'),
        displayTime: formData.time,
        serviceLabel: SERVICE_OPTIONS.find(s => s.value === formData.service)?.label || formData.service,
        // Add user info for non-logged in users
        userInfo: currentUser ? null : {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone
        }
      };

      // Create the appointment
      await appointmentsService.createAppointment(payload);
      
      // Refresh the time slots to reflect the new booking
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const updatedAppointments = await appointmentsService.getAppointmentsByDateRange(
          startOfDay.toISOString(),
          endOfDay.toISOString()
        );
        
        const updatedSlots = generateTimeSlots(updatedAppointments);
        const updatedGrouped = groupTimeSlots(updatedSlots);
        
        setTimeSlots(updatedSlots);
        setTimeSlotsGrouped(updatedGrouped);
      } catch (error) {
        console.error('Error refreshing time slots:', error);
      }
      
      setSuccess('Appointment booked successfully! We will contact you shortly to confirm.');
      
      // Reset form but keep user info if logged in
      setFormData(prev => ({
        ...(currentUser ? {
          firstName: prev.firstName,
          lastName: prev.lastName,
          email: prev.email,
          phone: prev.phone
        } : {}),
        service: '',
        date: addDays(new Date(), 1),
        time: '',
        notes: ''
      }));
      
      // Reset to today's date to show the updated slots
      const newDate = addDays(new Date(), 1);
      setSelectedDate(newDate);

      // Close modal after delay if onSuccess is provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      setError(err.message || 'Failed to book appointment. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  // isWeekend function removed as it's not being used

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Book an Appointment
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success ? (
          <Box textAlign="center" py={4}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {success}
            </Typography>
            <Typography color="text.secondary" paragraph>
              We've sent a confirmation to your email.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={onClose}
              sx={{ mt: 2 }}
            >
              Close
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* First Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              
              {/* Last Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1, opacity: 0 }} />
                  }}
                />
              </Grid>
              
              {/* Email */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              
              {/* Phone */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="tel"
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              
              {/* Service Type */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Service Type</InputLabel>
                  <Select
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    label="Service Type"
                    startAdornment={
                      <WorkIcon sx={{ color: 'action.active', mr: 1, ml: 1 }} />
                    }
                  >
                    {SERVICE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box display="flex" alignItems="center">
                          {option.icon}
                          <Box ml={1}>{option.label}</Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Date Picker */}
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Appointment Date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    minDate={new Date()}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        required
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: <CalendarIcon sx={{ color: 'action.active', mr: 1 }} />
                        }}
                      />
                    )}
                  />
                </LocalizationProvider>
              </Grid>

              {/* Time Slot */}
              <Grid item xs={12} sm={6}>
                <FormControl 
                  fullWidth 
                  required 
                  error={touched.time && !formData.time}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: '1px',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.light',
                      },
                    },
                  }}
                >
                  <InputLabel 
                    id="time-label"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-focused': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    Preferred Time
                  </InputLabel>
                  <Select
                    labelId="time-label"
                    id="time"
                    name="time"
                    value={formData.time || ''}
                    onChange={handleTimeChange}
                    onBlur={() => setTouched(prev => ({ ...prev, time: true }))}
                    label="Preferred Time"
                    startAdornment={
                      <InputAdornment position="start" sx={{ ml: 1 }}>
                        <AccessTimeIcon color={formData.time ? 'primary' : 'action'} />
                      </InputAdornment>
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 320,
                          width: 250,
                        },
                      },
                      MenuListProps: {
                        sx: {
                          '& .MuiMenuItem-root': {
                            minHeight: 48,
                            '&.Mui-selected': {
                              backgroundColor: 'action.selected',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            },
                          },
                        },
                      },
                    }}
                    sx={{
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: '8px',
                      },
                    }}
                    renderValue={(selected) => {
                      const time = timeSlots.find(t => t.value === selected);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <AccessTimeIcon sx={{ color: 'primary.main', mr: 1, fontSize: '1.25rem' }} />
                          <Typography variant="body1">{time ? time.label : 'Select a time'}</Typography>
                        </Box>
                      );
                    }}
                  >
                    {Object.entries(timeSlotsGrouped).map(([period, times]) => {
                      // Check if all time slots in this period are booked
                      const allBooked = times.every(slot => slot.disabled);
                      
                      return (
                        <React.Fragment key={`period-${period}`}>
                          <ListSubheader 
                            sx={{
                              backgroundColor: 'background.paper',
                              fontWeight: 'bold',
                              color: allBooked ? 'text.disabled' : 'text.primary',
                              lineHeight: '36px',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>{period} Hours</span>
                            {allBooked && (
                              <Chip 
                                label="Fully Booked" 
                                size="small" 
                                sx={{ 
                                  fontSize: '0.65rem',
                                  height: 20,
                                  '& .MuiChip-label': {
                                    px: 0.75,
                                  },
                                }} 
                              />
                            )}
                          </ListSubheader>
                          {times.map((time) => (
                        <MenuItem 
                          key={time.value} 
                          value={time.value}
                          disabled={time.disabled}
                          onClick={(e) => {
                            if (!time.disabled) {
                              handleTimeChange({ target: { value: time.value } });
                            }
                          }}
                          sx={{
                            pl: 4,
                            cursor: time.disabled ? 'not-allowed' : 'pointer',
                            '&.Mui-disabled': {
                              opacity: 1,
                              color: 'text.disabled',
                              backgroundColor: 'action.disabledBackground',
                              textDecoration: 'line-through',
                            },
                            '&:hover:not(.Mui-disabled)': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            width: '100%',
                            justifyContent: 'space-between'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <AccessTimeIcon 
                                sx={{ 
                                  color: time.disabled ? 'text.disabled' : 'primary.main', 
                                  mr: 1.5,
                                  fontSize: '1.1rem',
                                  flexShrink: 0
                                }} 
                              />
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  color: time.disabled ? 'text.disabled' : 'text.primary',
                                  fontWeight: time.disabled ? 400 : 500,
                                  position: 'relative',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  '&:after': time.disabled ? {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    top: '50%',
                                    width: '100%',
                                    height: '1px',
                                    backgroundColor: 'text.disabled',
                                    transform: 'rotate(-5deg)'
                                  } : {}
                                }}
                              >
                                {time.label.replace(' (Booked)', '')}
                              </Typography>
                            </Box>
                            {formData.time === time.value ? (
                              <CheckIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
                            ) : null}
                          </Box>
                        </MenuItem>
                      ))}
                      <Divider key={`divider-${period}`} sx={{ my: 0.5 }} />
                        </React.Fragment>
                      );
                    })}
                  </Select>
                  {touched.time && !formData.time && (
                    <FormHelperText error sx={{ ml: 2 }}>
                      <Box component="span" display="flex" alignItems="center">
                        <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Please select a time
                      </Box>
                    </FormHelperText>
                  )}
                </FormControl>
              </Grid>
            
            {/* Additional Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Additional Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special requirements or questions..."
                InputProps={{
                  startAdornment: <NotesIcon sx={{ color: 'action.active', mr: 1, mt: 1, alignSelf: 'flex-start' }} />
                }}
              />
            </Grid>
            
            {/* Submit Button */}
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => onClose && onClose()}
                  disabled={loading}
                  sx={{ minWidth: 120 }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {loading ? 'Booking...' : 'Book Appointment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      )}
    </Paper>
  </Container>
  );
}

export default BookAppointmentForm;