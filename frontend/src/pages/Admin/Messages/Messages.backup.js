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
    onError: (error) => {
      console.error('Error loading messages:', error);
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
    switch (status) {
      case 'SENT':
        return 'primary';
      case 'DELIVERED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'READ':
        return 'info';
      case 'UNREAD':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Safely access messages data with fallbacks
  const messages = Array.isArray(data?.messages?.messages) ? data.messages.messages : [];
  const totalCount = typeof data?.messages?.totalCount === 'number' ? data.messages.totalCount : 0;

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Messages
      </Typography>
      
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
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      {tabValue === 1 && <TableCell>From</TableCell>}
                      {tabValue === 2 && <TableCell>To</TableCell>}
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {messages.map((message) => (
                      <TableRow 
                        key={message.id}
                        hover 
                        sx={{ 
                          cursor: 'pointer',
                          backgroundColor: message.status === 'UNREAD' ? 'action.hover' : 'inherit'
                        }}
                      >
                        <TableCell 
                          onClick={() => handleViewMessage(message)}
                          sx={{ fontWeight: message.status === 'UNREAD' ? 'bold' : 'normal' }}
                        >
                          {message.subject || '(No subject)'}
                        </TableCell>
                        {tabValue === 1 && (
                          <TableCell onClick={() => handleViewMessage(message)}>
                            {message.sender?.fullName || message.sender?.email || 'System'}
                          </TableCell>
                        )}
                        {tabValue === 2 && (
                          <TableCell onClick={() => handleViewMessage(message)}>
                            {message.recipientType === 'ALL' 
                              ? 'All Users' 
                              : message.recipients?.[0]?.recipient?.fullName || 
                                message.recipients?.[0]?.recipient?.email ||
                                'Unknown Recipient'}
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip 
                            label={message.status}
                            size="small"
                            color={getStatusColor(message.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell onClick={() => handleViewMessage(message)}>
                          {formatDate(message.sentAt || message.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={1}>
                            <Tooltip title="View">
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewMessage(message);
                                }}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {tabValue === 2 && (
                              <Tooltip title="Delete">
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(message);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
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
            <DialogTitle>
              {selectedMessage.subject || '(No subject)'}
              <Box display="flex" alignItems="center" mt={1}>
                <Chip 
                  label={selectedMessage.status}
                  size="small"
                  color={getStatusColor(selectedMessage.status)}
                  variant="outlined"
                  sx={{ mr: 1 }}
                />
                <Typography variant="caption" color="textSecondary">
                  {formatDate(selectedMessage.sentAt || selectedMessage.createdAt)}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box mb={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  {tabValue === 1 ? 'From:' : 'To:'}
                </Typography>
                <Typography variant="body1">
                  {tabValue === 1 
                    ? `${selectedMessage.sender?.fullName || selectedMessage.sender?.email || 'System'}`
                    : selectedMessage.recipientType === 'ALL' 
                      ? 'All Users' 
                      : selectedMessage.recipients?.map(r => r.recipient?.fullName || r.recipient?.email).join(', ')}
                </Typography>
              </Box>
              
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
