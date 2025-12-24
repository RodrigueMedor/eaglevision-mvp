import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_USER_APPOINTMENTS } from '../../graphql/mutations';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TextField,
  Box,
  CircularProgress,
} from '@mui/material';

const AppointmentList = () => {
  const [userId, setUserId] = useState('1'); // Default to user 1 for testing
  
  const { loading, error, data, refetch } = useQuery(GET_USER_APPOINTMENTS, {
    variables: { userId: parseInt(userId, 10) },
    fetchPolicy: 'network-only', // Always fetch fresh data
  });

  const handleUserIdChange = (e) => {
    const newUserId = e.target.value;
    setUserId(newUserId);
    if (newUserId) {
      refetch({ userId: parseInt(newUserId, 10) });
    }
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Box p={4}>
      <Typography color="error">Error loading appointments: {error.message}</Typography>
    </Box>
  );

  const appointments = data?.userAppointments || [];

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        User Appointments
      </Typography>
      
      <Box mb={3} maxWidth={200}>
        <TextField
          label="User ID"
          type="number"
          value={userId}
          onChange={handleUserIdChange}
          fullWidth
          variant="outlined"
          size="small"
        />
      </Box>

      {appointments.length === 0 ? (
        <Typography>No appointments found for this user.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{appointment.id}</TableCell>
                  <TableCell>{appointment.service}</TableCell>
                  <TableCell>
                    {new Date(appointment.appointment_date).toLocaleString()}
                  </TableCell>
                  <TableCell>{appointment.status}</TableCell>
                  <TableCell>{appointment.user?.full_name || 'N/A'}</TableCell>
                  <TableCell>{appointment.user?.email || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AppointmentList;
