import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkOrders } from '../store/workOrderSlice';
import { fetchCustomers, linkExistingCustomer, createCustomerAndLink } from '../store/customersSlice';
import { fetchLocations, linkExistingLocation, createLocationAndLink } from '../store/locationsSlice';
import CustomerDrawer from './CustomerDrawer';
import LocationDrawer from './LocationDrawer';
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  TextField,
  CircularProgress,
} from '@mui/material';
import AppButton from './AppButton';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CheckIcon from '@mui/icons-material/Check';
import { MONDAY_COLUMN_IDS } from '../constants';
import StatusChip from './StatusChip';
import WorkOrderDrawer from './WorkOrderDrawer';
import WorkOrderDetailDrawer from './WorkOrderDetailDrawer';
import RelationCell from './RelationCell';
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH } from './BoardTable';



export default function WorkOrdersBoard() {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((s) => s.workOrders);
  const customers = useSelector((s) => s.customers.board?.items_page?.items || []);
  const locations = useSelector((s) => s.locations.board?.items_page?.items || []);
  const [search, setSearch] = useState('');
  // pendingNew holds { name, workOrderId } while the drawer is open for a brand-new record
  const [pendingNewCustomer, setPendingNewCustomer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);
  const [openWorkOrderDrawer, setOpenWorkOrderDrawer] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  useEffect(() => {
    dispatch(fetchWorkOrders());
    dispatch(fetchCustomers());
    dispatch(fetchLocations());
  }, [dispatch]);

  const customerMap = customers.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {});
  const locationMap = locations.reduce((acc, l) => { acc[l.id] = l.name; return acc; }, {});

  const getColumnValue = (item, colId) => {
    const col = item.column_values.find((cv) => cv.id === colId);
    if (!col) return '';
    if (
      colId === MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER ||
      colId === MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION
    ) {
      // Always prefer display_value/text first — set immediately by optimisticUpdateRelation
      // so the name shows before customerMap/locationMap is updated after refetch.
      if (col.display_value && col.display_value.trim()) return col.display_value;
      if (col.text && col.text.trim()) return col.text;
      // Fallback: resolve via ID map for records loaded fresh from Monday API
      if (col.value) {
        try {
          const parsed = JSON.parse(col.value);
          const ids = parsed?.linkedPulseIds || parsed?.linked_item_ids || [];
          if (Array.isArray(ids) && ids.length > 0) {
            const map = colId === MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER ? customerMap : locationMap;
            const names = ids
              .map((p) => {
                const id = typeof p === 'object' ? p.linkedPulseId || p.id : p;
                return map[id]; // undefined if not in map yet — filtered below
              })
              .filter(Boolean);
            if (names.length > 0) return names.join(', ');
          }
        } catch { /* ignore */ }
      }
      return '';
    }
    return col.label || col.text || '';
  };

  // Returns the raw column object for snapshotting before optimistic update
  const getRawColumn = (item, colId) => {
    const col = item.column_values.find((cv) => cv.id === colId);
    if (!col) return { value: null, text: null, display_value: null };
    return { value: col.value, text: col.text, display_value: col.display_value || null };
  };

  const handleLinkCustomer = (item, customerId, customerName) => {
    const previousSnapshot = getRawColumn(item, MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER);
    dispatch(
      linkExistingCustomer({
        workOrderId: item.id,
        customerId,
        customerName,
        previousSnapshot,
      }),
    );
  };

  const handleLinkLocation = (item, locationId, locationName) => {
    const previousSnapshot = getRawColumn(item, MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION);
    dispatch(
      linkExistingLocation({
        workOrderId: item.id,
        locationId,
        locationName,
        previousSnapshot,
      }),
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <div>Error: {error}</div>;
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

  const WO_COLUMNS = [
    { label: 'WO #',                width: 90  },
    { label: 'Work order',          width: 220 },
    { label: 'Customers',           width: 180 },
    { label: 'Locations',           width: 200 },
    { label: 'Description of Work', width: 300 },
    { label: 'Status',              width: 150 },
    { label: 'Technician',          width: 160 },
    { label: 'Scheduled Date',      width: 130 },
    { label: 'Multi-Day',           width: 120 },
    { label: 'Model',               width: 140 },
    { label: 'Serial Number',       width: 150 },
    { label: 'Service History',     width: 250 },
    { label: 'Work Performed',      width: 250 },
    { label: 'Equipments',          width: 160 },
    { label: 'Execution Status',    width: 150 },
    { label: 'Parts Ordered',       width: 140 },
  ];

  const renderWORow = (item) => (
    <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedWorkOrder(item)}>
      <TableCell sx={{ ...DATA_CELL_SX, fontFamily: 'monospace' }}>
        {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.WORKORDER_ID) || '—'}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
          {item.name}
        </Typography>
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
        <RelationCell
          value={getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER)}
          options={customers}
          placeholder="— add customer"
          chipBgColor="rgba(79,142,247,0.1)"
          chipTextColor="primary.light"
          chipBorderColor="rgba(79,142,247,0.2)"
          createLabel="customer"
          onSelectExisting={(id, name) => handleLinkCustomer(item, id, name)}
          onCreateNew={(v) => setPendingNewCustomer({ name: v, workOrderId: item.id })}
        />
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
        <RelationCell
          value={getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION)}
          options={locations}
          placeholder="— add location"
          chipBgColor="rgba(168,85,247,0.1)"
          chipTextColor="#c084fc"
          chipBorderColor="rgba(168,85,247,0.2)"
          createLabel="location"
          onSelectExisting={(id, name) => handleLinkLocation(item, id, name)}
          onCreateNew={(v) => setPendingNewLocation({ name: v, workOrderId: item.id })}
        />
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.DESCRIPTION) || '—'}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
        {(() => { const s = getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.STATUS); return s ? <StatusChip status={s} /> : '—'; })()}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.TECHNICIAN) || '—'}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.SCHEDULED_DATE) || '—'}
      </TableCell>
      <TableCell sx={{ textAlign: 'center' }}>
        {(() => {
          const col = item.column_values.find(cv => cv.id === MONDAY_COLUMN_IDS.WORK_ORDERS.MULTI_DAY);
          let checked = false;
          try { checked = col?.value ? JSON.parse(col.value)?.checked : false; } catch { /* ignore */ }
          return checked
            ? <CheckIcon sx={{ fontSize: 18, color: '#4caf50', display: 'block', mx: 'auto' }} />
            : <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>;
        })()}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {(() => { const col = item.column_values.find(cv => cv.id === MONDAY_COLUMN_IDS.WORK_ORDERS.MODEL); return col?.display_value || col?.text || '—'; })()}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {(() => { const col = item.column_values.find(cv => cv.id === MONDAY_COLUMN_IDS.WORK_ORDERS.SERIAL_NUMBER); return col?.display_value || col?.text || '—'; })()}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, whiteSpace: 'nowrap' }}>
        {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.SERVICE_HISTORY) || '—'}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, whiteSpace: 'nowrap' }}>
        {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.WORK_PERFORMED) || '—'}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {(() => { const col = item.column_values.find(cv => cv.id === MONDAY_COLUMN_IDS.WORK_ORDERS.EQUIPMENT); return col?.display_value || col?.text || '—'; })()}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
        {(() => { const s = getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.EXECUTION_STATUS); return s ? <StatusChip status={s} /> : '—'; })()}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
        {(() => { const s = getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.PARTS_ORDERED); return s ? <StatusChip status={s} /> : '—'; })()}
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.3px' }}
          >
            Work Orders
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredItems.length} total
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            size="small"
            placeholder="Search work orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />
              ),
            }}
            sx={{
              flex: { xs: 1, sm: 'none' },
              width: { xs: 'auto', sm: 260 },
              '& .MuiOutlinedInput-root': { height: 36, borderRadius: '8px', bgcolor: '#fff' },
            }}
          />
          <AppButton
            startIcon={<AddIcon />}
            onClick={() => setOpenWorkOrderDrawer(true)}
            sx={{ flexShrink: 0 }}
          >
            New work order
          </AppButton>
        </Box>
      </Box>

      {/* Groups + Tables */}
      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          return (
            <BoardGroup key={group.id} label={group.title} color={group.color || '#6b7280'} count={rows.length}>
              <BoardTable
                columns={WO_COLUMNS}
                rows={rows}
                renderRow={renderWORow}
                emptyMessage="No work orders in this group"
                minWidth={2790}
              />
            </BoardGroup>
          );
        })}
      </Box>

      {/* ── New Customer Drawer ── opens when user picks "+ Add X as new customer" */}
      <CustomerDrawer
        open={!!pendingNewCustomer}
        customer={pendingNewCustomer
          ? { id: '__new__', name: pendingNewCustomer.name, column_values: [] }
          : { id: '__new__', name: '', column_values: [] }
        }
        onClose={() => setPendingNewCustomer(null)}
        onSaveNew={async (form) => {
          await dispatch(createCustomerAndLink({
            form,
            workOrderId: pendingNewCustomer.workOrderId,
          }));
          setPendingNewCustomer(null);
        }}
      />

      {/* ── New Location Drawer ── opens when user picks "+ Add X as new location" */}
      <LocationDrawer
        open={!!pendingNewLocation}
        location={pendingNewLocation
          ? { id: '__new__', name: pendingNewLocation.name, column_values: [] }
          : { id: '__new__', name: '', column_values: [] }
        }
        onClose={() => setPendingNewLocation(null)}
        onSaveNew={async (form) => {
          await dispatch(createLocationAndLink({
            form,
            workOrderId: pendingNewLocation.workOrderId,
          }));
          setPendingNewLocation(null);
        }}
      />
      <WorkOrderDrawer
        open={openWorkOrderDrawer}
        onClose={() => setOpenWorkOrderDrawer(false)}
        defaultGroupId={groups.find(g => g.title.toLowerCase().includes('active'))?.id || groups[0]?.id}
      />

      {/* ── Work Order Detail Drawer ── opens on row click */}
      <WorkOrderDetailDrawer
        key={selectedWorkOrder?.id}
        open={!!selectedWorkOrder}
        workOrder={selectedWorkOrder}
        onClose={() => setSelectedWorkOrder(null)}
      />
    </Box>
  );
}

// ── Reusable relation cell ─────────────────────────────────────────────────────
