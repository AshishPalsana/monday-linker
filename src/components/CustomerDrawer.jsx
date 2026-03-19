import { useState } from 'react'
import { useSelector } from 'react-redux'
import {
  Drawer, Box, Typography, TextField, Button, IconButton,
  Select, MenuItem, Stack, Divider
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import TagIcon from '@mui/icons-material/Tag'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'

import { MONDAY_COLUMN_IDS } from '../constants'

const BILLING_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'COD']

// ── Notion-style property row ────────────────────────────────────────────────
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
        {label}{required && <Box component="span" sx={{ color: '#eb5757', ml: 0.25 }}>*</Box>}
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

// ── Inline text input (no border, just placeholder + value) ──────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CustomerDrawer({ customer, onClose, onUpdate, open }) {
  const { board: locBoard } = useSelector(s => s.locations)
  const { board: woBoard }  = useSelector(s => s.workOrders)

  const getCol = (item, colId) => {
    const col = item?.column_values?.find(cv => cv.id === colId)
    return col?.label || col?.text || ''
  }

  const [form, setForm] = useState({
    name:          customer?.name || '',
    email:         getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.EMAIL),
    phone:         getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.PHONE),
    accountNumber: getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.ACCOUNT_NUMBER),
    status:        getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.STATUS) || 'Active',
    billingAddress:getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_ADDRESS),
    billingTerms:  getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_TERMS),
    xeroContactId: getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.XERO_CONTACT_ID),
    notes:         getCol(customer, MONDAY_COLUMN_IDS.CUSTOMERS.NOTES),
  })

  const [attempted, setAttempted] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const REQUIRED = [
    { key: 'name',           label: 'Name' },
    { key: 'email',          label: 'Email' },
    { key: 'phone',          label: 'Phone' },
    { key: 'billingAddress', label: 'Address' },
  ]
  const missing  = REQUIRED.filter(f => !form[f.key]?.trim())
  const isValid  = missing.length === 0
  const err      = k => attempted && !form[k]?.trim()

  const handleSave = () => {
    setAttempted(true)
    if (!isValid) return
    onUpdate(customer.id, form)
    onClose()
  }

  const isNew = customer?.id?.startsWith('c')

  const locations = (locBoard?.items_page?.items || []).filter(l =>
    l.column_values?.find(cv =>
      ['board_relation','customer','board_relation_mm18ma0k'].includes(cv.id)
    )?.text === customer?.name
  )
  const workOrders = (woBoard?.items_page?.items || []).filter(wo =>
    wo.column_values?.find(cv =>
      [MONDAY_COLUMN_IDS.CUSTOMERS.WORK_ORDER, 'board_relation_mm14ngb2'].includes(cv.id)
    )?.text === customer?.name
  )

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
              {isNew ? 'New Customer' : (form.name || 'Edit Customer')}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#9b9a97', mt: 0.3 }}>
              {isNew ? 'Create a new customer record' : 'Customer profile'}
            </Typography>
          </Box>
          <IconButton
            size="small" onClick={onClose}
            sx={{ borderRadius: '5px', color: '#9b9a97', '&:hover': { bgcolor: '#f1f1ef', color: '#37352f' } }}
          >
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>

        {/* Status toggle */}
        <Box sx={{ display: 'flex', gap: 0.75, mt: 2 }}>
          {['Active', 'Inactive'].map(s => (
            <Box
              key={s} onClick={() => set('status', s)}
              sx={{
                px: 1.5, py: 0.35, borderRadius: '3px',
                fontSize: '0.75rem', fontWeight: 500,
                cursor: 'pointer', userSelect: 'none',
                transition: 'all 0.1s',
                ...(form.status === s
                  ? s === 'Active'
                    ? { bgcolor: '#d3f8e2', color: '#0d6e48' }
                    : { bgcolor: '#fde8e8', color: '#b91c1c' }
                  : { bgcolor: '#f1f1ef', color: '#9b9a97', '&:hover': { color: '#37352f' } }
                ),
              }}
            >
              {s}
            </Box>
          ))}
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#e8e6e1' }} />

      {/* ── Scrollable body ── */}
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

        {/* ── Contact ── */}
        <Section>Contact</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={PersonOutlineIcon} label="Name" required error={err('name')}>
            <InlineField value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name or company" error={err('name')} />
          </PropertyRow>
          <PropertyRow icon={EmailOutlinedIcon} label="Email" required error={err('email')}>
            <InlineField value={form.email} onChange={e => set('email', e.target.value)} placeholder="billing@company.com" error={err('email')} />
          </PropertyRow>
          <PropertyRow icon={PhoneOutlinedIcon} label="Phone" required error={err('phone')}>
            <InlineField value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" error={err('phone')} />
          </PropertyRow>
          <PropertyRow icon={TagIcon} label="Account No.">
            <InlineField value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="ACT-999" />
          </PropertyRow>
        </Box>

        {/* ── Billing ── */}
        <Section>Billing</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={HomeOutlinedIcon} label="Address" required error={err('billingAddress')}>
            <InlineField value={form.billingAddress} onChange={e => set('billingAddress', e.target.value)} placeholder="Street, City, State, ZIP" error={err('billingAddress')} multiline rows={2} />
          </PropertyRow>
          <PropertyRow icon={TagIcon} label="Terms">
            <Select
              value={form.billingTerms}
              onChange={e => set('billingTerms', e.target.value)}
              displayEmpty variant="standard" disableUnderline
              sx={{
                fontSize: '0.875rem',
                color: form.billingTerms ? '#37352f' : '#c1bfbc',
                '& .MuiSelect-select': { p: 0, lineHeight: 1.55 },
                '& .MuiSvgIcon-root': { fontSize: 15, color: '#9b9a97' },
              }}
            >
              <MenuItem value=""><em style={{ color: '#c1bfbc', fontStyle: 'normal' }}>Select…</em></MenuItem>
              {BILLING_TERMS.map(t => (
                <MenuItem key={t} value={t} sx={{ fontSize: '0.875rem' }}>{t}</MenuItem>
              ))}
            </Select>
          </PropertyRow>
          <PropertyRow icon={SyncAltIcon} label="Xero ID">
            <InlineField value={form.xeroContactId} onChange={e => set('xeroContactId', e.target.value)} placeholder="XR-001" />
          </PropertyRow>
        </Box>

        {/* ── Notes ── */}
        <Section>Notes</Section>
        <Box sx={{ px: 1, py: '6px', mb: 3, borderRadius: '4px', '&:hover': { bgcolor: '#f7f6f3' } }}>
          <TextField
            fullWidth multiline rows={3}
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Add a note for the field team…"
            variant="standard"
            sx={{
              '& .MuiInput-root': { fontSize: '0.875rem', color: '#37352f', '&:before, &:after': { display: 'none' } },
              '& .MuiInputBase-inputMultiline': { p: 0, lineHeight: 1.65 },
              '& .MuiInputBase-input::placeholder': { color: '#c1bfbc', opacity: 1 },
            }}
          />
        </Box>

        {/* ── Linked Records ── */}
        {(locations.length > 0 || workOrders.length > 0) && (
          <>
            <Section>Linked Records</Section>
            <Stack spacing={1.5} sx={{ px: 1, mt: 0.5 }}>
              {locations.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <LocationOnOutlinedIcon sx={{ fontSize: 13, color: '#9b9a97' }} />
                    <Typography sx={{ fontSize: '0.75rem', color: '#9b9a97' }}>Locations ({locations.length})</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                    {locations.map(l => (
                      <Box key={l.id} sx={{ px: 1.25, py: 0.25, bgcolor: '#f1f1ef', borderRadius: '3px', fontSize: '0.775rem', color: '#37352f' }}>
                        {l.name}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {workOrders.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                    <AssignmentOutlinedIcon sx={{ fontSize: 13, color: '#9b9a97' }} />
                    <Typography sx={{ fontSize: '0.75rem', color: '#9b9a97' }}>Work Orders ({workOrders.length})</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                    {workOrders.map(wo => (
                      <Box key={wo.id} sx={{ px: 1.25, py: 0.25, bgcolor: '#ebf0fd', borderRadius: '3px', fontSize: '0.775rem', color: '#3358d4' }}>
                        {wo.name}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Stack>
          </>
        )}
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