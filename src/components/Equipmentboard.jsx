import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, TableCell, TableRow,
  TextField, Avatar, Tooltip, CircularProgress,
} from '@mui/material';
import AppButton from './AppButton';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
  fetchEquipment,
  createEquipment as createEquipmentThunk,
  linkExistingLocation,
  createLocationAndLink,
} from '../store/equipmentslice';
import { fetchLocations } from '../store/locationsSlice';
import { MONDAY_COLUMNS } from '../constants/index';
import { getColumnDisplayValue, getColumnSnapshot } from '../utils/mondayUtils';
import StatusChip from './StatusChip';
import EquipmentDrawer from './Equipmentdrawer';
import LocationDrawer from './LocationDrawer';
import RelationCell from './RelationCell';
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from './BoardTable';

const EQ_COL = MONDAY_COLUMNS.EQUIPMENT;
const EMPTY_ARRAY = [];

export default function EquipmentBoard() {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((s) => s.equipment);
  const locations = useSelector((s) => s.locations.board?.items_page?.items || EMPTY_ARRAY);
  const [search, setSearch] = useState('');
  const { id } = useParams();
  const [openDrawer, setOpenDrawer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  // Deep linking: open record if ID is in URL
  useEffect(() => {
    if (id && board?.items_page?.items) {
      const item = board.items_page.items.find(i => String(i.id) === id);
      if (item) setOpenDrawer(item);
    }
  }, [id, board]);
  

  useEffect(() => {
    dispatch(fetchEquipment());
    dispatch(fetchLocations());
  }, [dispatch]);

  const handleNew = () => {
    setOpenDrawer({ id: '__new__', name: '', column_values: [] });
  };

  const getCol = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return '';
    if (colId === EQ_COL.LOCATION) {
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
    const previousSnapshot = getColumnSnapshot(item, EQ_COL.LOCATION);
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

  const EQUIPMENT_COLUMNS = [
    { label: 'Equipment Name', width: 220 },
    { label: 'Location',       width: 200 },
    { label: 'Manufacturer',   width: 150 },
    { label: 'Model Number',   width: 150 },
    { label: 'Serial Number',  width: 150 },
    { label: 'Install Date',   width: 130 },
    { label: 'Status',         width: 130 },
    { label: 'Notes',          width: 320 },
  ];

  const renderEquipmentRow = (item) => {
    const status = getColumnDisplayValue(item, EQ_COL.STATUS);
    return (
      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenDrawer(item)}>
        <TableCell sx={{ ...DATA_CELL_SX, py: '5px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, bgcolor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
              {item.name?.slice(0, 2).toUpperCase() || '??'}
            </Avatar>
            <Tooltip title={item.name} placement="top" enterDelay={600} arrow>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </Typography>
            </Tooltip>
          </Box>
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible', py: '5px' }} onClick={(e) => e.stopPropagation()}>
          <RelationCell
            value={getColumnDisplayValue(item, EQ_COL.LOCATION)}
            options={locations}
            placeholder="— add location"
            chipBgColor="rgba(168,85,247,0.1)"
            chipTextColor="#c084fc"
            chipBorderColor="rgba(168,85,247,0.2)"
            createLabel="location"
            onSelectExisting={(locId, locName) => handleLinkLocation(item, locId, locName)}
            onCreateNew={(inputValue) => setPendingNewLocation({ name: inputValue, equipmentId: item.id })}
          />
        </TableCell>
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.MANUFACTURER)} />
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.MODEL_NUMBER)} />
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.SERIAL_NUMBER)} />
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.INSTALL_DATE)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? <StatusChip status={status} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.NOTES)} />
      </TableRow>
    );
 };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 },
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexShrink: 0,
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.3px' }}>
            Equipment
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredItems.length} total items
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            size="small" 
            placeholder="Search equipment…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} /> }}
            sx={{
              flex: { xs: 1, sm: 'none' },
              width: { xs: 'auto', sm: 260 },
              '& .MuiOutlinedInput-root': { height: 36, borderRadius: '8px', bgcolor: '#fff' },
            }}
          />
          <AppButton startIcon={<AddIcon />} onClick={handleNew} sx={{ flexShrink: 0 }}>
            New equipment
          </AppButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          return (
            <BoardGroup key={group.id} label={group.title} color={group.color || '#6b7280'} count={rows.length}>
              <BoardTable
                columns={EQUIPMENT_COLUMNS}
                rows={rows}
                renderRow={renderEquipmentRow}
                emptyMessage="No equipment"
                minWidth={1450}
              />
            </BoardGroup>
          );
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