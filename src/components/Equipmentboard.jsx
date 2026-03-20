import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Autocomplete, TextField,
  IconButton, Avatar, Tooltip, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import {
  fetchEquipment,
  createEquipment as createEquipmentThunk,
  linkExistingLocation,
  createLocationAndLink,
} from '../store/equipmentslice';
import { fetchLocations } from '../store/locationsSlice';
import { COL } from '../services/mondayMutations';
import StatusChip from './StatusChip';
import AddItemRow from './AddItemRow';
import EquipmentDrawer from './EquipmentDrawer';
import LocationDrawer from './LocationDrawer';

// ── Table cell styles ─────────────────────────────────────────────────────────
const HEAD_CELL = {
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
  color: 'text.secondary', bgcolor: 'background.paper',
  borderBottom: '1px solid', borderColor: 'divider', py: 1, px: 1.5,
};
const DATA_CELL = {
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  fontSize: '0.75rem', color: 'text.secondary', py: '7px', px: 1.5, maxWidth: 0,
};
const DASH = <span style={{ color: '#9ba6b4' }}>—</span>;

function TruncCell({ value, sx }) {
  if (!value) return <TableCell sx={{ ...DATA_CELL, ...sx }}>{DASH}</TableCell>;
  return (
    <Tooltip title={value} placement="top" enterDelay={600} arrow>
      <TableCell sx={{ ...DATA_CELL, ...sx }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
      </TableCell>
    </Tooltip>
  );
}

export default function EquipmentBoard() {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((s) => s.equipment);
  const locations = useSelector((s) => s.locations.board?.items_page?.items || []);
  const [search, setSearch] = useState('');
  const [openDrawer, setOpenDrawer] = useState(null);       // existing equipment item
  const [pendingNewLocation, setPendingNewLocation] = useState(null); // { name, equipmentId }

  useEffect(() => {
    dispatch(fetchEquipment());
    dispatch(fetchLocations());
  }, [dispatch]);

  const handleNew = () => {
    setOpenDrawer({ id: '__new__', name: '', column_values: [] });
  };


  // ── Column value reader ───────────────────────────────────────────────────
  const getCol = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return '';
    // For relation columns: prefer display_value/text (set by optimistic update)
    // then fall back to resolving from locationMap
    if (colId === COL.EQUIPMENT.LOCATION) {
      if (col.display_value && col.display_value.trim()) return col.display_value;
      if (col.text && col.text.trim()) return col.text;
      return '';
    }
    if (col.label && col.label.trim()) return col.label;
    if (col.text && col.text.trim()) return col.text;
    return '';
  };

  const getRawColumn = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return { value: null, text: null, display_value: null };
    return { value: col.value, text: col.text, display_value: col.display_value || null };
  };

  const handleLinkLocation = (item, locationId, locationName) => {
    const previousSnapshot = getRawColumn(item, COL.EQUIPMENT.LOCATION);
    dispatch(linkExistingLocation({ equipmentId: item.id, locationId, locationName, previousSnapshot }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <Box sx={{ p: 3 }}>Error: {error}</Box>;
  if (!board) return null;

  const allItems = board.items_page.items;
  const groups = board.groups || [];

  // Filter items by search once
  const filteredItems = allItems.filter(item => 
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group items by group.id
  const itemsByGroup = filteredItems.reduce((acc, item) => {
    const groupId = item.group?.id || 'default';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(item);
    return acc;
  }, {});

  const renderTable = (rows, label, color) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color }} />
        <Typography variant="subtitle2" sx={{ color, fontSize: '0.8rem', fontWeight: 700 }}>
          {label}
        </Typography>
        <Chip
          label={rows.length} size="small"
          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: color + '22', color, border: `1px solid ${color}44` }}
        />
      </Box>

      <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader sx={{ borderCollapse: 'separate', tableLayout: 'fixed', minWidth: 1500 }}>
            <colgroup><col style={{ width: 220 }} /><col style={{ width: 200 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} /><col style={{ width: 150 }} /><col style={{ width: 130 }} /><col style={{ width: 130 }} /><col style={{ width: 320 }} /></colgroup>
            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_CELL}>Equipment Name</TableCell>
                <TableCell sx={HEAD_CELL}>Location</TableCell>
                <TableCell sx={HEAD_CELL}>Manufacturer</TableCell>
                <TableCell sx={HEAD_CELL}>Model Number</TableCell>
                <TableCell sx={HEAD_CELL}>Serial Number</TableCell>
                <TableCell sx={HEAD_CELL}>Install Date</TableCell>
                <TableCell sx={HEAD_CELL}>Status</TableCell>
                <TableCell sx={HEAD_CELL}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                    No equipment
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => {
                  const status = getCol(item, COL.EQUIPMENT.STATUS);
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setOpenDrawer(item)}
                    >
                      {/* Name */}
                      <TableCell sx={{ ...DATA_CELL, py: '5px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                          <Avatar sx={{
                            width: 26, height: 26, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                            bgcolor: 'rgba(34,197,94,0.15)', color: '#16a34a',
                          }}>
                            {item.name?.slice(0, 2).toUpperCase() || '??'}
                          </Avatar>
                          <Tooltip title={item.name} placement="top" enterDelay={600} arrow>
                            <Typography variant="body2" sx={{
                              fontWeight: 600, fontSize: '0.8rem', color: 'text.primary',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.name}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>

                      {/* Location — inline relation cell, stops row click */}
                      <TableCell
                        sx={{ ...DATA_CELL, overflow: 'visible', py: '5px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RelationCell
                          value={getCol(item, COL.EQUIPMENT.LOCATION)}
                          options={locations}
                          placeholder="— add location"
                          chipBgColor="rgba(168,85,247,0.1)"
                          chipTextColor="#c084fc"
                          chipBorderColor="rgba(168,85,247,0.2)"
                          createLabel="location"
                          onSelectExisting={(locId, locName) => handleLinkLocation(item, locId, locName)}
                          onCreateNew={(inputValue) =>
                            setPendingNewLocation({ name: inputValue, equipmentId: item.id })
                          }
                        />
                      </TableCell>

                      <TruncCell value={getCol(item, COL.EQUIPMENT.MANUFACTURER)} />
                      <TruncCell value={getCol(item, COL.EQUIPMENT.MODEL_NUMBER)} />
                      <TruncCell value={getCol(item, COL.EQUIPMENT.SERIAL_NUMBER)} />
                      <TruncCell value={getCol(item, COL.EQUIPMENT.INSTALL_DATE)} />

                      {/* Status chip */}
                      <TableCell sx={{ ...DATA_CELL, overflow: 'visible' }}>
                        {status ? <StatusChip status={status} /> : DASH}
                      </TableCell>

                      <TruncCell value={getCol(item, COL.EQUIPMENT.NOTES)} />
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.3px' }}>
            Equipment
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredItems.length} total items
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
          <TextField
            size="small" 
            placeholder="Search equipment…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} /> }}
            sx={{ 
              width: 260,
              '& .MuiOutlinedInput-root': {
                height: 40,
                borderRadius: '8px',
                bgcolor: '#fff',
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNew}
            sx={{ 
              height: 40, 
              px: 3, 
              borderRadius: '8px', 
              textTransform: 'none', 
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none', bgcolor: 'primary.dark' }
            }}
          >
            New equipment
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          return renderTable(rows, group.title, group.color || '#6b7280');
        })}
      </Box>

      {/* Edit existing equipment */}
      {openDrawer && (
        <EquipmentDrawer
          open
          equipment={openDrawer}
          onClose={() => setOpenDrawer(null)}
          onSaveNew={async (form) => {
            await dispatch(createEquipmentThunk(form));
            setOpenDrawer(null);
          }}
        />
      )}

      {/* New Location Drawer — opened when user picks "+ Add X as new location" */}
      {pendingNewLocation && (
        <LocationDrawer
          open
          location={{ id: '__new__', name: pendingNewLocation.name, column_values: [] }}
          onClose={() => setPendingNewLocation(null)}
          onSaveNew={async (form) => {
            await dispatch(createLocationAndLink({
              form,
              equipmentId: pendingNewLocation.equipmentId,
            }));
            setPendingNewLocation(null);
          }}
        />
      )}
    </Box>
  );
}

