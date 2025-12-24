import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  useTheme,
  useMediaQuery,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALL_APPOINTMENTS } from '../../graphql/admin';
import AppointmentForm from '../../pages/Admin/AppointmentForm';
import { format } from 'date-fns';

const AppointmentCalendar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [view, setView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [filters, setFilters] = useState({
    status: ['pending', 'confirmed', 'completed'],
    service: []
  });

  // Fetch appointments
  const { data, loading, error, refetch } = useQuery(GET_ALL_APPOINTMENTS, {
    fetchPolicy: 'network-only',
  });

  // Format events for FullCalendar
  const events = data?.appointments?.map(appointment => ({
    id: appointment.id,
    title: `${appointment.firstName} ${appointment.lastName} - ${appointment.service}`,
    start: appointment.appointmentDate,
    end: new Date(new Date(appointment.appointmentDate).getTime() + 60 * 60 * 1000), // 1 hour duration
    extendedProps: {
      ...appointment,
      status: appointment.status?.toLowerCase()
    },
    backgroundColor: getStatusColor(appointment.status),
    borderColor: getStatusColor(appointment.status),
    textColor: theme.palette.getContrastText(getStatusColor(appointment.status) || theme.palette.primary.main)
  })) || [];

  // Get color based on appointment status
  function getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.warning.main;
      case 'completed':
        return theme.palette.info.main;
      case 'cancelled':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  }

  // Handle event click
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
  };

  // Handle date click
  const handleDateClick = (arg) => {
    setSelectedDate(arg.date);
    setIsFormOpen(true);
  };

  // Handle view change
  const handleViewChange = (newView) => {
    setView(newView);
    setAnchorEl(null);
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Handle menu open
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle form close
  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedEvent(null);
  };

  // Handle form submit
  const handleFormSubmit = () => {
    refetch();
    handleFormClose();
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Appointment Calendar
        </Typography>
        <Box>
          <IconButton onClick={handleRefresh} color="primary" aria-label="refresh">
            <RefreshIcon />
          </IconButton>
          <IconButton 
            onClick={handleMenuOpen}
            color="primary"
            aria-label="change view"
            aria-controls="view-menu"
            aria-haspopup="true"
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="view-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => handleViewChange('dayGridMonth')}>
              <ListItemIcon>
                <TodayIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Month</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleViewChange('timeGridWeek')}>
              <ListItemIcon>
                <ViewWeekIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Week</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleViewChange('timeGridDay')}>
              <ListItemIcon>
                <ViewDayIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Day</ListItemText>
            </MenuItem>
          </Menu>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsFormOpen(true)}
            sx={{ ml: 1 }}
          >
            New Appointment
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 2, height: 'calc(100vh - 200px)' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={events}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          nowIndicator={true}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          initialDate={selectedDate}
          height="100%"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          businessHours={{
            daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
            startTime: '08:00',
            endTime: '20:00',
          }}
          eventContent={(eventInfo) => {
            return (
              <Box sx={{ p: 0.5, overflow: 'hidden' }}>
                <Typography variant="caption" noWrap>
                  {eventInfo.timeText}
                </Typography>
                <Typography variant="body2" noWrap>
                  {eventInfo.event.title.split(' - ')[0]}
                </Typography>
                <Typography variant="caption" noWrap>
                  {eventInfo.event.title.split(' - ')[1]}
                </Typography>
              </Box>
            );
          }}
        />
      </Paper>

      {/* Appointment Form Dialog */}
      <Dialog 
        open={isFormOpen} 
        onClose={handleFormClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedEvent ? 'Edit Appointment' : 'New Appointment'}
        </DialogTitle>
        <DialogContent>
          <AppointmentForm 
            appointment={selectedEvent?.extendedProps}
            onSave={handleFormSubmit}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AppointmentCalendar;
