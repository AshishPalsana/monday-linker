import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Alert, Stack, Chip
} from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LockIcon from '@mui/icons-material/Lock'
import { REQUIRED_CUSTOMER_FIELDS, REQUIRED_LOCATION_FIELDS } from '../constants'

export default function RequiredInfoModal({ modal, data, onSave }) {
  const { type, id, name } = modal
  const requiredFields = type === 'customer' ? REQUIRED_CUSTOMER_FIELDS : REQUIRED_LOCATION_FIELDS

  const [fields, setFields] = useState(() => {
    const obj = {}
    requiredFields.forEach(f => { obj[f.key] = '' })
    return obj
  })
  const [attempted, setAttempted] = useState(false)

  const missing = requiredFields.filter(f => !fields[f.key]?.trim())
  const isValid = missing.length === 0

  const handleSave = () => {
    setAttempted(true)
    if (!isValid) return
    onSave(type, id, fields)
  }

  const label = type === 'customer' ? 'Customer' : 'Location'
  const icon = type === 'customer' ? '👤' : '📍'

  return (
    <Dialog
      open={true}
      disableEscapeKeyDown
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(239,68,68,0.05) 100%)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 3, py: 2.5,
        display: 'flex', alignItems: 'flex-start', gap: 2,
      }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px',
          bgcolor: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 22 }} />
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Required Information Needed
            </Typography>
            <Chip
              icon={<LockIcon sx={{ fontSize: '12px !important' }} />}
              label="Cannot skip"
              size="small"
              sx={{
                bgcolor: 'rgba(239,68,68,0.12)',
                color: 'error.main',
                border: '1px solid rgba(239,68,68,0.25)',
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                '& .MuiChip-icon': { color: 'error.main' },
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {icon} <strong style={{ color: '#e8edf5' }}>{name}</strong> was added as a new {label.toLowerCase()}.
            Please fill in the required fields below before continuing. This information is needed for billing and communication.
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1 }}>
        {attempted && !isValid && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8rem' }}>
            Please fill in all required fields: {missing.map(f => f.label).join(', ')}
          </Alert>
        )}

        <Stack spacing={2.5}>
          {requiredFields.map(({ key, label: fieldLabel }) => (
            <TextField
              key={key}
              label={fieldLabel}
              value={fields[key]}
              onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
              required
              fullWidth
              error={attempted && !fields[key]?.trim()}
              helperText={attempted && !fields[key]?.trim() ? `${fieldLabel} is required` : ''}
              multiline={key === 'billingAddress'}
              rows={key === 'billingAddress' ? 2 : 1}
              placeholder={
                key === 'email' ? 'billing@company.com' :
                key === 'phone' ? '(555) 000-0000' :
                key === 'billingAddress' ? '123 Main St, City, State ZIP' :
                key === 'streetAddress' ? '123 Main Street' :
                key === 'city' ? 'City name' :
                key === 'state' ? 'State' :
                key === 'zip' ? '00000' : ''
              }
            />
          ))}
        </Stack>

        <Box sx={{
          mt: 3, p: 2, borderRadius: 2,
          bgcolor: 'rgba(79,142,247,0.06)',
          border: '1px solid rgba(79,142,247,0.15)',
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            💡 <strong>Why is this required?</strong> Without this information, billing cannot be completed and
            there will be no contact reference when this work order is invoiced. Incomplete records cause delays
            in payment collection.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        <Typography variant="caption" color="text.disabled" sx={{ mr: 'auto' }}>
          {missing.length > 0 ? `${missing.length} field${missing.length > 1 ? 's' : ''} remaining` : '✓ All fields complete'}
        </Typography>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={attempted && !isValid}
          sx={{
            px: 3,
            bgcolor: isValid ? 'success.main' : 'primary.main',
            '&:hover': { bgcolor: isValid ? 'success.dark' : 'primary.dark' },
            '&:disabled': { bgcolor: 'rgba(239,68,68,0.3)', color: 'rgba(255,255,255,0.5)' },
          }}
        >
          {isValid ? 'Save & Continue' : 'Fill Required Fields'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}