import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  CircularProgress,
  useTheme, 
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  TablePagination,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Grid
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  FirstPage as FirstPageIcon,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage as LastPageIcon
} from '@mui/icons-material';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@apollo/client';
import { 
  GET_ALL_APPOINTMENTS, 
  UPDATE_APPOINTMENT, 
  DELETE_APPOINTMENT
} from '../../../graphql/admin';
import AdminLayout from '../../../components/Layout/AdminLayout';
import AdminAppointmentList from '../../../components/AdminAppointmentList/AdminAppointmentList';
import AppointmentModal from '../../../components/AppointmentModal/AppointmentModal';

// Table pagination actions component
function TablePaginationActions(props) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

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

const Appointments = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAppointmentCreated = () => {
    setSnackbar({
      open: true,
      message: 'Appointment created successfully!',
      severity: 'success'
    });
    refetch(); // Refresh the appointments list
  };
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for dialogs and notifications
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Initialize update mutation with proper error handling and refetch
  const [updateAppointment] = useMutation(UPDATE_APPOINTMENT, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Appointment updated successfully',
        severity: 'success'
      });
      setOpenEditDialog(false);
      refetch(); // Refresh the appointments list
    },
    onError: (error) => {
      console.error('Error updating appointment:', error);
      setSnackbar({
        open: true,
        message: `Failed to update appointment: ${error.message}`,
        severity: 'error'
      });
    },
    refetchQueries: [{ query: GET_ALL_APPOINTMENTS }],
    awaitRefetchQueries: true
  });

  // Handle appointment update
  const handleUpdate = () => {
    if (!selectedAppointment) return;
    
    updateAppointment({
      variables: {
        input: {
          id: selectedAppointment.id,
          status: selectedAppointment.status,
          notes: selectedAppointment.notes || '',
          // Include other fields that can be updated
          ...(selectedAppointment.appointmentDate && { 
            appointmentDate: selectedAppointment.appointmentDate 
          })
        }
      }
    });
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedAppointment(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Fetch appointments
  const { data, loading, error, refetch } = useQuery(GET_ALL_APPOINTMENTS, {
    onError: (error) => {
      console.error('Error fetching appointments:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load appointments',
        severity: 'error'
      });
    }
  });

  // Sort and paginate appointments
  const sortedAndPaginatedAppointments = useMemo(() => {
    if (!data?.allAppointments) return [];
    
    // Sort by appointment date (newest first)
    const sorted = [...data.allAppointments].sort((a, b) => 
      new Date(b.appointmentDate) - new Date(a.appointmentDate)
    );
    
    // Apply pagination
    return sorted.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [data?.allAppointments, page, rowsPerPage]);
  
  const totalAppointments = data?.allAppointments?.length || 0;

  // Initialize delete mutation with proper error handling and refetch
  const [deleteAppointment, { loading: isDeleting }] = useMutation(DELETE_APPOINTMENT, {
    onCompleted: () => {
      refetch();
      setOpenDeleteDialog(false);
      setSnackbar({
        open: true,
        message: 'Appointment deleted successfully',
        severity: 'success'
      });
    },
    onError: (error) => {
      console.error('Error deleting appointment:', error);
      setSnackbar({
        open: true,
        message: `Failed to delete appointment: ${error.message}`,
        severity: 'error'
      });
    },
    refetchQueries: [{ query: GET_ALL_APPOINTMENTS }],
    awaitRefetchQueries: true
  });

  // Handle new appointment
  const handleNewAppointment = () => {
    navigate('/admin/appointments/new');
  };

  // Handle edit appointment
  const handleEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setOpenEditDialog(true);
  };

  // Handle delete click
  const handleDeleteClick = (appointment) => {
    setSelectedAppointment(appointment);
    setOpenDeleteDialog(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (!selectedAppointment) return;
    
    deleteAppointment({
      variables: {
        input: {
          id: selectedAppointment.id
        }
      }
    });
  };

  return (
    <AdminLayout>
      <Box 
        sx={{ 
          width: '100%',
          boxSizing: 'border-box',
          p: isMobile ? 2 : 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="h4" component="h1">
            All Appointments
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleOpenModal}
          >
            New Appointment
          </Button>
        </Box>

        <Paper elevation={3} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Showing {sortedAndPaginatedAppointments.length} of {totalAppointments} appointments
            </Typography>
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">Error loading appointments</Typography>
          ) : (
            <>
              <TableContainer>
                <AdminAppointmentList 
                  appointments={sortedAndPaginatedAppointments} 
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onRefresh={refetch}
                />
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalAppointments}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
                sx={{ mt: 2 }}
              />
            </>
          )}
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => !isDeleting && setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete Appointment</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this appointment? This action cannot be undone.</Typography>
          {selectedAppointment && (
            <Box mt={2}>
              <Typography variant="subtitle2">Appointment Details:</Typography>
              <Typography variant="body2">
                {selectedAppointment.firstName} {selectedAppointment.lastName}
                <br />
                {new Date(selectedAppointment.appointmentDate).toLocaleString()}
                <br />
                {selectedAppointment.service}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDeleteDialog(false)} 
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle>Edit Appointment</DialogTitle>
        <DialogContent>
          {selectedAppointment && (
            <Box sx={{ minWidth: 300, mt: 2 }}>
              <TextField
                select
                fullWidth
                label="Status"
                name="status"
                value={selectedAppointment.status || ''}
                onChange={handleInputChange}
                margin="normal"
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdate} color="primary">Update</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AppointmentModal 
          open={isModalOpen} 
          onClose={handleCloseModal}
          onAppointmentCreated={handleAppointmentCreated}
        />
      </LocalizationProvider>
    </AdminLayout>
  );
};

export default Appointments;
