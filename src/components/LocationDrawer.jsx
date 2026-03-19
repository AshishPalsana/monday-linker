import { useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Drawer, Box, Typography, TextField, Button, IconButton,
  Select, MenuItem, Stack, Divider
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined'
import MapOutlinedIcon from '@mui/icons-material/MapOutlined'
import MarkunreadMailboxOutlinedIcon from '@mui/icons-material/MarkunreadMailboxOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'

import { MONDAY_COLUMN_IDS } from '../constants'

const LOCATION_STATUSES = ['Active', 'Inactive', 'Pending', 'Closed']

const PropertyRow = ({ icon: Icon, label, required, error, children }) => (
  <Box sx={{
    display: 'grid',
    gridTemplateColumns: '148px 1fr',
    alignItems: 'start',
    borderRadius: '4px',
    px: 1,
    py: '6px',
    '&:hover': { bgcolor: '#f7f6f3' },
    transition: 'background 0.12s',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pt: '3px' }}>
      <Icon sx={{ fontSize: 14, color: '#9b9a97', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.8rem', color: '#9b9a97', fontWeight: 500, userSelect: 'none' }}>
        {label}
        {required && <Box component="span" sx={{ color: '#eb5757', ml: 0.25 }}>*</Box>}
      </Typography>
    </Box>
    <Box>
      {children}
      {error && (
        <Typography sx={{ fontSize: '0.68rem', color: '#eb5757', mt: 0.25 }}>Required</Typography>
      )}
    </Box>
  </Box>
)

// ── Inline text input ─────────────────────────────────────────────────────────
const InlineField = ({ value, onChange, placeholder, error, multiline, rows }) => (
  <TextField
    fullWidth size="small"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    multiline={multiline}
    rows={rows}
    variant="standard"
    sx={{
      '& .MuiInput-root': {
        fontSize: '0.875rem', color: '#37352f',
        '&:before, &:after': { display: 'none' },
      },
      '& .MuiInputBase-input': {
        p: 0, lineHeight: 1.55,
        '&::placeholder': { color: error ? '#f5b8b8' : '#c1bfbc', opacity: 1 },
      },
      '& .MuiInputBase-inputMultiline': { p: 0 },
    }}
  />
)

// ── Section label ─────────────────────────────────────────────────────────────
const Section = ({ children }) => (
  <Typography sx={{
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#b0ada8',
    px: 1, mb: 0.25,
  }}>
    {children}
  </Typography>
)

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LocationDrawer({ location, onClose, onUpdate, open }) {
  const { board: custBoard } = useSelector(s => s.customers)

  const getCol = (item, colId) => {
    const col = item?.column_values?.find(cv => cv.id === colId)
    return col?.label || col?.text || ''
  }

  const [form, setForm] = useState({
    name:           location?.name || '',
    streetAddress:  getCol(location, MONDAY_COLUMN_IDS.LOCATIONS.STREET_ADDRESS),
    city:           getCol(location, MONDAY_COLUMN_IDS.LOCATIONS.CITY),
    state:          getCol(location, MONDAY_COLUMN_IDS.LOCATIONS.STATE),
    zip:            getCol(location, MONDAY_COLUMN_IDS.LOCATIONS.ZIP),
    locationStatus: getCol(location, MONDAY_COLUMN_IDS.LOCATIONS.LOCATION_STATUS) || 'Active',
    notes:          getCol(location, MONDAY_COLUMN_IDS.LOCATIONS.NOTES),
  })

  const [attempted, setAttempted] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const REQUIRED = [{ key: 'name', label: 'Location Name' }]
  const missing  = REQUIRED.filter(f => !form[f.key]?.trim())
  const isValid  = missing.length === 0
  const err      = k => attempted && !form[k]?.trim()

  const handleSave = () => {
    setAttempted(true)
    if (!isValid) return
    onUpdate(location?.id, form)
    onClose()
  }

  const isNew = !location?.id || location?.id?.startsWith('l')

  // Linked customer options
  const customers = custBoard?.items_page?.items || []

  const STATUS_COLORS = {
    Active:   { bg: '#d3f8e2', color: '#0d6e48' },
    Inactive: { bg: '#fde8e8', color: '#b91c1c' },
    Pending:  { bg: '#fef3c7', color: '#92400e' },
    Closed:   { bg: '#f1f1ef', color: '#787774' },
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 440,
          bgcolor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #e8e6e1',
          boxShadow: '-2px 0 20px rgba(0,0,0,0.07)',
        }
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 3, pt: 3.5, pb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#37352f', lineHeight: 1.3 }}>
              {isNew ? 'New Location' : (form.name || 'Edit Location')}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#9b9a97', mt: 0.3 }}>
              {isNew ? 'Add a new service location' : 'Location details'}
            </Typography>
          </Box>
          <IconButton
            size="small" onClick={onClose}
            sx={{ borderRadius: '5px', color: '#9b9a97', '&:hover': { bgcolor: '#f1f1ef', color: '#37352f' } }}
          >
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>

        {/* Status pills */}
        <Box sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap' }}>
          {LOCATION_STATUSES.map(s => {
            const active = form.locationStatus === s
            const colors = STATUS_COLORS[s]
            return (
              <Box
                key={s} onClick={() => set('locationStatus', s)}
                sx={{
                  px: 1.5, py: 0.35, borderRadius: '3px',
                  fontSize: '0.75rem', fontWeight: 500,
                  cursor: 'pointer', userSelect: 'none',
                  transition: 'all 0.1s',
                  ...(active
                    ? { bgcolor: colors.bg, color: colors.color }
                    : { bgcolor: '#f1f1ef', color: '#9b9a97', '&:hover': { color: '#37352f' } }
                  ),
                }}
              >
                {s}
              </Box>
            )
          })}
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#e8e6e1' }} />

      {/* ── Body ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2.5 }}>

        {/* Error notice */}
        {attempted && !isValid && (
          <Box sx={{
            mb: 2.5, px: 1.5, py: 1,
            bgcolor: '#fff3f3', borderRadius: '4px',
            border: '1px solid #fecaca',
          }}>
            <Typography sx={{ fontSize: '0.775rem', color: '#eb5757' }}>
              Missing: <strong>{missing.map(f => f.label).join(', ')}</strong>
            </Typography>
          </Box>
        )}

        {/* ── Identity ── */}
        <Section>Location</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={LocationOnOutlinedIcon} label="Location Name" required error={err('name')}>
            <InlineField
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Walmart Store #210"
              error={err('name')}
            />
          </PropertyRow>
          {/* <PropertyRow icon={PersonOutlineIcon} label="Customer">
            {customers.length > 0 ? (
              <Select
                value={form.customer}
                onChange={e => set('customer', e.target.value)}
                displayEmpty variant="standard" disableUnderline
                sx={{
                  fontSize: '0.875rem',
                  color: form.customer ? '#37352f' : '#c1bfbc',
                  '& .MuiSelect-select': { p: 0, lineHeight: 1.55 },
                  '& .MuiSvgIcon-root': { fontSize: 15, color: '#9b9a97' },
                }}
              >
                <MenuItem value=""><em style={{ color: '#c1bfbc', fontStyle: 'normal' }}>Select customer…</em></MenuItem>
                {customers.map(c => (
                  <MenuItem key={c.id} value={c.name} sx={{ fontSize: '0.875rem' }}>{c.name}</MenuItem>
                ))}
              </Select>
            ) : (
              <InlineField
                value={form.customer}
                onChange={e => set('customer', e.target.value)}
                placeholder="Customer name"
              />
            )}
          </PropertyRow> */}
        </Box>

        {/* ── Address ── */}
        <Section>Address</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={HomeOutlinedIcon} label="Street Address">
            <InlineField
              value={form.streetAddress}
              onChange={e => set('streetAddress', e.target.value)}
              placeholder="123 Main St"
            />
          </PropertyRow>
          <PropertyRow icon={LocationCityOutlinedIcon} label="City">
            <InlineField
              value={form.city}
              onChange={e => set('city', e.target.value)}
              placeholder="City"
            />
          </PropertyRow>
          <PropertyRow icon={MapOutlinedIcon} label="State">
            <InlineField
              value={form.state}
              onChange={e => set('state', e.target.value)}
              placeholder="State"
            />
          </PropertyRow>
          <PropertyRow icon={MarkunreadMailboxOutlinedIcon} label="ZIP">
            <InlineField
              value={form.zip}
              onChange={e => set('zip', e.target.value)}
              placeholder="00000"
            />
          </PropertyRow>
        </Box>

        {/* ── Notes ── */}
        <Section>Notes</Section>
        <Box sx={{ px: 1, py: '6px', mb: 2, borderRadius: '4px', '&:hover': { bgcolor: '#f7f6f3' } }}>
          <TextField
            fullWidth multiline rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Add a note…"
            variant="standard"
            sx={{
              '& .MuiInput-root': {
                fontSize: '0.875rem', color: '#37352f',
                '&:before, &:after': { display: 'none' },
              },
              '& .MuiInputBase-inputMultiline': { p: 0, lineHeight: 1.65 },
              '& .MuiInputBase-input::placeholder': { color: '#c1bfbc', opacity: 1 },
            }}
          />
        </Box>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        px: 3, py: 2,
        borderTop: '1px solid #e8e6e1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4bb87f' }} />
          <Typography sx={{ fontSize: '0.71rem', color: '#b0ada8' }}>Monday CRM · Synced</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={onClose}
            sx={{
              px: 2, height: 32, borderRadius: '4px',
              fontSize: '0.82rem', fontWeight: 500,
              color: '#787774', textTransform: 'none',
              '&:hover': { bgcolor: '#f1f1ef' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disableElevation
            sx={{
              px: 2.5, height: 32, borderRadius: '4px',
              fontSize: '0.82rem', fontWeight: 600,
              textTransform: 'none',
              bgcolor: '#2f6feb',
              '&:hover': { bgcolor: '#1a56d6' },
              '&:disabled': { bgcolor: '#e3e2df', color: '#b0ada8' },
            }}
          >
            {isNew ? 'Create' : 'Save changes'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}