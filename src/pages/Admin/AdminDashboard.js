import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation } from '@apollo/client';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  Snackbar, 
  Alert,
  useTheme,
  useMediaQuery,
  TextField,
  MenuItem,
  TablePagination,
  TableContainer,
  IconButton,
  CircularProgress
} from '@mui/material';
import { 
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { 
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  GET_ALL_APPOINTMENTS, 
  GET_ALL_CONTACTS, 
  CREATE_APPOINTMENT, 
  UPDATE_APPOINTMENT, 
  DELETE_APPOINTMENT, 
  UPDATE_APPOINTMENT_STATUS, 
  UPDATE_CONTACT_STATUS 
} from '../../graphql/admin';
import AppointmentForm from './AppointmentForm';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import AdminLayout from '../../components/Layout/AdminLayout';
import AdminAppointmentList from '../../components/AdminAppointmentList/AdminAppointmentList';

// QuickActions component
const QuickActions = ({ children }) => (
  <Paper sx={{ p: 2, mb: 3, borderRadius: 2, mx: 0 }}>
    <Typography variant="h6" gutterBottom>Quick Actions</Typography>
    {children}
  </Paper>
);

// SectionTitle component
const SectionTitle = ({ children }) => (
  <Typography variant="h6" sx={{ fontWeight: 600 }}>{children}</Typography>
);

// Table pagination actions component
function TablePaginationActions({ count, page, rowsPerPage, onPageChange }) {
  const theme = useTheme();

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton
        onClick={handleBackButtonClick}
        disabled={page === 0}
        aria-label="previous page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

TablePaginationActions.propTypes = {
  count: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  page: PropTypes.number.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State management
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // GraphQL Queries
  const { 
    loading: loadingAppointments, 
    error: appointmentsError,
    data: appointmentsData = { allAppointments: [] },
    refetch: refetchAppointments 
  } = useQuery(GET_ALL_APPOINTMENTS, { 
    fetchPolicy: 'network-only',
    onError: (error) => {
      console.error('Appointments query error:', error);
      setSnackbar({
        open: true,
        message: `Error loading appointments: ${error.message}`,
        severity: 'error',
        autoHideDuration: 10000
      });
    },
    onCompleted: (data) => {
      if (data?.allAppointments) {
        console.log(`Successfully loaded ${data.allAppointments.length} appointments`);
      }
    }
  });
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Get total number of appointments
  const totalAppointments = appointmentsData?.allAppointments?.length || 0;
  
  // Sort and paginate appointments
  const sortedAndPaginatedAppointments = useMemo(() => {
    if (!appointmentsData?.allAppointments) return [];
    
    // Sort by appointment date (newest first)
    const sorted = [...appointmentsData.allAppointments].sort((a, b) => 
      new Date(b.appointmentDate) - new Date(a.appointmentDate)
    );
    
    // Apply pagination
    return sorted.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [appointmentsData, page, rowsPerPage]);

  const { 
    loading: loadingContacts, 
    error: contactsError,
    refetch: refetchContacts 
  } = useQuery(GET_ALL_CONTACTS, { 
    fetchPolicy: 'network-only',
    onError: (error) => {
      console.error('Contacts query error:', error);
    }
  });
  
  // Log data and errors for debugging
  React.useEffect(() => {
    if (appointmentsData) {
      console.log('Appointments data in effect:', appointmentsData);
    }
    if (appointmentsError) {
      console.error('Appointments error in effect:', appointmentsError);
    }
  }, [appointmentsData, appointmentsError]);

  // GraphQL Mutations
  const [createAppointment] = useMutation(CREATE_APPOINTMENT, {
    onCompleted: () => {
      refetchAppointments();
      setSnackbar({
        open: true,
        message: 'Appointment created successfully',
        severity: 'success'
      });
      setIsFormOpen(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error creating appointment: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [updateAppointment] = useMutation(UPDATE_APPOINTMENT, {
    onCompleted: () => {
      refetchAppointments();
      setSnackbar({
        open: true,
        message: 'Appointment updated successfully',
        severity: 'success'
      });
      setIsFormOpen(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error updating appointment: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [deleteAppointment] = useMutation(DELETE_APPOINTMENT, {
    onCompleted: () => {
      refetchAppointments();
      setSnackbar({
        open: true,
        message: 'Appointment deleted successfully',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error deleting appointment: ${error.message}`,
        severity: 'error'
      });
    }
  });

  // Handlers
  const handleOpenForm = (appointment = null) => {
    setCurrentAppointment(appointment);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setCurrentAppointment(null);
  };

  const handleSaveAppointment = async (appointmentData) => {
    try {
      const input = {
        ...appointmentData,
        id: appointmentData.id || undefined,
        appointmentDate: appointmentData.appointmentDate.toISOString(),
        status: appointmentData.status?.toUpperCase() || 'PENDING'
      };

      if (appointmentData.id) {
        await updateAppointment({ variables: { input } });
      } else {
        await createAppointment({ variables: { input } });
      }
    } catch (error) {
      console.error('Error saving appointment:', error);
    }
  };

  const handleDeleteAppointment = async () => {
    if (appointmentToDelete) {
      try {
        await deleteAppointment({
          variables: { input: { id: appointmentToDelete.id } }
        });
      } catch (error) {
        console.error('Error deleting appointment:', error);
      }
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <AdminLayout>
      <Box sx={{ width: '100%', p: 0, m: 0, maxWidth: '100%', overflowX: 'hidden' }}>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
            variant="filled"
          >
            {snackbar.message}
            {snackbar.severity === 'success' && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenForm()}
                  size={isMobile ? 'small' : 'medium'}
                >
                  New Appointment
                </Button>
              </Box>
            )}
          </Alert>
        </Snackbar>
        
        <Box sx={{ p: 3 }}>
          <QuickActions>
            <Grid container spacing={2}>
              {[
                { 
                  label: 'Schedule Appointment', 
                  icon: <CalendarIcon />, 
                  path: '/admin/appointments/new',
                  color: 'primary'
                },
                { 
                  label: 'View Calendar', 
                  icon: <CalendarIcon />, 
                  path: '/admin/calendar',
                  color: 'secondary'
                },
                { 
                  label: 'Send Message', 
                  icon: <PeopleIcon />, 
                  path: '/admin/messages/new',
                  color: 'success'
                },
                { 
                  label: 'Generate Report', 
                  icon: <TrendingUpIcon />, 
                  path: '/admin/reports',
                  color: 'warning'
                }
              ].map((action, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Button
                    component={Link}
                    to={action.path}
                    fullWidth
                    variant="contained"
                    startIcon={action.icon}
                    color={action.color}
                    sx={{
                      p: 2,
                      height: '100%',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      '& .MuiButton-startIcon': {
                        mr: 0,
                        mb: 1
                      },
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {action.label}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </QuickActions>

          {/* Recent Appointments */}
          <Box sx={{ mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <SectionTitle>Recent Appointments</SectionTitle>
              <Box display="flex" gap={1}>
                <Button 
                  color="primary" 
                  onClick={() => navigate('/admin/appointments')}
                  size={isMobile ? 'small' : 'medium'}
                  variant="outlined"
                  sx={{ mr: 1 }}
                >
                  View All
                </Button>
                <Button
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                  onClick={() => refetchAppointments()}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
            
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
              {loadingAppointments && sortedAndPaginatedAppointments.length === 0 ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : appointmentsError ? (
                <Box p={3}>
                  <Alert 
                    severity="error"
                    action={
                      <Button 
                        color="inherit" 
                        size="small" 
                        onClick={() => refetchAppointments()}
                      >
                        Retry
                      </Button>
                    }
                  >
                    Error loading appointments: {appointmentsError.message}
                  </Alert>
                </Box>
              ) : (
                <>
                  <TableContainer>
                    <AdminAppointmentList 
                      appointments={sortedAndPaginatedAppointments}
                      onEdit={handleOpenForm}
                      onDelete={(appointment) => {
                        setAppointmentToDelete(appointment);
                        setDeleteDialogOpen(true);
                      }}
                      loading={loadingAppointments}
                      error={appointmentsError}
                      onRefresh={refetchAppointments}
                    />
                  </TableContainer>
                  
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={totalAppointments}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    ActionsComponent={TablePaginationActions}
                    sx={{ borderTop: '1px solid rgba(224, 224, 224, 1)' }}
                  />
                </>
              )}
            </Paper>
          </Box>

          {/* Nested Routes */}
          <Outlet />
        </Box>

        {/* Appointment Form Dialog */}
        <AppointmentForm
          open={isFormOpen}
          onClose={handleCloseForm}
          appointment={currentAppointment}
          onSave={handleSaveAppointment}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteAppointment}
          title="Delete Appointment"
          content="Are you sure you want to delete this appointment? This action cannot be undone."
        />
      </Box>
    </AdminLayout>
  );
}

export default AdminDashboard;