// ── Reusable relation cell (same as WorkOrdersBoard) ─────────────────────────
function RelationCell({ value, options, placeholder, chipBgColor, chipTextColor, chipBorderColor, createLabel, onSelectExisting, onCreateNew }) {
  const [editing, setEditing] = useState(false);
  const mouseDownOnOption = useRef(false);

  if (!editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {value ? (
          <Chip
            label={value}
            size="small"
            onClick={() => setEditing(true)}
            sx={{
              maxWidth: 150, fontSize: '0.72rem', height: 22,
              bgcolor: chipBgColor, color: chipTextColor, border: `1px solid ${chipBorderColor}`,
              cursor: 'pointer',
            }}
          />
        ) : (
          <Box
            onClick={() => setEditing(true)}
            sx={{ color: 'text.disabled', fontSize: '0.75rem', cursor: 'pointer', px: 0.5, '&:hover': { color: 'primary.main' } }}
          >
            {placeholder}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Autocomplete
        size="small" open autoFocus
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
        filterOptions={(opts, { inputValue }) => {
          const filtered = opts.filter((o) => o.name.toLowerCase().includes(inputValue.toLowerCase()));
          if (inputValue && !filtered.some((o) => o.name.toLowerCase() === inputValue.toLowerCase())) {
            filtered.push({ id: '__new__', name: `Add "${inputValue}" as new ${createLabel}`, inputValue });
          }
          return filtered;
        }}
        onChange={(_, val) => {
          mouseDownOnOption.current = false;
          setEditing(false);
          if (!val) return;
          if (val.id === '__new__') onCreateNew(val.inputValue);
          else onSelectExisting(val.id, val.name);
        }}
        onBlur={() => { if (!mouseDownOnOption.current) setEditing(false); }}
        renderInput={(params) => (
          <TextField {...params} autoFocus placeholder="Search or create…" sx={{ minWidth: 180 }} />
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <Box
              component="li" key={key} {...rest}
              onMouseDown={() => { mouseDownOnOption.current = true; }}
              sx={{ fontSize: '0.8rem', ...(option.id === '__new__' ? { color: 'primary.main', fontWeight: 600 } : {}) }}
            >
              {option.id === '__new__' ? `+ ${option.name}` : option.name}
            </Box>
          );
        }}
        sx={{ width: 220 }}
      />
    </Box>
  );
}