import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { 
  Tabs, Tab, Box, Typography, Button, Snackbar, Alert, 
  IconButton, useTheme, useMediaQuery, Tooltip, Grid, Paper,
  Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem,
  FormControl, InputLabel, Select, TextField, InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  ViewColumn as ViewColumnIcon,
  Clear as ClearIcon,
  EventNote as EventNoteIcon,
  PendingActions as PendingActionsIcon,
  EventAvailable as EventAvailableIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
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
import DashboardMetrics from '../../components/Dashboard/DashboardMetrics';
import DataTable from '../../components/DataTable/DataTable';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Status options for filtering
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending', color: 'warning' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'info' },
  { value: 'COMPLETED', label: 'Completed', color: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
];

// Service options for filtering
const SERVICE_OPTIONS = [
  'Notary Public',
  'Mobile Notary',
  'Loan Signing Agent',
  'General Notary Work',
  'Other'
];

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const searchInputRef = useRef(null);
  
  // State for the data table
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  
  // App state
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  
  // UI State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Date range filter
  const [dateRange, setDateRange] = useState({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date())
  });
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    phone: true,
    service: true,
    date: true,
    status: true,
    actions: true
  });
  
  // Fetch data
  const { 
    loading: loadingAppointments, 
    refetch: refetchAppointments 
  } = useQuery(GET_ALL_APPOINTMENTS, {
    onCompleted: (data) => {
      setAppointments(data?.allAppointments || []);
    },
    onError: (error) => {
      console.error('Error fetching appointments:', error);
      showSnackbar(`Error loading appointments: ${error.message}`, 'error');
    },
    fetchPolicy: 'network-only'
  });
  
  const { 
    loading: loadingContacts, 
    refetch: refetchContacts 
  } = useQuery(GET_ALL_CONTACTS, {
    onCompleted: (data) => {
      setContacts(data?.allContacts || []);
    },
    onError: (error) => {
      console.error('Error fetching contacts:', error);
      showSnackbar(`Error loading contacts: ${error.message}`, 'error');
    },
    fetchPolicy: 'network-only'
  });
  
  // Helper function to show snackbar messages
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };
  
  // Close snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSelectedRows([]);
    setSearchText('');
    setFilters({});
  };
  
  // Handle search
  const handleSearch = (event) => {
    setSearchText(event.target.value);
  };
  
  // Handle filter change
  const handleFilterChange = (filter) => {
    setFilters(prev => ({
      ...prev,
      ...filter
    }));
  };
  
  // Handle date range change
  const handleDateRangeChange = (newDateRange) => {
    setDateRange({
      start: startOfDay(newDateRange.start),
      end: endOfDay(newDateRange.end)
    });
  };
  
  // Handle row selection
  const handleRowSelect = (selected) => {
    setSelectedRows(selected);
  };
  
  // Handle bulk actions
  const handleBulkAction = async (action, selectedIds) => {
    try {
      if (action === 'delete') {
        // Show confirmation dialog for delete
        setAppointmentToDelete({ id: selectedIds[0] });
        setDeleteDialogOpen(true);
      } else if (action === 'status') {
        // Update status for all selected appointments
        const status = window.prompt('Enter new status (PENDING, CONFIRMED, COMPLETED, CANCELLED):');
        if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
          await Promise.all(
            selectedIds.map(id => 
              updateAppointmentStatus({
                variables: {
                  appointmentId: id,
                  status: status.toUpperCase()
                }
              })
            )
          );
          await refetchAppointments();
          showSnackbar(`Updated status for ${selectedIds.length} appointments`, 'success');
          setSelectedRows([]);
        }
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showSnackbar(`Error: ${error.message}`, 'error');
    }
  };
  
  // Keyboard shortcuts
  useHotkeys('ctrl+f, command+f', (e) => {
    e.preventDefault();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, { enableOnFormTags: true });
  
  useHotkeys('n', (e) => {
    e.preventDefault();
    handleOpenForm();
  }, { enableOnFormTags: true });
  
  useHotkeys('r', (e) => {
    e.preventDefault();
    handleRefresh();
  });
  
  useHotkeys('ctrl+right, command+right', (e) => {
    e.preventDefault();
    setCurrentTab(prev => Math.min(prev + 1, 1));
  });
  
  useHotkeys('ctrl+left, command+left', (e) => {
    e.preventDefault();
    setCurrentTab(prev => Math.max(prev - 1, 0));
  });
  
  // Columns configuration for the data table
  const appointmentColumns = [
    {
      field: 'name',
      headerName: 'Name',
      sortable: true,
      renderCell: (params) => (
        <>
          <div>
            <Typography variant="body2" fontWeight="medium">
              {params.row.firstName} {params.row.lastName}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {params.row.email}
            </Typography>
          </div>
        </>
      ),
      width: 250
    },
    {
      field: 'phone',
      headerName: 'Phone',
      sortable: true,
      width: 150
    },
    {
      field: 'service',
      headerName: 'Service',
      sortable: true,
      filterable: true,
      filterOptions: SERVICE_OPTIONS.map(service => ({
        value: service,
        label: service
      })),
      width: 200
    },
    {
      field: 'appointmentDate',
      headerName: 'Date & Time',
      sortable: true,
      renderCell: (params) => format(new Date(params.value), 'MMM d, yyyy h:mm a'),
      width: 200
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      filterable: true,
      filterOptions: STATUS_OPTIONS,
      renderCell: (params) => {
        const status = STATUS_OPTIONS.find(s => s.value === params.value);
        return (
          <Chip 
            label={status?.label || params.value} 
            color={status?.color || 'default'}
            size="small"
            variant="outlined"
          />
        );
      },
      width: 150
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      width: 120,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                handleOpenForm(params.row);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton 
              size="small" 
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                setAppointmentToDelete(params.row);
                setDeleteDialogOpen(true);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ];
  
  const contactColumns = [
    {
      field: 'name',
      headerName: 'Name',
      sortable: true,
      width: 200
    },
    {
      field: 'email',
      headerName: 'Email',
      sortable: true,
      width: 250
    },
    {
      field: 'phone',
      headerName: 'Phone',
      sortable: true,
      width: 150
    },
    {
      field: 'subject',
      headerName: 'Subject',
      sortable: true,
      width: 200
    },
    {
      field: 'message',
      headerName: 'Message',
      sortable: false,
      flex: 1,
      renderCell: (params) => (
        <Typography noWrap sx={{ maxWidth: 300 }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      sortable: true,
      width: 150,
      renderCell: (params) => (
        <Select
          value={params.value || 'new'}
          onChange={(e) => handleStatusChange(params.row.id, e.target.value, 'contact')}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="new">New</MenuItem>
          <MenuItem value="read">Read</MenuItem>
          <MenuItem value="responded">Responded</MenuItem>
          <MenuItem value="closed">Closed</MenuItem>
        </Select>
      )
    },
    {
      field: 'createdAt',
      headerName: 'Received',
      sortable: true,
      renderCell: (params) => format(new Date(params.value), 'MMM d, yyyy'),
      width: 150
    }
  ];
  
  // Filter and sort data
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      // Apply date filter
      const appointmentDate = new Date(appointment.appointmentDate);
      if (appointmentDate < dateRange.start || appointmentDate > dateRange.end) {
        return false;
      }
      
      // Apply search text
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const searchableFields = [
          appointment.firstName,
          appointment.lastName,
          appointment.email,
          appointment.phone,
          appointment.service,
          appointment.notes
        ].join(' ').toLowerCase();
        
        if (!searchableFields.includes(searchLower)) {
          return false;
        }
      }
      
      // Apply status filter
      if (filters.status && appointment.status !== filters.status) {
        return false;
      }
      
      // Apply service filter
      if (filters.service && appointment.service !== filters.service) {
        return false;
      }
      
      return true;
    });
  }, [appointments, searchText, filters, dateRange]);
  
  // Handle refresh
  const handleRefresh = async () => {
    try {
      await Promise.all([refetchAppointments(), refetchContacts()]);
      showSnackbar('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showSnackbar(`Error refreshing data: ${error.message}`, 'error');
    }
  };
  
  // Handle status change
  const handleStatusChange = async (id, newStatus, type) => {
    try {
      if (type === 'appointment') {
        await updateAppointmentStatus({
          variables: {
            appointmentId: id,
            status: newStatus
          }
        });
        await refetchAppointments();
        showSnackbar('Appointment status updated', 'success');
      } else if (type === 'contact') {
        await updateContactStatus({
          variables: {
            contactId: id,
            status: newStatus
          }
        });
        await refetchContacts();
        showSnackbar('Contact status updated', 'success');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showSnackbar(`Error updating status: ${error.message}`, 'error');
    }
  };
  
  // Handle form open/close
  const handleOpenForm = (appointment = null) => {
    setCurrentAppointment(appointment);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setCurrentAppointment(null);
  };
  
  // Handle save appointment
  const handleSaveAppointment = async (appointmentData) => {
    try {
      const input = {
        ...appointmentData,
        id: appointmentData.id || undefined,
        appointmentDate: appointmentData.appointmentDate.toISOString(),
        status: appointmentData.status?.toUpperCase() || 'PENDING'
      };
      
      if (appointmentData.id) {
        await updateAppointment({
          variables: { input }
        });
        showSnackbar('Appointment updated successfully', 'success');
      } else {
        await createAppointment({
          variables: { input }
        });
        showSnackbar('Appointment created successfully', 'success');
      }
      
      await refetchAppointments();
      handleCloseForm();
    } catch (error) {
      console.error('Error saving appointment:', error);
      showSnackbar(
        `Failed to ${appointmentData?.id ? 'update' : 'create'} appointment: ${error.message}`,
        'error'
      );
    }
  };
  
  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;
    
    try {
      await deleteAppointment({
        variables: { 
          input: { id: appointmentToDelete.id } 
        }
      });
      
      await refetchAppointments();
      showSnackbar('Appointment deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      showSnackbar(`Failed to delete appointment: ${error.message}`, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
      setSelectedRows(prev => prev.filter(id => id !== appointmentToDelete.id));
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    
    try {
      await Promise.all(
        selectedRows.map(id => 
          deleteAppointment({
            variables: { input: { id } }
          })
        )
      );
      
      await refetchAppointments();
      showSnackbar(`Deleted ${selectedRows.length} appointments`, 'success');
      setSelectedRows([]);
    } catch (error) {
      console.error('Error deleting appointments:', error);
      showSnackbar(`Error deleting appointments: ${error.message}`, 'error');
    }
  };
  
  // Handle bulk status update
  const handleBulkStatusUpdate = async (status) => {
    if (selectedRows.length === 0) return;
    
    try {
      await Promise.all(
        selectedRows.map(id => 
          updateAppointmentStatus({
            variables: {
              appointmentId: id,
              status: status.toUpperCase()
            }
          })
        )
      );
      
      await refetchAppointments();
      showSnackbar(`Updated status for ${selectedRows.length} appointments`, 'success');
      setSelectedRows([]);
    } catch (error) {
      console.error('Error updating appointment statuses:', error);
      showSnackbar(`Error updating statuses: ${error.message}`, 'error');
    }
  };
  
  // Mutations
  // Initialize mutations with error handling
  const [createAppointment] = useMutation(CREATE_APPOINTMENT, {
    onError: (error) => {
      setError(`Error creating appointment: ${error.message}`);
    }
  });
  
  const [updateAppointment] = useMutation(UPDATE_APPOINTMENT, {
    onError: (error) => {
      setError(`Error updating appointment: ${error.message}`);
    }
  });
  
  const [deleteAppointment] = useMutation(DELETE_APPOINTMENT, {
    onError: (error) => {
      setError(`Error deleting appointment: ${error.message}`);
    }
  });
  
  const [updateAppointmentStatus] = useMutation(UPDATE_APPOINTMENT_STATUS, {
    onError: (error) => {
      setError(`Error updating appointment status: ${error.message}`);
    }
  });
  
  const [updateContactStatus] = useMutation(UPDATE_CONTACT_STATUS, {
    onError: (error) => {
      setError(`Error updating contact status: ${error.message}`);
    }
  });
  
  const isLoading = loadingAppointments || loadingContacts;
      });
    } catch (error) {
      console.error('Error saving appointment:', error);
      setSnackbar({
        open: true,
        message: `Failed to ${appointmentData?.id ? 'update' : 'create'} appointment: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const isLoading = loadingAppointments || loadingContacts;

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Snackbar for notifications */}
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
        </Alert>
      </Snackbar>
      
      {/* Header with title and actions */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Admin Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenForm()}
            sx={{ minWidth: 180 }}
          >
            New Appointment
          </Button>
          
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={handleRefresh} 
              disabled={isLoading}
              color="primary"
              sx={{ border: '1px solid', borderColor: 'divider' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
            startIcon={<LogoutIcon />}
          >
            Sign Out
          </Button>
        </Box>
      </Box>
      
      {/* Dashboard Tabs */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange} 
            aria-label="dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Overview" />
            <Tab label="Appointments" />
            <Tab label="Messages" />
          </Tabs>
        </Box>
      </Box>
      
      {/* Tab Content */}
      <Box sx={{ width: '100%' }}>
        {/* Overview Tab */}
        {currentTab === 0 && (
          <Box>
            <DashboardMetrics 
              appointments={appointments}
              loading={loadingAppointments}
            />
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Recent Appointments
              </Typography>
              <DataTable
                columns={appointmentColumns}
                data={appointments.slice(0, 5)}
                onRowClick={(e, row) => handleOpenForm(row)}
                onEdit={handleOpenForm}
                onDelete={(row) => {
                  setAppointmentToDelete(row);
                  setDeleteDialogOpen(true);
                }}
                onSelectionChange={handleRowSelect}
                onBulkAction={handleBulkAction}
                loading={loadingAppointments}
                title=""
                showSearch={false}
                showToolbar={false}
                showPagination={false}
              />
            </Box>
          </Box>
        )}
        
        {/* Appointments Tab */}
        {currentTab === 1 && (
          <DataTable
            columns={appointmentColumns}
            data={filteredAppointments}
            onRowClick={(e, row) => handleOpenForm(row)}
            onEdit={handleOpenForm}
            onDelete={(row) => {
              setAppointmentToDelete(row);
              setDeleteDialogOpen(true);
            }}
            onRefresh={handleRefresh}
            onSelectionChange={handleRowSelect}
            onBulkAction={handleBulkAction}
            loading={loadingAppointments}
            title="Appointment Management"
            searchText={searchText}
            onSearchChange={setSearchText}
            filters={filters}
            onFilterChange={handleFilterChange}
            selectedRows={selectedRows}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            bulkActions={[
              {
                label: 'Delete Selected',
                icon: <DeleteIcon />,
                action: 'delete',
                color: 'error'
              },
              {
                label: 'Mark as Confirmed',
                action: () => handleBulkStatusUpdate('CONFIRMED'),
                color: 'info'
              },
              {
                label: 'Mark as Completed',
                action: () => handleBulkStatusUpdate('COMPLETED'),
                color: 'success'
              },
              {
                label: 'Mark as Cancelled',
                action: () => handleBulkStatusUpdate('CANCELLED'),
                color: 'error'
              }
            ]}
          />
        )}
        
        {/* Messages Tab */}
        {currentTab === 2 && (
          <DataTable
            columns={contactColumns}
            data={contacts}
            loading={loadingContacts}
            title="Contact Messages"
            searchText={searchText}
            onSearchChange={setSearchText}
            onRefresh={handleRefresh}
          />
        )}
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
        onConfirm={handleConfirmDelete}
        title={selectedRows.length > 0 ? 'Delete Selected Appointments' : 'Delete Appointment'}
        content={
          selectedRows.length > 0
            ? `Are you sure you want to delete ${selectedRows.length} selected appointments? This action cannot be undone.`
            : `Are you sure you want to delete the appointment for ${appointmentToDelete?.firstName} ${appointmentToDelete?.lastName}?`
        }
      />
      
      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog 
        open={showShortcutsHelp} 
        onClose={() => setShowShortcutsHelp(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Keyboard Shortcuts</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Navigation</Typography>
              <Box component="dl" sx={{ m: 0 }}>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box component="dt" sx={{ width: 120, fontWeight: 'medium' }}>Ctrl + →</Box>
                  <Box component="dd" sx={{ m: 0 }}>Next tab</Box>
                </Box>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box component="dt" sx={{ width: 120, fontWeight: 'medium' }}>Ctrl + ←</Box>
                  <Box component="dd" sx={{ m: 0 }}>Previous tab</Box>
                </Box>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>Actions</Typography>
              <Box component="dl" sx={{ m: 0 }}>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box component="dt" sx={{ width: 120, fontWeight: 'medium' }}>N</Box>
                  <Box component="dd" sx={{ m: 0 }}>New appointment</Box>
                </Box>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box component="dt" sx={{ width: 120, fontWeight: 'medium' }}>R</Box>
                  <Box component="dd" sx={{ m: 0 }}>Refresh data</Box>
                </Box>
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box component="dt" sx={{ width: 120, fontWeight: 'medium' }}>Ctrl + F</Box>
                  <Box component="dd" sx={{ m: 0 }}>Search</Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShortcutsHelp(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Keyboard Shortcut Helper */}
      <Box 
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1200
        }}
      >
        <Tooltip title="Keyboard Shortcuts (Press ? to view)">
          <IconButton
            onClick={() => setShowShortcutsHelp(true)}
            sx={{
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              boxShadow: 3,
            }}
          >
            <Typography variant="body2" fontWeight="bold">?</Typography>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default AdminDashboard;
