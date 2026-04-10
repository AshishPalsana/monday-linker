import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer, Box, Typography, TextField, Button, IconButton, Divider, CircularProgress, Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import MarkunreadMailboxOutlinedIcon from '@mui/icons-material/MarkunreadMailboxOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import { COL } from '../services/mondayMutations';
import { updateLocation } from '../store/locationsSlice';
import { LinkedGroup, RecordPill } from './LinkedRecordItem';

// ─── Column IDs ──────────────────────────────────────────────────────────────
const WO_LOCATION_COL  = 'board_relation_mm14fdpt'; // Work Orders → Locations
const WO_CUSTOMER_COL  = 'board_relation_mm14ngb2'; // Work Orders → Customers
const WO_EQUIPMENT_COL = 'board_relation_mm19cxzv'; // Work Orders → Equipment
const WO_STATUS_COL    = 'color_mm1s7ak1';           // Work Orders → Execution Status
const EQ_LOCATION_COL  = 'board_relation_mm19trhn';  // Equipment  → Location

function parseLinkedIds(colValue) {
  if (!colValue) return [];
  try {
    const parsed = JSON.parse(colValue);
    const ids = parsed.item_ids || parsed.linkedPulseIds || parsed.linked_item_ids || [];
    return ids.map((p) => {
      const id = typeof p === 'object' ? p.linkedPulseId || p.id : p;
      return String(id);
    });
  } catch {
    return [];
  }
}

