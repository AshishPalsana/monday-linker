import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkOrders, createWorkOrder } from '../store/workOrderSlice';
import { fetchCustomers, linkExistingCustomer, createCustomerAndLink } from '../store/customersSlice';
import { fetchLocations, linkExistingLocation, createLocationAndLink } from '../store/locationsSlice';
import CustomerDrawer from './CustomerDrawer';
import LocationDrawer from './LocationDrawer';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { MONDAY_COLUMN_IDS } from '../constants';
import StatusChip from './StatusChip';
import AddItemRow from './AddItemRow';
import WorkOrderDrawer from './WorkOrderDrawer';
import RelationCell from './RelationCell';

// Shared header cell style — no wrapping ever
const HEAD_CELL = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'text.secondary',
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
  py: 1,
  px: 1.5,
};


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
        } catch (_) {}
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
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
            onClick={() => setOpenWorkOrderDrawer(true)}
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
            New work order
          </Button>
        </Box>
      </Box>

      {/* Groups + Tables */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          const label = group.title;
          const color = group.color || '#6b7280';

          return (
            <Box key={group.id} sx={{ mb: 4 }}>
              {/* Group header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color }} />
                <Typography
                  variant="subtitle2"
                  sx={{ color, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.3px' }}
                >
                  {label}
                </Typography>
                <Chip
                  label={rows.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: color + '22',
                    color,
                    border: `1px solid ${color}44`,
                  }}
                />
              </Box>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" stickyHeader sx={{ borderCollapse: 'separate', tableLayout: 'fixed', minWidth: 1200 }}>
                    <colgroup>
                      <col style={{ width: 220 }} /> {/* Work order */}
                      <col style={{ width: 200 }} /> {/* Customers */}
                      <col style={{ width: 200 }} /> {/* Locations */}
                      <col style={{ width: 440 }} /> {/* Description of Work */}
                      <col style={{ width: 140 }} /> {/* Status */}
                    </colgroup>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={HEAD_CELL}>Work order</TableCell>
                        <TableCell sx={HEAD_CELL}>Customers</TableCell>
                        <TableCell sx={HEAD_CELL}>Locations</TableCell>
                        <TableCell sx={HEAD_CELL}>Description of Work</TableCell>
                        <TableCell sx={HEAD_CELL}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}
                          >
                            No work orders in this group
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((item) => (
                          <TableRow key={item.id} hover sx={{ cursor: 'pointer' }}>
                            {/* Name */}
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                              >
                                {item.name}
                              </Typography>
                            </TableCell>

                            {/* Customer */}
                            <TableCell>
                              <RelationCell
                                value={getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER)}
                                options={customers}
                                placeholder="— add customer"
                                chipBgColor="rgba(79,142,247,0.1)"
                                chipTextColor="primary.light"
                                chipBorderColor="rgba(79,142,247,0.2)"
                                createLabel="customer"
                                onSelectExisting={(selectedId, selectedName) =>
                                  handleLinkCustomer(item, selectedId, selectedName)
                                }
                                onCreateNew={(inputValue) =>
                                  setPendingNewCustomer({ name: inputValue, workOrderId: item.id })
                                }
                              />
                            </TableCell>

                            {/* Location */}
                            <TableCell>
                              <RelationCell
                                value={getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION)}
                                options={locations}
                                placeholder="— add location"
                                chipBgColor="rgba(168,85,247,0.1)"
                                chipTextColor="#c084fc"
                                chipBorderColor="rgba(168,85,247,0.2)"
                                createLabel="location"
                                onSelectExisting={(selectedId, selectedName) =>
                                  handleLinkLocation(item, selectedId, selectedName)
                                }
                                onCreateNew={(inputValue) =>
                                  setPendingNewLocation({ name: inputValue, workOrderId: item.id })
                                }
                              />
                            </TableCell>

                            {/* Description */}
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: '0.75rem' }}
                              >
                                {getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.DESCRIPTION) || '—'}
                              </Typography>
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              {(() => {
                                const status = getColumnValue(item, MONDAY_COLUMN_IDS.WORK_ORDERS.STATUS);
                                return status ? <StatusChip status={status} /> : '—';
                              })()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {/* New Inline Add Row */}
                      <AddItemRow groupId={group.id} onAdd={(name) => dispatch(createWorkOrder({ name, groupId: group.id }))} />
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          );
        })}
      </Box>

      {/* ── New Customer Drawer ── opens when user picks "+ Add X as new customer" */}
      {pendingNewCustomer && (
        <CustomerDrawer
          open
          customer={{ id: '__new__', name: pendingNewCustomer.name, column_values: [] }}
          onClose={() => setPendingNewCustomer(null)}
          onSaveNew={async (form) => {
            await dispatch(createCustomerAndLink({
              form,
              workOrderId: pendingNewCustomer.workOrderId,
            }));
            setPendingNewCustomer(null);
          }}
        />
      )}

      {/* ── New Location Drawer ── opens when user picks "+ Add X as new location" */}
      {pendingNewLocation && (
        <LocationDrawer
          open
          location={{ id: '__new__', name: pendingNewLocation.name, column_values: [] }}
          onClose={() => setPendingNewLocation(null)}
          onSaveNew={async (form) => {
            await dispatch(createLocationAndLink({
              form,
              workOrderId: pendingNewLocation.workOrderId,
            }));
            setPendingNewLocation(null);
          }}
        />
      )}
      {openWorkOrderDrawer && (
        <WorkOrderDrawer
          open={true}
          onClose={() => setOpenWorkOrderDrawer(false)}
          defaultGroupId={groups.find(g => g.title.toLowerCase().includes('active'))?.id || groups[0]?.id}
        />
      )}
    </Box>
  );
}

// ── Reusable relation cell ─────────────────────────────────────────────────────