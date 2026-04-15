import { useState } from 'react'
import { validateEmail, cleanPhoneNumber } from '../utils/validationUtils'
import { useSelector } from 'react-redux'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Grid, Box, Typography, Select, MenuItem, FormControl, InputLabel,
  IconButton, Divider, Chip, Avatar
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'

const BILLING_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'COD']

export default function CustomerDialog({ customer, onClose, onUpdate, data }) {
  const { board: locBoard } = useSelector(state => state.locations)
  const { board: woBoard } = useSelector(state => state.workOrders)

  const getColumnValue = (item, colId) => {
    const col = item.column_values?.find(cv => cv.id === colId)
    if (!col) return ''
    return col.label || col.text || ''
  }

  const [form, setForm] = useState({
    id: customer.id,
    name: customer.name,
    email: getColumnValue(customer, 'email'),
    phone: getColumnValue(customer, 'phone'),
    accountNumber: getColumnValue(customer, 'account_number'),
    status: getColumnValue(customer, 'status') || 'Active',
    billingAddress: getColumnValue(customer, 'billing_address'),
    billingTerms: getColumnValue(customer, 'billing_terms'),
    xeroContactId: getColumnValue(customer, 'xero_contact_id'),
    notes: getColumnValue(customer, 'notes')
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    onUpdate(customer.id, form)
    onClose()
  }

  const locations = (locBoard?.items_page?.items || []).filter(l => {
    const custVal = l.column_values?.find(cv => cv.id === 'board_relation' || cv.id === 'customer')?.text
    return custVal === customer.name
  })

  const workOrders = (woBoard?.items_page?.items || []).filter(wo => {
    const custVal = wo.column_values?.find(cv => cv.id === 'board_relation_mm14ngb2')?.text
    return custVal === customer.name
  })


  // Required fields for validation
  const requiredFields = [
    { key: 'billingAddress', label: 'Billing Address' },
    { key: 'name', label: 'Contact Name' },
    { key: 'phone', label: 'Contact Phone Number' },
    { key: 'email', label: 'Contact Email' },
  ];
  
  const isEmailValid = !form.email || validateEmail(form.email);
  const isValid = requiredFields.every(f => (form[f.key] || '').trim() !== '') && isEmailValid;
  const showEmailError = form.email && !validateEmail(form.email);

  return (
    <Dialog open maxWidth="md" fullWidth
      onClose={null}
      disableEscapeKeyDown
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700, bgcolor: 'rgba(79,142,247,0.2)', color: 'primary.light' }}>
            {form.name?.slice(0, 2).toUpperCase()}
          </Avatar>
          <TextField
            value={form.name}
            onChange={e => set('name', e.target.value)}
            variant="standard"
            sx={{ flex: 1, '& .MuiInput-root': { fontSize: '1.1rem', fontWeight: 700 } }}
            required
            error={!form.name}
            label="Contact Name*"
          />
          <Chip
            label={form.status}
            size="small"
            sx={{
              bgcolor: form.status === 'Active' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
              color: form.status === 'Active' ? '#22c55e' : '#6b7280',
              border: `1px solid ${form.status === 'Active' ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'}`,
              fontWeight: 700, fontSize: '0.7rem',
            }}
          />
        </Box>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Contact Information</Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={6}>
            <TextField 
              size="small" fullWidth 
              label="Contact Email*" 
              value={form.email || ''} 
              onChange={e => set('email', e.target.value)} 
              placeholder="billing@company.com" 
              required 
              error={!form.email || showEmailError} 
              helperText={showEmailError ? "Enter a proper email address" : ""}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField 
              size="small" fullWidth 
              label="Contact Phone Number*" 
              value={form.phone || ''} 
              onChange={e => set('phone', cleanPhoneNumber(e.target.value))} 
              placeholder="Numbers only" 
              required 
              error={!form.phone} 
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Customer Status</InputLabel>
              <Select value={form.status || 'Active'} onChange={e => set('status', e.target.value)} label="Customer Status">
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>Billing Information</Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <TextField size="small" fullWidth multiline rows={2} label="Billing Address*" value={form.billingAddress || ''} onChange={e => set('billingAddress', e.target.value)} placeholder="123 Main St, City, State ZIP" required error={!form.billingAddress} />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Billing Terms</InputLabel>
              <Select value={form.billingTerms || ''} onChange={e => set('billingTerms', e.target.value)} label="Billing Terms">
                <MenuItem value=""><em>None</em></MenuItem>
                {BILLING_TERMS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField size="small" fullWidth label="Xero Contact ID" value={form.xeroContactId || ''} onChange={e => set('xeroContactId', e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <TextField size="small" fullWidth multiline rows={2} label="Notes" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
          </Grid>
        </Grid>

        {(workOrders.length > 0 || locations.length > 0) && (
          <>
            <Divider sx={{ my: 3 }} />
            <Grid container spacing={2}>
              {locations.length > 0 && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>Locations ({locations.length})</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {locations.map(l => <Chip key={l.id} label={l.name} size="small" sx={{ fontSize: '0.72rem', bgcolor: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.2)' }} />)}
                  </Box>
                </Grid>
              )}
              {workOrders.length > 0 && (
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>Work Orders ({workOrders.length})</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {workOrders.map(wo => <Chip key={wo.id} label={wo.name} size="small" sx={{ fontSize: '0.72rem', bgcolor: 'rgba(79,142,247,0.1)', color: 'primary.light', border: '1px solid rgba(79,142,247,0.2)' }} />)}
                  </Box>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {/* No Cancel/Close button to force completion */}
        <Button variant="contained" startIcon={<SaveIcon />} onClick={isValid ? handleSave : undefined} disabled={!isValid}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}