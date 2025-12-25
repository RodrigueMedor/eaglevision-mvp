import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormHelperText,
  Snackbar,
} from '@mui/material';
import { Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';

// Sample tax regions - in a real app, this would come from an API
const TAX_REGIONS = [
  { id: 'us-fl', name: 'United States - Florida' },
  { id: 'us-ca', name: 'United States - California' },
  { id: 'eu-de', name: 'European Union - Germany' },
  { id: 'eu-fr', name: 'European Union - France' },
  { id: 'uk', name: 'United Kingdom' },
  { id: 'ca', name: 'Canada' },
  { id: 'au', name: 'Australia' },
];

const TAX_ROUNDING_METHODS = [
  { value: 'nearest_cent', label: 'Nearest Cent' },
  { value: 'round_up', label: 'Round Up' },
  { value: 'round_down', label: 'Round Down' },
];

const TaxSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    isEnabled: false,
    taxInclusive: false,
    roundingMethod: 'nearest_cent',
    taxLabel: 'Sales Tax',
    taxRegions: [],
    taxExemptThreshold: 0,
    taxExemptCategories: [],
  });
  const [newRegion, setNewRegion] = useState('');
  const [newRegionRate, setNewRegionRate] = useState('');
  const [newExemptCategory, setNewExemptCategory] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load saved settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('taxSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleAddTaxRegion = () => {
    if (!newRegion || !newRegionRate) return;
    
    const region = TAX_REGIONS.find(r => r.id === newRegion);
    if (!region) return;

    const regionExists = settings.taxRegions.some(r => r.id === newRegion);
    if (regionExists) {
      setSnackbar({
        open: true,
        message: 'This tax region already exists',
        severity: 'error'
      });
      return;
    }

    const updatedRegions = [
      ...settings.taxRegions,
      {
        id: region.id,
        name: region.name,
        rate: parseFloat(newRegionRate)
      }
    ];

    setSettings(prev => ({
      ...prev,
      taxRegions: updatedRegions
    }));

    setNewRegion('');
    setNewRegionRate('');
  };

  const handleRemoveTaxRegion = (regionId) => {
    setSettings(prev => ({
      ...prev,
      taxRegions: prev.taxRegions.filter(r => r.id !== regionId)
    }));
  };

  const handleAddExemptCategory = () => {
    if (!newExemptCategory.trim()) return;
    
    setSettings(prev => ({
      ...prev,
      taxExemptCategories: [...prev.taxExemptCategories, newExemptCategory.trim()]
    }));
    
    setNewExemptCategory('');
  };

  const handleRemoveExemptCategory = (category) => {
    setSettings(prev => ({
      ...prev,
      taxExemptCategories: prev.taxExemptCategories.filter(c => c !== category)
    }));
  };

  const handleSaveSettings = () => {
    // Validate settings
    if (settings.isEnabled && settings.taxRegions.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please add at least one tax region when tax is enabled',
        severity: 'error'
      });
      return;
    }

    // Save to localStorage (in a real app, this would be an API call)
    localStorage.setItem('taxSettings', JSON.stringify(settings));
    
    setSnackbar({
      open: true,
      message: 'Tax settings saved successfully!',
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (!user || (user.role !== 'admin' && user.role !== 'finance')) {
    return (
      <Box p={3}>
        <Typography color="error">
          You don't have permission to access this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tax Settings
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Global Tax Settings</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.isEnabled}
                  onChange={(e) => handleSettingChange('isEnabled', e.target.checked)}
                />
              }
              label="Enable Tax Calculation"
            />
            <FormHelperText>
              Enable or disable tax calculation for all purchases
            </FormHelperText>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.taxInclusive}
                  onChange={(e) => handleSettingChange('taxInclusive', e.target.checked)}
                  disabled={!settings.isEnabled}
                />
              }
              label="Prices Include Tax"
            />
            <FormHelperText>
              When enabled, product prices include tax. When disabled, tax is added at checkout.
            </FormHelperText>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tax Label"
              value={settings.taxLabel}
              onChange={(e) => handleSettingChange('taxLabel', e.target.value)}
              disabled={!settings.isEnabled}
              helperText="This text will be shown to customers (e.g., 'Sales Tax', 'VAT')"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth disabled={!settings.isEnabled}>
              <InputLabel>Rounding Method</InputLabel>
              <Select
                value={settings.roundingMethod}
                label="Rounding Method"
                onChange={(e) => handleSettingChange('roundingMethod', e.target.value)}
              >
                {TAX_ROUNDING_METHODS.map((method) => (
                  <MenuItem key={method.value} value={method.value}>
                    {method.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>How to round tax calculations</FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Tax Regions & Rates</Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Add the regions where you need to charge tax and specify the tax rate for each.
        </Typography>
        
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Select Region</InputLabel>
              <Select
                value={newRegion}
                label="Select Region"
                onChange={(e) => setNewRegion(e.target.value)}
                disabled={!settings.isEnabled}
              >
                {TAX_REGIONS
                  .filter(region => !settings.taxRegions.some(r => r.id === region.id))
                  .map((region) => (
                    <MenuItem key={region.id} value={region.id}>
                      {region.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="number"
              label="Tax Rate %"
              value={newRegionRate}
              onChange={(e) => setNewRegionRate(e.target.value)}
              disabled={!settings.isEnabled || !newRegion}
              InputProps={{
                endAdornment: <span>%</span>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTaxRegion}
              disabled={!newRegion || !newRegionRate || !settings.isEnabled}
              fullWidth
            >
              Add Tax Region
            </Button>
          </Grid>
        </Grid>
        
        {settings.taxRegions.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Region</TableCell>
                  <TableCell align="right">Tax Rate</TableCell>
                  <TableCell width={100}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settings.taxRegions.map((region) => (
                  <TableRow key={region.id}>
                    <TableCell>{region.name}</TableCell>
                    <TableCell align="right">{region.rate}%</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        onClick={() => handleRemoveTaxRegion(region.id)}
                        disabled={!settings.isEnabled}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Tax Exemptions</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Tax Exempt Threshold"
              value={settings.taxExemptThreshold || ''}
              onChange={(e) => handleSettingChange('taxExemptThreshold', parseFloat(e.target.value) || 0)}
              disabled={!settings.isEnabled}
              InputProps={{
                startAdornment: <span>$</span>,
              }}
              helperText="Orders below this amount will be tax-exempt (set to 0 to disable)"
            />
          </Grid>
        </Grid>
        
        <Box mt={3}>
          <Typography variant="subtitle1" gutterBottom>Tax-Exempt Categories</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Add Exempt Category"
                value={newExemptCategory}
                onChange={(e) => setNewExemptCategory(e.target.value)}
                disabled={!settings.isEnabled}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExemptCategory()}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={handleAddExemptCategory}
                disabled={!newExemptCategory.trim() || !settings.isEnabled}
                fullWidth
              >
                Add
              </Button>
            </Grid>
          </Grid>
          
          {settings.taxExemptCategories.length > 0 && (
            <Box mt={2}>
              {settings.taxExemptCategories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  onDelete={() => handleRemoveExemptCategory(category)}
                  disabled={!settings.isEnabled}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={settings.isEnabled && settings.taxRegions.length === 0}
        >
          Save Tax Settings
        </Button>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <div className={`alert alert-${snackbar.severity}`}>
          {snackbar.message}
        </div>
      </Snackbar>
    </Box>
  );
};

export default TaxSettings;
