import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer, Box, Typography, TextField, Button, IconButton, Divider, CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined';
import QrCodeOutlinedIcon from '@mui/icons-material/QrCodeOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { COL } from '../services/mondayMutations';
import { updateEquipment } from '../store/equipmentslice';
import { fetchLocations } from '../store/locationsSlice';
import RelationCell from './RelationCell';
import LocationDrawer from './LocationDrawer';

const EQUIPMENT_STATUSES = ['Active', 'Inactive'];

const STATUS_COLORS = {
  Active:        { bg: '#d3f8e2', color: '#0d6e48' },
  Inactive:      { bg: '#fde8e8', color: '#b91c1c' },
  'Under Repair':{ bg: '#fef3c7', color: '#92400e' },
  Retired:       { bg: '#f1f1ef', color: '#787774' },
};

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

const InlineField = ({ value, onChange, placeholder, error, type }) => (
  <TextField
    fullWidth size="small" value={value} onChange={onChange}
    placeholder={placeholder} type={type || 'text'} variant="standard"
    sx={{
      '& .MuiInput-root': { fontSize: '0.875rem', color: '#37352f', '&:before, &:after': { display: 'none' } },
      '& .MuiInputBase-input': {
        p: 0, lineHeight: 1.55,
        '&::placeholder': { color: error ? '#f5b8b8' : '#c1bfbc', opacity: 1 },
      },
    }}
  />
);

const Section = ({ children }) => (
  <Typography sx={{
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#b0ada8', px: 1, mb: 0.25,
  }}>
    {children}
  </Typography>
);

