import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TableCell, TableRow,
  Tooltip, CircularProgress,
} from '@mui/material';
import { useBoardHeader, useBoardHeaderContext } from '../contexts/BoardHeaderContext';
import { useAuth } from '../hooks/useAuth';
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
  const { auth } = useAuth();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  const { board, loading, error, statusColors } = useSelector((s) => s.equipment);
  const locations = useSelector((s) => s.locations.board?.items_page?.items || EMPTY_ARRAY);
  const { search } = useBoardHeaderContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  // Derived state for the selected equipment based on the URL ID
  const openDrawer = useMemo(() => {
    if (!id) return null;
    if (id === '__new__') return { id: '__new__', name: '', column_values: [] };
    if (!board?.items_page?.items) return null;
    return board.items_page.items.find(i => String(i.id) === id) || null;
  }, [id, board]);

  // URL Cleanup: if an ID is provided but doesn't exist in the board, clear it.
  useEffect(() => {
    if (id && board?.items_page?.items && !openDrawer && !loading) {
      if (id !== '__new__') {
        navigate('/equipment', { replace: true });
      }
    }
  }, [id, board, openDrawer, loading, navigate]);
  

  useEffect(() => {
    dispatch(fetchEquipment());
    dispatch(fetchLocations());
  }, [dispatch]);

  const handleNew = useCallback(() => {
    navigate('/equipment/__new__');
  }, [navigate]);

  const handleLinkLocation = (item, locationId, locationName) => {
    const previousSnapshot = getColumnSnapshot(item, EQ_COL.LOCATION);
    dispatch(linkExistingLocation({ equipmentId: item.id, locationId, locationName, previousSnapshot }));
  };

  const allItems = board?.items_page?.items || [];
  const groups = board?.groups || [];

  // Filter items by search once
  const filteredItems = allItems.filter(item => 
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  useBoardHeader({
    title: 'Equipment',
    count: filteredItems.length,
    buttonLabel: isAdmin ? 'New equipment' : undefined,
    onButtonClick: isAdmin ? handleNew : undefined,
  });

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
      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/equipment/${item.id}`)}>
        <TableCell sx={{ ...DATA_CELL_SX, py: '5px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
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
            readOnly={!isAdmin}
          />
        </TableCell>
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.MANUFACTURER)} />
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.MODEL_NUMBER)} />
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.SERIAL_NUMBER)} />
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.INSTALL_DATE)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? <StatusChip status={status} colorMap={statusColors} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(item, EQ_COL.NOTES)} />
      </TableRow>
    );
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
          onClose={() => navigate('/equipment')}
          onSaveNew={async (form) => {
            await dispatch(createEquipmentThunk(form));
            navigate('/equipment');
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