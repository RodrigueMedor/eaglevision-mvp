import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_ALL_APPOINTMENTS } from '../../graphql/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const AdminAppointmentList = ({ 
  limit, 
  onEdit, 
  onDelete, 
  appointments = [],
  loading = false,
  error = null,
  onRefresh = null
}) => {
  // Use the provided appointments or an empty array
  let displayAppointments = [...appointments];
  
  // Apply limit if specified and not showing all appointments
  if (limit && displayAppointments.length > limit) {
    displayAppointments = displayAppointments.slice(0, limit);
  }
  
  if (loading && displayAppointments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading appointments...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Alert 
          severity="error"
          action={
            onRefresh && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={onRefresh}
              >
                Retry
              </Button>
            )
          }
        >
          Error loading appointments: {error.message}
        </Alert>
      </Box>
    );
  }


  if (displayAppointments.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography>No appointments found.</Typography>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'warning';
      case 'CONFIRMED':
        return 'info';
      case 'COMPLETED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Service</TableCell>
            <TableCell>Date & Time</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayAppointments.map((appointment) => (
            <TableRow key={appointment.id} hover>
              <TableCell>{appointment.id}</TableCell>
              <TableCell>
                {appointment.firstName} {appointment.lastName}
              </TableCell>
              <TableCell>{appointment.service}</TableCell>
              <TableCell>{formatDate(appointment.appointmentDate)}</TableCell>
              <TableCell>
                <Chip
                  label={appointment.status}
                  color={getStatusColor(appointment.status)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box>
                  <div>{appointment.email}</div>
                  <div>{appointment.phone}</div>
                </Box>
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={() => onEdit && onEdit(appointment)}
                  size="small"
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  onClick={() => onDelete && onDelete(appointment)}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AdminAppointmentList;