export default function EquipmentDrawer({ equipment, onClose, onSaveNew, open }) {
  const dispatch = useDispatch();
  const { creating: apiCreating, saving: apiSaving } = useSelector((s) => s.equipment);
  const locations = useSelector((s) => s.locations.board?.items_page?.items || []);
  const [isSaving, setIsSaving] = useState(false);

  const isTempId = equipment?.id && !/^\d+$/.test(String(equipment.id));
  const isNew = !equipment?.id || equipment?.id === '__new__' || isTempId;
  const isBusy = apiCreating || apiSaving || isSaving;

  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  const getCol = (colId) => {
    const col = equipment?.column_values?.find((cv) => cv.id === colId);
    if (!col) return '';
    if (col.label && col.label.trim()) return col.label;
    if (col.text && col.text.trim()) return col.text;
    return '';
  };

  const [form, setForm] = useState({
    name:            equipment?.name || '',
    manufacturer:    getCol(COL.EQUIPMENT.MANUFACTURER),
    modelNumber:     getCol(COL.EQUIPMENT.MODEL_NUMBER),
    serialNumber:    getCol(COL.EQUIPMENT.SERIAL_NUMBER),
    installDate:     getCol(COL.EQUIPMENT.INSTALL_DATE),
    equipmentStatus: getCol(COL.EQUIPMENT.STATUS) || 'Active',
    notes:           getCol(COL.EQUIPMENT.NOTES),
    locationId:      '',
    locationName:    getCol(COL.EQUIPMENT.LOCATION),
  });

  // Initialize locationId from equipment column value
  useEffect(() => {
    if (equipment?.column_values) {
      const locCol = equipment.column_values.find(cv => cv.id === COL.EQUIPMENT.LOCATION);
      if (locCol?.value) {
        try {
          const parsed = JSON.parse(locCol.value);
          const firstId = parsed.linkedPulseIds?.[0]?.linkedPulseId;
          if (firstId) setForm(prev => ({ ...prev, locationId: String(firstId) }));
        } catch (e) { /* ignore */ }
      }
    }
    // Also fetch locations to ensure dropdown is populated
    dispatch(fetchLocations());
  }, [equipment, dispatch]);

  const [attempted, setAttempted] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const REQUIRED = [{ key: 'name', label: 'Equipment Name' }];
  const missing = REQUIRED.filter((f) => !form[f.key]?.trim());
  const isValid = missing.length === 0;
  const err = (k) => attempted && !form[k]?.trim();

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) return;
    if (isNew) {
      if (onSaveNew) {
        setIsSaving(true);
        try {
          await onSaveNew(form);
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      setIsSaving(true);
      try {
        await dispatch(updateEquipment({ equipmentId: equipment.id, form })).unwrap();
        onClose();
      } finally {
        setIsSaving(false);
      }
    }
  };

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
              {isNew ? 'New Equipment' : (form.name || 'Edit Equipment')}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: '#9b9a97', mt: 0.3 }}>
              {isNew ? 'Add a new equipment record' : 'Equipment details'}
            </Typography>
          </Box>
          <IconButton
            size="small" onClick={onClose}
            sx={{ borderRadius: '5px', color: '#9b9a97', '&:hover': { bgcolor: '#f1f1ef', color: '#37352f' } }}
          >
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>

        {/* Equipment Status pills */}
        <Box sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap' }}>
          {EQUIPMENT_STATUSES.map((s) => {
            const active = form.equipmentStatus === s;
            const colors = STATUS_COLORS[s];
            return (
              <Box
                key={s}
                onClick={() => set('equipmentStatus', s)}
                sx={{
                  px: 1.5, py: 0.35, borderRadius: '3px',
                  fontSize: '0.75rem', fontWeight: 500,
                  cursor: 'pointer', userSelect: 'none', transition: 'all 0.1s',
                  ...(active
                    ? { bgcolor: colors.bg, color: colors.color }
                    : { bgcolor: '#f1f1ef', color: '#9b9a97', '&:hover': { color: '#37352f' } }
                  ),
                }}
              >
                {s}
              </Box>
            );
          })}
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
        <Section>Equipment</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={ConstructionOutlinedIcon} label="Equipment Name" required error={err('name')}>
            <InlineField
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Ice Machine"
              error={err('name')}
            />
          </PropertyRow>
          <PropertyRow icon={CategoryOutlinedIcon} label="Manufacturer">
            <InlineField
              value={form.manufacturer}
              onChange={(e) => set('manufacturer', e.target.value)}
              placeholder="e.g. Hoshizaki"
            />
          </PropertyRow>
          <PropertyRow icon={LocationOnOutlinedIcon} label="Location">
            <RelationCell
              value={form.locationName}
              options={locations}
              placeholder="— add location"
              chipBgColor="rgba(168,85,247,0.1)"
              chipTextColor="#c084fc"
              chipBorderColor="rgba(168,85,247,0.2)"
              createLabel="location"
              onSelectExisting={(id, name) => {
                set('locationId', id);
                set('locationName', name);
              }}
              onCreateNew={(name) => setPendingNewLocation({ name })}
            />
          </PropertyRow>
        </Box>

        {/* Specs */}
        <Section>Specifications</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={NumbersOutlinedIcon} label="Model Number">
            <InlineField
              value={form.modelNumber}
              onChange={(e) => set('modelNumber', e.target.value)}
              placeholder="e.g. T-49-HC"
            />
          </PropertyRow>
          <PropertyRow icon={QrCodeOutlinedIcon} label="Serial Number">
            <InlineField
              value={form.serialNumber}
              onChange={(e) => set('serialNumber', e.target.value)}
              placeholder="e.g. SN-83749203"
            />
          </PropertyRow>
          <PropertyRow icon={CalendarTodayOutlinedIcon} label="Install Date">
            <InlineField
              value={form.installDate}
              onChange={(e) => set('installDate', e.target.value)}
              type="date"
            />
          </PropertyRow>
        </Box>

        {/* Notes */}
        <Section>Notes</Section>
        <Box sx={{ px: 1, py: '6px', mb: 2, borderRadius: '4px', '&:hover': { bgcolor: '#f7f6f3' } }}>
          <TextField
            fullWidth multiline rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Add a note…"
            variant="standard"
            sx={{
              '& .MuiInput-root': { fontSize: '0.875rem', color: '#37352f', '&:before, &:after': { display: 'none' } },
              '& .MuiInputBase-inputMultiline': { p: 0, lineHeight: 1.65 },
              '& .MuiInputBase-input::placeholder': { color: '#c1bfbc', opacity: 1 },
            }}
          />
        </Box>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        px: 3, py: 2, borderTop: '1px solid #e8e6e1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4bb87f' }} />
          <Typography sx={{ fontSize: '0.71rem', color: '#b0ada8' }}>Monday CRM · Synced</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={isBusy}
            sx={{
              px: 2, height: 32, borderRadius: '4px', fontSize: '0.82rem',
              fontWeight: 500, color: '#787774', textTransform: 'none',
              '&:hover': { bgcolor: '#f1f1ef' },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disableElevation
            disabled={isBusy}
            startIcon={isBusy ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{
              px: 2.5, height: 32, borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600,
              textTransform: 'none', bgcolor: '#2f6feb',
              '&:hover': { bgcolor: '#1a56d6' },
              '&:disabled': { bgcolor: '#e3e2df', color: '#b0ada8' },
            }}
          >
            {isNew ? 'Create' : 'Save changes'}
          </Button>
        </Box>
      </Box>

      {/* Nested Location Creation */}
      {pendingNewLocation && (
        <LocationDrawer
          open
          location={{ id: '__new__', name: pendingNewLocation.name, column_values: [] }}
          onClose={() => setPendingNewLocation(null)}
          onSaveNew={async (locForm) => {
            // Import apiCreateLocation lazily
            const { apiCreateLocation } = await import('../services/mondayMutations');
            const created = await apiCreateLocation(locForm);
            set('locationId', created.id);
            set('locationName', created.name);
            setPendingNewLocation(null);
            // Refresh locations list
            dispatch(fetchLocations());
          }}
        />
      )}
    </Drawer>
  );
}