import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  CircularProgress,
  TextField
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { GET_ANALYTICS } from '../../graphql/analytics';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [reportType, setReportType] = useState('appointments');
  const [exportFormat, setExportFormat] = useState('pdf');

  const { loading, error, data, refetch } = useQuery(GET_ANALYTICS, {
    variables: {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString()
    },
    fetchPolicy: 'cache-and-network'
  });

  useEffect(() => {
    refetch();
  }, [dateRange, refetch]);

  const handleDateChange = (field) => (newValue) => {
    setDateRange(prev => ({
      ...prev,
      [field]: newValue
    }));
  };

  const exportToFile = () => {
    if (!data) return;

    if (exportFormat === 'excel') {
      const wb = XLSX.utils.book_new();
      
      // Export appointments data
      if (data.appointmentStats) {
        const ws = XLSX.utils.json_to_sheet(data.appointmentStats.byStatus);
        XLSX.utils.book_append_sheet(wb, ws, 'Appointment Stats');
      }
      
      // Export revenue data
      if (data.revenueStats) {
        const ws = XLSX.utils.json_to_sheet(data.revenueStats.monthlyRevenue);
        XLSX.utils.book_append_sheet(wb, ws, 'Revenue Stats');
      }
      
      XLSX.writeFile(wb, `analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      // PDF Export - Using basic PDF generation
      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const textPadding = 14;
      const lineHeight = 7;
      const col1 = 20;
      const col2 = 100;
      const col3 = 150;
      
      // Function to add a new page if needed
      const checkPageBreak = (y) => {
        if (y > 280) { // Near bottom of page
          doc.addPage();
          return 20; // Reset y position for new page
        }
        return y;
      };
      
      // Add title
      doc.setFontSize(20);
      doc.text('Analytics Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Add date range
      doc.setFontSize(12);
      doc.text(
        `Date Range: ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`,
        pageWidth / 2,
        yPos,
        { align: 'center' }
      );
      yPos += 15;
      
      // Add appointment stats
      if (data.appointmentStats) {
        yPos = checkPageBreak(yPos);
        doc.setFontSize(16);
        doc.text('Appointment Statistics', textPadding, yPos);
        yPos += 10;
        
        // Table header
        doc.setFillColor(41, 128, 185);
        doc.setTextColor(255, 255, 255);
        doc.rect(textPadding, yPos, pageWidth - (textPadding * 2), 10, 'F');
        doc.text('Status', col1, yPos + 7);
        doc.text('Count', col2, yPos + 7);
        doc.text('Revenue', col3, yPos + 7);
        yPos += 12;
        
        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        data.appointmentStats.byStatus.forEach(stat => {
          yPos = checkPageBreak(yPos);
          doc.text(stat.status, col1, yPos + 7);
          doc.text(stat.count.toString(), col2, yPos + 7);
          doc.text(`$${stat.revenue?.toFixed(2) || '0.00'}`, col3, yPos + 7);
          yPos += 8;
          
          // Add a line between rows
          doc.setDrawColor(200, 200, 200);
          doc.line(textPadding, yPos + 2, pageWidth - textPadding, yPos + 2);
          yPos += 4;
        });
        
        yPos += 10;
      }
      
      // Add revenue stats
      if (data.revenueStats) {
        yPos = checkPageBreak(yPos);
        doc.setFontSize(16);
        doc.text('Revenue Statistics', textPadding, yPos);
        yPos += 10;
        
        // Table header
        doc.setFillColor(39, 174, 96);
        doc.setTextColor(255, 255, 255);
        doc.rect(textPadding, yPos, pageWidth - (textPadding * 2), 10, 'F');
        doc.text('Month', col1, yPos + 7);
        doc.text('Revenue', col2, yPos + 7);
        doc.text('Appointments', col3, yPos + 7);
        yPos += 12;
        
        // Table rows
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        data.revenueStats.monthlyRevenue.forEach(stat => {
          yPos = checkPageBreak(yPos);
          doc.text(stat.month, col1, yPos + 7);
          doc.text(`$${stat.revenue.toFixed(2)}`, col2, yPos + 7);
          doc.text(stat.count.toString(), col3, yPos + 7);
          yPos += 8;
          
          // Add a line between rows
          doc.setDrawColor(200, 200, 200);
          doc.line(textPadding, yPos + 2, pageWidth - textPadding, yPos + 2);
          yPos += 4;
        });
      }
      
      doc.save(`analytics_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">Error loading analytics: {error.message}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Analytics Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Start Date"
              value={dateRange.startDate}
              onChange={handleDateChange('startDate')}
              renderInput={(params) => <TextField {...params} size="small" sx={{ width: 180 }} />}
            />
            <DatePicker
              label="End Date"
              value={dateRange.endDate}
              onChange={handleDateChange('endDate')}
              renderInput={(params) => <TextField {...params} size="small" sx={{ width: 180 }} />}
              minDate={dateRange.startDate}
            />
          </LocalizationProvider>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportType}
              label="Report Type"
              onChange={(e) => setReportType(e.target.value)}
            >
              <MenuItem value="appointments">Appointments</MenuItem>
              <MenuItem value="revenue">Revenue</MenuItem>
              <MenuItem value="users">User Activity</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Export Format</InputLabel>
              <Select
                value={exportFormat}
                label="Export Format"
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <MenuItem value="pdf">PDF</MenuItem>
                <MenuItem value="excel">Excel</MenuItem>
              </Select>
            </FormControl>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={exportToFile}
              disabled={!data}
            >
              Export
            </Button>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Appointments</Typography>
              <Typography variant="h4">
                {data?.appointmentStats?.totalAppointments || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Revenue</Typography>
              <Typography variant="h4">
                ${data?.revenueStats?.totalRevenue?.toFixed(2) || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Active Users</Typography>
              <Typography variant="h4">
                {data?.userStats?.activeUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Appointments by Status</Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data?.appointmentStats?.byStatus || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Appointments" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Revenue by Service</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.revenueStats?.byService || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                  nameKey="service"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data?.revenueStats?.byService?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Monthly Revenue Trend</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.revenueStats?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>User Activity</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.userStats?.activity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="logins" fill="#8884d8" name="Logins" />
                <Bar yAxisId="right" dataKey="appointments" fill="#82ca9d" name="Appointments" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