function linkedIds(item, colId) {
  const col = item?.column_values?.find((cv) => cv.id === colId);
  return parseLinkedIds(col?.value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PropertyRow = ({ icon: Icon, label, required, error, children }) => (
  <Box sx={{
    display: 'grid', gridTemplateColumns: '152px 1fr',
    alignItems: 'start', borderRadius: '4px', px: 1, py: '6px',
    '&:hover': { bgcolor: '#f7f6f3' }, transition: 'background 0.12s',
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
      {error && <Typography sx={{ fontSize: '0.68rem', color: '#eb5757', mt: 0.25 }}>Required</Typography>}
    </Box>
  </Box>
);

const InlineField = ({ value, onChange, placeholder, error, multiline, rows }) => (
  <TextField
    fullWidth size="small" value={value} onChange={onChange}
    placeholder={placeholder} multiline={multiline} rows={rows} variant="standard"
    sx={{
      '& .MuiInput-root': { fontSize: '0.875rem', color: '#37352f', '&:before, &:after': { display: 'none' } },
      '& .MuiInputBase-input': { p: 0, lineHeight: 1.55, '&::placeholder': { color: error ? '#f5b8b8' : '#c1bfbc', opacity: 1 } },
      '& .MuiInputBase-inputMultiline': { p: 0 },
    }}
  />
);

const Section = ({ children }) => (
  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#b0ada8', px: 1, mb: 0.25 }}>
    {children}
  </Typography>
);



// ─── Main component ───────────────────────────────────────────────────────────

export default function LocationDrawer({ location, onClose, onSaveNew, open }) {
  const dispatch = useDispatch();
  const { creating: apiCreating, saving: apiSaving } = useSelector((s) => s.locations);
  const allWorkOrders = useSelector((s) => s.workOrders.board?.items_page?.items || []);
  const allCustomers  = useSelector((s) => s.customers.board?.items_page?.items  || []);
  const allEquipment  = useSelector((s) => s.equipment.board?.items_page?.items  || []);

  const [isSaving, setIsSaving] = useState(false);

  const isTempId = location?.id && !/^\d+$/.test(String(location.id));
  const isNew = !location?.id || location?.id === '__new__' || isTempId;
  const isBusy = apiCreating || apiSaving || isSaving;

  const getCol = (colId) => {
    const col = location?.column_values?.find((cv) => cv.id === colId);
    if (!col) return '';
    if (col.label && col.label.trim()) return col.label;
    if (col.text && col.text.trim()) return col.text;
    return '';
  };

  const [form, setForm] = useState({
    name:           location?.name || '',
    streetAddress:  getCol(COL.LOCATIONS.STREET_ADDRESS),
    city:           getCol(COL.LOCATIONS.CITY),
    state:          getCol(COL.LOCATIONS.STATE),
    zip:            getCol(COL.LOCATIONS.ZIP),
    locationStatus: getCol(COL.LOCATIONS.STATUS) || 'Active',
    notes:          getCol(COL.LOCATIONS.NOTES),
  });

  const [attempted, setAttempted] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const REQUIRED = [{ key: 'name', label: 'Location Name' }];
  const missing = REQUIRED.filter((f) => !form[f.key]?.trim());
  const isValid = missing.length === 0;
  const err = (k) => attempted && !form[k]?.trim();

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) return;
    if (isNew) {
      if (onSaveNew) {
        setIsSaving(true);
        try { await onSaveNew(form); } finally { setIsSaving(false); }
      }
    } else {
      setIsSaving(true);
      try {
        await dispatch(updateLocation({ locationId: location.id, form })).unwrap();
        onClose();
      } finally { setIsSaving(false); }
    }
  };

  // ── Derive linked records ─────────────────────────────────────────────────
  const locId   = String(location?.id || '');
  const locName = location?.name || '';

  // Work orders linked to this location
  const linkedWorkOrders = useMemo(() => {
    if (!locId || isNew) return [];
    return allWorkOrders.filter((wo) => {
      if (linkedIds(wo, WO_LOCATION_COL).includes(locId)) return true;
      const col = wo.column_values?.find((cv) => cv.id === WO_LOCATION_COL);
      const txt = col?.display_value || col?.text || '';
      return locName && txt.toLowerCase().includes(locName.toLowerCase());
    });
  }, [locId, locName, allWorkOrders, isNew]);

  // Customers who have work orders at this location
  const linkedCustomers = useMemo(() => {
    if (!locId || isNew) return [];
    const custIdSet = new Set();
    linkedWorkOrders.forEach((wo) => {
      linkedIds(wo, WO_CUSTOMER_COL).forEach((id) => custIdSet.add(id));
      const col = wo.column_values?.find((cv) => cv.id === WO_CUSTOMER_COL);
      const txt = col?.display_value || col?.text || '';
      if (txt) {
        allCustomers
          .filter((c) => txt.toLowerCase().includes(c.name.toLowerCase()))
          .forEach((c) => custIdSet.add(String(c.id)));
      }
    });
    return allCustomers.filter((c) => custIdSet.has(String(c.id)));
  }, [locId, linkedWorkOrders, allCustomers, isNew]);

  // Equipment at this location (via Equipment → Location relation)
  const linkedEquipment = useMemo(() => {
    if (!locId || isNew) return [];
    return allEquipment.filter((eq) => {
      if (linkedIds(eq, EQ_LOCATION_COL).includes(locId)) return true;
      const col = eq.column_values?.find((cv) => cv.id === EQ_LOCATION_COL);
      const txt = col?.display_value || col?.text || '';
      return locName && txt.toLowerCase().includes(locName.toLowerCase());
    });
  }, [locId, locName, allEquipment, isNew]);

  const getWoStatus = (wo) => {
    const col = wo.column_values?.find((cv) => cv.id === WO_STATUS_COL);
    return col?.label || col?.text || null;
  };

  const hasLinked = linkedWorkOrders.length > 0 || linkedCustomers.length > 0 || linkedEquipment.length > 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 460, bgcolor: '#fff', display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid #e8e6e1', boxShadow: '-2px 0 20px rgba(0,0,0,0.07)',
        },
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
          <IconButton size="small" onClick={onClose} sx={{ borderRadius: '5px', color: '#9b9a97', '&:hover': { bgcolor: '#f1f1ef', color: '#37352f' } }}>
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#e8e6e1' }} />

      {/* ── Body ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2.5 }}>
        {attempted && !isValid && (
          <Box sx={{ mb: 2.5, px: 1.5, py: 1, bgcolor: '#fff3f3', borderRadius: '4px', border: '1px solid #fecaca' }}>
            <Typography sx={{ fontSize: '0.775rem', color: '#eb5757' }}>
              Missing: <strong>{missing.map((f) => f.label).join(', ')}</strong>
            </Typography>
          </Box>
        )}

        {/* Identity */}
        <Section>Location</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={LocationOnOutlinedIcon} label="Location Name" required error={err('name')}>
            <InlineField value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Walmart Store #210" error={err('name')} />
          </PropertyRow>
        </Box>

        {/* Address */}
        <Section>Address</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={HomeOutlinedIcon} label="Street Address">
            <InlineField value={form.streetAddress} onChange={(e) => set('streetAddress', e.target.value)} placeholder="123 Main St" />
          </PropertyRow>
          <PropertyRow icon={LocationCityOutlinedIcon} label="City">
            <InlineField value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" />
          </PropertyRow>
          <PropertyRow icon={MapOutlinedIcon} label="State">
            <InlineField value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="e.g. CA" />
          </PropertyRow>
          <PropertyRow icon={MarkunreadMailboxOutlinedIcon} label="ZIP">
            <InlineField value={form.zip} onChange={(e) => set('zip', e.target.value)} placeholder="00000" />
          </PropertyRow>
        </Box>

        {/* Notes */}
        <Section>Notes</Section>
        <Box sx={{ px: 1, py: '6px', mb: 2, borderRadius: '4px', '&:hover': { bgcolor: '#f7f6f3' } }}>
          <TextField
            fullWidth multiline rows={3} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Add a note…" variant="standard"
            sx={{
              '& .MuiInput-root': { fontSize: '0.875rem', color: '#37352f', '&:before, &:after': { display: 'none' } },
              '& .MuiInputBase-inputMultiline': { p: 0, lineHeight: 1.65 },
              '& .MuiInputBase-input::placeholder': { color: '#c1bfbc', opacity: 1 },
            }}
          />
        </Box>

        {/* ── Linked Records ── */}
        {!isNew && hasLinked && (
          <>
            <Divider sx={{ borderColor: '#e8e6e1', mb: 2 }} />
            <Section>Linked Records</Section>
            <Stack spacing={2} sx={{ px: 1, mt: 1 }}>

              <LinkedGroup
                icon={AssignmentOutlinedIcon}
                label="Work Orders"
                iconColor="#4f8ef7"
                items={linkedWorkOrders}
                renderItem={(wo) => (
                  <RecordPill
                    key={wo.id}
                    id={wo.id}
                    type="workorder"
                    name={wo.name}
                    statusLabel={getWoStatus(wo)}
                    bgColor="#ebf0fd"
                    textColor="#1e40af"
                    borderColor="#c7d7fb"
                  />
                )}
              />

              <LinkedGroup
                icon={PersonOutlineIcon}
                label="Customers"
                iconColor="#22c55e"
                items={linkedCustomers}
                renderItem={(c) => (
                  <RecordPill
                    key={c.id}
                    id={c.id}
                    type="customer"
                    name={c.name}
                    bgColor="#f0fdf4"
                    textColor="#166534"
                    borderColor="#bbf7d0"
                  />
                )}
              />

              <LinkedGroup
                icon={ConstructionOutlinedIcon}
                label="Equipment"
                iconColor="#f97316"
                items={linkedEquipment}
                renderItem={(eq) => (
                  <RecordPill
                    key={eq.id}
                    id={eq.id}
                    type="equipment"
                    name={eq.name}
                    bgColor="#fff7ed"
                    textColor="#c2410c"
                    borderColor="#fed7aa"
                  />
                )}
              />

            </Stack>
          </>
        )}

        {!isNew && !hasLinked && (
          <Box sx={{ mt: 1, px: 1 }}>
            <Divider sx={{ borderColor: '#e8e6e1', mb: 2 }} />
            <Typography sx={{ fontSize: '0.75rem', color: '#c1bfbc', fontStyle: 'italic' }}>
              No linked work orders, customers, or equipment yet.
            </Typography>
          </Box>
        )}

      </Box>

      {/* ── Footer ── */}
      <Box sx={{ px: 3, py: 2, borderTop: '1px solid #e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4bb87f' }} />
          <Typography sx={{ fontSize: '0.71rem', color: '#b0ada8' }}>Monday CRM · Synced</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={isBusy} sx={{ px: 2, height: 32, borderRadius: '4px', fontSize: '0.82rem', fontWeight: 500, color: '#787774', textTransform: 'none', '&:hover': { bgcolor: '#f1f1ef' } }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave} variant="contained" disableElevation disabled={isBusy}
            startIcon={isBusy ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ px: 2.5, height: 32, borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', bgcolor: '#2f6feb', '&:hover': { bgcolor: '#1a56d6' }, '&:disabled': { bgcolor: '#e3e2df', color: '#b0ada8' } }}
          >
            {isNew ? 'Create' : 'Save changes'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}