import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs, 
  Tab, 
  useTheme, 
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Message as MessageIcon, 
  Send as SendIcon, 
  Inbox as InboxIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import debounce from 'lodash/debounce';
import { useQuery, useMutation, gql } from '@apollo/client';
import MessageForm from './MessageForm';
import { format } from 'date-fns';

// GraphQL Queries
const GET_MESSAGES = gql`
  query GetMessages($type: String, $page: Int, $limit: Int) {
    messages(type: $type, page: $page, limit: $limit) {
      messages {
        id
        subject
        content
        messageType
        status
        recipientType
        recipientId
        scheduledAt
        sentAt
        createdAt
        updatedAt
        sender {
          id
          email
          fullName
          phone
        }
        contact {
          id
          name
          email
          phone
          subject
          message
          status
          createdAt
          updatedAt
        }
        appointment {
          id
          firstName
          lastName
          email
          phone
          service
          appointmentDate
          status
          notes
        }
      }
      totalCount
    }
  }
`;

const DELETE_MESSAGE = gql`
  mutation DeleteMessage($id: ID!) {
    deleteMessage(id: $id)
  }
`;

const UPDATE_MESSAGE_STATUS = gql`
  mutation UpdateMessageStatus($id: ID!, $status: String!) {
    updateMessageStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

const MESSAGES_PER_PAGE = 10;

const Messages = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(MESSAGES_PER_PAGE);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch messages based on tab
  const { loading, error, data, refetch, networkStatus } = useQuery(GET_MESSAGES, {
    variables: { 
      type: tabValue === 0 ? 'all' : tabValue === 1 ? 'inbox' : 'sent',
      page: page + 1,
      limit: rowsPerPage,
    },
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
    onCompleted: (data) => {
      console.log('Messages data received:', data);
      if (data?.messages) {
        console.log(`Fetched ${data.messages.messages?.length || 0} messages out of ${data.messages.totalCount}`);
      }
    },
    onError: (error) => {
      console.error('Error loading messages:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error.networkError?.result?.errors?.[0]?.message || error.message;
      
      if (error.networkError?.statusCode === 429) {
        // Handle rate limiting specifically
        setSnackbar({
          open: true,
          message: 'Too many requests. Please wait a moment and try again.',
          severity: 'warning',
          autoHideDuration: 5000,
        });
      } else {
        setSnackbar({
          open: true,
          message: `Error loading messages: ${errorMessage}`,
          severity: 'error',
        });
      }
    },
  });

  // Debounce refetch to prevent rapid requests
  const debouncedRefetch = React.useCallback(
    debounce((variables) => {
      refetch(variables).catch(console.error);
    }, 500, { leading: true, trailing: true }),
    [refetch]
  );

  // Handle tab change with debounced refetch
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0); // Reset to first page when changing tabs
    debouncedRefetch({
      type: newValue === 0 ? 'all' : newValue === 1 ? 'inbox' : 'sent',
      page: 1,
      limit: rowsPerPage,
    });
  };

  // Handle page change with debounced refetch
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    debouncedRefetch({
      type: tabValue === 0 ? 'all' : tabValue === 1 ? 'inbox' : 'sent',
      page: newPage + 1,
      limit: rowsPerPage,
    });
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    debouncedRefetch({
      type: tabValue === 0 ? 'all' : tabValue === 1 ? 'inbox' : 'sent',
      page: 1,
      limit: newRowsPerPage,
    });
  };

  const [deleteMessage] = useMutation(DELETE_MESSAGE, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Message deleted successfully',
        severity: 'success'
      });
      refetch();
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error deleting message: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const [updateMessageStatus] = useMutation(UPDATE_MESSAGE_STATUS, {
    onCompleted: () => {
      setSnackbar({
        open: true,
        message: 'Message status updated',
        severity: 'success'
      });
      refetch();
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `Error updating message: ${error.message}`,
        severity: 'error'
      });
    }
  });

  const handleViewMessage = (message) => {
    setSelectedMessage(message);
    setViewDialogOpen(true);
    
    // Mark as read if unread
    if (message.status === 'UNREAD') {
      updateMessageStatus({
        variables: {
          id: message.id,
          status: 'READ'
        }
      });
    }
  };

  const handleDeleteClick = (message) => {
    setMessageToDelete(message);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (messageToDelete) {
      deleteMessage({
        variables: {
          id: messageToDelete.id
        }
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPpp');
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'sent':
        return 'primary';
      case 'delivered':
        return 'success';
      case 'failed':
        return 'error';
      case 'read':
        return 'info';
      case 'unread':
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const messages = data?.messages?.messages || [];
  const totalCount = data?.messages?.totalCount || 0;
  
  console.log('Rendering messages:', messages.length, 'total:', totalCount);
  if (messages.length === 0) {
    console.log('No messages found. Possible issues:');
    console.log('- User might not be authenticated');
    console.log('- No messages in the database for this user');
    console.log('- Database query returned no results');
    console.log('- Check backend logs for any errors');
    
    // Log authentication status
    const token = localStorage.getItem('access_token');
    console.log('Authentication status:', token ? 'Authenticated' : 'Not authenticated');
    
    if (token) {
      console.log('Token exists, checking if valid...');
      // You might want to add token validation here
    }
  }

  const columns = [
    { id: 'sender', label: 'From', minWidth: 150 },
    { id: 'subject', label: 'Subject', minWidth: 200 },
    { 
      id: 'contactInfo', 
      label: 'Contact Info', 
      minWidth: 200,
      format: (value) => (
        <Box>
          {value?.name && <div>{value.name}</div>}
          {value?.email && <div>{value.email}</div>}
          {value?.phone && <div>{value.phone}</div>}
        </Box>
      )
    },
    { 
      id: 'appointmentInfo', 
      label: 'Appointment', 
      minWidth: 200,
      format: (value) => (
        <Box>
          {value?.service && <div><strong>Service:</strong> {value.service}</div>}
          {value?.appointmentDate && <div><strong>Date:</strong> {new Date(value.appointmentDate).toLocaleString()}</div>}
          {value?.status && <div><strong>Status:</strong> {value.status}</div>}
        </Box>
      )
    },
    { id: 'createdAt', label: 'Date', minWidth: 120 },
    { id: 'status', label: 'Status', minWidth: 100 },
    { id: 'actions', label: 'Actions', minWidth: 100, align: 'right' },
  ];

  const rows = messages?.map((message) => ({
    id: message.id,
    sender: message.sender?.fullName || message.sender?.email || 'Unknown Sender',
    subject: message.subject,
    content: message.content,
    status: message.status,
    contactInfo: message.contact || null,
    appointmentInfo: message.appointment || null,
    createdAt: format(new Date(message.createdAt), 'MMM d, yyyy h:mm a'),
    actions: message.id,
  })) || [];

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab 
            icon={<SendIcon />} 
            label="Compose" 
            iconPosition="start" 
            sx={{ minHeight: 64 }}
          />
          <Tab 
            icon={<InboxIcon />} 
            label={`Inbox ${tabValue === 1 && totalCount > 0 ? `(${totalCount})` : ''}`} 
            iconPosition="start" 
            sx={{ minHeight: 64 }}
          />
          <Tab 
            icon={<MessageIcon />} 
            label={`Sent ${tabValue === 2 && totalCount > 0 ? `(${totalCount})` : ''}`} 
            iconPosition="start" 
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Paper>
      
      {tabValue === 0 ? (
        <MessageForm onSuccess={() => {
          setTabValue(2); // Switch to Sent tab after sending
          refetch();
        }} />
      ) : (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {tabValue === 1 ? 'Inbox' : 'Sent Messages'}
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={() => refetch()}
              disabled={networkStatus === 4}
            >
              Refresh
            </Button>
          </Box>
          
          {(() => {
            if (loading || networkStatus === 4) {
              return (
                <Box display="flex" flexDirection="column" alignItems="center" p={4}>
                  <CircularProgress />
                  <Box mt={2}>
                    <Typography variant="body2" color="textSecondary">
                      Loading messages...
                    </Typography>
                  </Box>
                </Box>
              );
            }
            
            if (error) {
              return (
                <Box p={3}>
                  <Alert 
                    severity="error" 
                    action={
                      <Button 
                        color="inherit" 
                        size="small" 
                        onClick={() => refetch()}
                        disabled={networkStatus === 4}
                      >
                        Retry
                      </Button>
                    }
                  >
                    Error loading messages. {error.networkError?.result?.errors?.[0]?.message || error.message}
                  </Alert>
                </Box>
              );
            }
            
            if (!data?.messages?.length) {
              return (
                <Box p={3} textAlign="center">
                  <InboxIcon fontSize="large" color="disabled" />
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No messages found
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<RefreshIcon />}
                    onClick={() => refetch()}
                    disabled={networkStatus === 4}
                  >
                    Refresh
                  </Button>
                </Box>
              );
            }
            
            return (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {columns.map((column) => (
                        <TableCell key={column.id} align={column.align} style={{ minWidth: column.minWidth }}>
                          {column.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow 
                        key={row.id}
                        hover 
                        sx={{ 
                          cursor: 'pointer',
                          backgroundColor: row.status === 'UNREAD' ? 'action.hover' : 'inherit'
                        }}
                      >
                        {columns.map((column) => (
                          <TableCell 
                            key={column.id} 
                            align={column.align} 
                            onClick={() => handleViewMessage(row)}
                            sx={{ fontWeight: row.status === 'UNREAD' ? 'bold' : 'normal' }}
                          >
                            {column.format ? column.format(row[column.id]) : row[column.id]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </Paper>
      )}
      
      {/* View Message Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedMessage && (
          <>
            <DialogContent>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {selectedMessage.subject}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  From: {selectedMessage.sender?.fullName || selectedMessage.sender?.email}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {format(new Date(selectedMessage.createdAt), 'PPpp')}
                </Typography>
                
                {selectedMessage.contact && (
                  <Box mt={3} mb={3} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      Contact Information:
                    </Typography>
                    <Box pl={2}>
                      <Typography><strong>Name:</strong> {selectedMessage.contact.name}</Typography>
                      <Typography><strong>Email:</strong> {selectedMessage.contact.email}</Typography>
                      {selectedMessage.contact.phone && (
                        <Typography><strong>Phone:</strong> {selectedMessage.contact.phone}</Typography>
                      )}
                      <Typography><strong>Status:</strong> {selectedMessage.contact.status}</Typography>
                      <Typography variant="caption">
                        Submitted: {format(new Date(selectedMessage.contact.createdAt), 'PPpp')}
                      </Typography>
                    </Box>
                  </Box>
                )}
                  
                <Box mb={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Message Type:
                  </Typography>
                  <Typography variant="body1">
                    {selectedMessage.messageType || 'Email'}
                  </Typography>
                </Box>
                
                <Box mb={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Message:
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      mt: 1,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      backgroundColor: 'background.paper'
                    }}
                  >
                    {selectedMessage.content}
                  </Paper>
                </Box>
                
                {tabValue === 2 && selectedMessage.recipients?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Recipient Status:
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Recipient</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Delivered At</TableCell>
                            <TableCell>Read At</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedMessage.recipients.map((recipient) => (
                            <TableRow key={recipient.id}>
                              <TableCell>
                                {recipient.recipient?.fullName || recipient.recipient?.email || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={recipient.status}
                                  size="small"
                                  color={getStatusColor(recipient.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {recipient.deliveredAt ? formatDate(recipient.deliveredAt) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                {recipient.readAt ? formatDate(recipient.readAt) : 'Not read'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
              {tabValue === 2 && (
                <Button 
                  color="error"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleDeleteClick(selectedMessage);
                  }}
                >
                  Delete
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this message? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
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
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Messages;
