import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select,
  CircularProgress,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Download, Refresh } from '@mui/icons-material';
import { useQuery } from '@apollo/client';
import { GET_ANALYTICS } from '../../../graphql/analytics';
import { format, subMonths, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: subMonths(new Date(), 6),
    endDate: new Date(),
  });
  const [reportType, setReportType] = useState('appointments');
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const { loading, error: queryError, data, refetch } = useQuery(GET_ANALYTICS, {
    variables: {
      startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
      endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
    },
    fetchPolicy: 'cache-and-network',
    onError: (err) => {
      console.error('Error fetching report data:', err);
      setError('Failed to load report data. Please try again.');
      setSnackbarOpen(true);
    },
  });

  // Process data for charts
  const processAppointmentData = () => {
    if (!data?.appointmentStats?.byStatus) return [];
    return data.appointmentStats.byStatus.map(stat => ({
      name: stat.status,
      value: stat.count,
      revenue: stat.revenue
    }));
  };

  const processRevenueData = () => {
    if (!data?.revenueStats?.monthlyRevenue) return [];
    return data.revenueStats.monthlyRevenue.map(item => ({
      name: item.month,
      revenue: item.revenue,
      count: item.count
    }));
  };

  const processServiceData = () => {
    if (!data?.revenueStats?.byService) return [];
    return data.revenueStats.byService.map(service => ({
      name: service.service,
      value: service.count,
      revenue: service.revenue
    }));
  };

  const handleDateRangeChange = (date, type) => {
    setDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  const handleRefresh = () => {
    refetch({
      startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
      endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
    });
  };

  const exportToExcel = () => {
    if (!data) return;

    // Prepare data for Excel
    const excelData = [];
    
    // Add appointments data
    if (data.appointmentStats?.byStatus) {
      excelData.push(['Appointments by Status']);
      excelData.push(['Status', 'Count', 'Revenue']);
      data.appointmentStats.byStatus.forEach(stat => {
        excelData.push([stat.status, stat.count, `$${stat.revenue?.toFixed(2) || '0.00'}`]);
      });
      excelData.push(['']);
    }

    // Add revenue data
    if (data.revenueStats?.byService) {
      excelData.push(['Revenue by Service']);
      excelData.push(['Service', 'Count', 'Total Revenue']);
      data.revenueStats.byService.forEach(service => {
        excelData.push([service.service, service.count, `$${service.revenue?.toFixed(2) || '0.00'}`]);
      });
      excelData.push(['']);
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!data) return;
    
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Analytics Report', 14, 20);
    
    // Add date range
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(
      `Date Range: ${format(dateRange.startDate, 'MMM d, yyyy')} - ${format(dateRange.endDate, 'MMM d, yyyy')}`, 
      14, 
      30
    );
    
    // Add appointments by status
    if (data.appointmentStats?.byStatus && data.appointmentStats.byStatus.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('Appointments by Status', 14, 45);
      
      // Simple table implementation
      const startY = 55;
      const cellPadding = 10;
      const headers = ['Status', 'Count', 'Revenue'];
      const rows = data.appointmentStats.byStatus.map(stat => [
        stat.status,
        stat.count.toString(),
        `$${stat.revenue?.toFixed(2) || '0.00'}`
      ]);
      
      // Draw table headers
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, startY, 182, 10, 'F');
      
      headers.forEach((header, i) => {
        doc.text(header, 20 + (i * 60), startY + 7);
      });
      
      // Draw table rows
      doc.setTextColor(0, 0, 0);
      rows.forEach((row, rowIndex) => {
        const y = startY + 10 + (rowIndex * 10);
        row.forEach((cell, cellIndex) => {
          doc.text(cell, 20 + (cellIndex * 60), y + 7);
        });
        // Add a line between rows
        if (rowIndex < rows.length - 1) {
          doc.line(14, y + 10, 196, y + 10);
        }
      });
    }
    
    // Add revenue by service
    if (data.revenueStats?.byService && data.revenueStats.byService.length > 0) {
      const lastY = doc.internal.getNumberOfPages() === 1 ? 100 : 20;
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text('Revenue by Service', 14, lastY + 30);
      
      // Simple table implementation
      const startY = lastY + 40;
      const headers = ['Service', 'Count', 'Total Revenue'];
      const rows = data.revenueStats.byService.map(service => [
        service.service,
        service.count.toString(),
        `$${service.revenue?.toFixed(2) || '0.00'}`
      ]);
      
      // Draw table headers
      doc.setFillColor(41, 128, 185);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, startY, 182, 10, 'F');
      
      headers.forEach((header, i) => {
        doc.text(header, 20 + (i * 60), startY + 7);
      });
      
      // Draw table rows
      doc.setTextColor(0, 0, 0);
      rows.forEach((row, rowIndex) => {
        const y = startY + 10 + (rowIndex * 10);
        row.forEach((cell, cellIndex) => {
          doc.text(cell, 20 + (cellIndex * 60), y + 7);
        });
        // Add a line between rows
        if (rowIndex < rows.length - 1) {
          doc.line(14, y + 10, 196, y + 10);
        }
      });
    }
    
    // Save the PDF
    doc.save(`report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleExport = () => {
    if (!data) {
      setError('No data available to export');
      setSnackbarOpen(true);
      return;
    }
    
    // For now, we'll default to PDF export
    // You could add a dialog to let the user choose the format
    exportToPDF();
    // Uncomment the line below to use Excel export instead
    // exportToExcel();
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Box sx={{ p: 3 }}>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4">Reports Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Download />}
            onClick={handleExport}
            disabled={loading}
          >
            Export Report
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel id="report-type-label">Report Type</InputLabel>
              <Select
                labelId="report-type-label"
                value={reportType}
                label="Report Type"
                onChange={(e) => setReportType(e.target.value)}
              >
                <MenuItem value="appointments">Appointments</MenuItem>
                <MenuItem value="revenue">Revenue</MenuItem>
                <MenuItem value="services">Services</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(date) => handleDateRangeChange(date, 'startDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
                maxDate={dateRange.endDate}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(date) => handleDateRangeChange(date, 'endDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDate={dateRange.startDate}
                maxDate={new Date()}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>
      
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Appointments Overview */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>Appointments Overview</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processAppointmentData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name, props) => [value, `${props.payload.name} ($${props.payload.revenue || 0})`]} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8">
                      {processAppointmentData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Monthly Revenue */}
            <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>Monthly Revenue</Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : processRevenueData().length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={processRevenueData()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip formatter={(value, name) => name === 'revenue' ? [`$${value}`, 'Revenue'] : [value, 'Appointments']} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="count" stroke="#82ca9d" name="Appointments" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography color="textSecondary">No revenue data available</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

            {/* Services Distribution */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>Services Distribution</Typography>
                {loading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <CircularProgress />
                  </Box>
                ) : processServiceData().length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={processServiceData()}
                      layout="vertical"
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip formatter={(value, name, props) => [value, `${props.payload.name} ($${props.payload.revenue || 0})`]} />
                      <Legend />
                      <Bar dataKey="value" fill="#82ca9d" name="Number of Appointments" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="textSecondary">No service data available</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Summary Cards */}
            <Grid item xs={12}>
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" color="textSecondary" gutterBottom>Total Appointments</Typography>
                    <Typography variant="h4">
                      {loading ? '...' : (data?.appointmentStats?.totalAppointments || 0)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" color="textSecondary" gutterBottom>Total Revenue</Typography>
                    <Typography variant="h4">
                      {loading ? '...' : `$${(data?.revenueStats?.totalRevenue || 0).toLocaleString()}`}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle1" color="textSecondary" gutterBottom>Active Users</Typography>
                    <Typography variant="h4">
                      {loading ? '...' : (data?.userStats?.activeUsers || 0)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default Reports;
