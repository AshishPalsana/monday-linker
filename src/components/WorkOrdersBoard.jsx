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

export default function WorkOrdersBoard() {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((s) => s.workOrders);
  const customers = useSelector((s) => s.customers.board?.items_page?.items || []);
  const locations = useSelector((s) => s.locations.board?.items_page?.items || []);
  const [search, setSearch] = useState('');
  // pendingNew holds { name, workOrderId } while the drawer is open for a brand-new record
  const [pendingNewCustomer, setPendingNewCustomer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

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

  const groups = board.groups.map((g) => g.id);
  const groupLabels = Object.fromEntries(board.groups.map((g) => [g.id, g.title]));

  const filteredItems = board.items_page.items.filter(
    (item) => !search || item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const itemsByGroup = (groupId) =>
    filteredItems.filter((item) => item.group.id === groupId);

  const getGroupColor = (title = '') => {
    const t = title.toLowerCase();
    if (t.includes('active')) return '#4f8ef7';
    if (t.includes('completed')) return '#22c55e';
    if (t.includes('ready') || t.includes('billing')) return '#f59e0b';
    if (t.includes('billed')) return '#6b7280';
    return '#a855f7';
  };

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
            {board.items_page.items.length} total
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
            sx={{ width: 220 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            size="small"
            sx={{ px: 2 }}
            disabled
          >
            New work order
          </Button>
        </Box>
      </Box>

      {/* Groups + Tables */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
        {groups.map((groupId) => {
          const rows = itemsByGroup(groupId);
          const label = groupLabels[groupId] || '';
          const color = getGroupColor(label);

          return (
            <Box key={groupId} sx={{ mb: 4 }}>
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
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Work order</TableCell>
                        <TableCell>Customers</TableCell>
                        <TableCell>Locations</TableCell>
                        <TableCell>Description of Work</TableCell>
                        <TableCell>Status</TableCell>
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
                      <AddItemRow groupId={groupId} onAdd={(name) => dispatch(createWorkOrder({ name, groupId }))} />
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
    </Box>
  );
}

// ── Reusable relation cell ─────────────────────────────────────────────────────
function RelationCell({
  value,
  options,
  placeholder,
  chipBgColor,
  chipTextColor,
  chipBorderColor,
  createLabel,
  onSelectExisting,
  onCreateNew,
}) {
  const [editing, setEditing] = useState(false);
  const mouseDownOnOption = useRef(false);

  if (!editing) {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        {value ? (
          <Chip
            label={value}
            size="small"
            onClick={() => setEditing(true)}
            sx={{
              maxWidth: 150,
              fontSize: '0.72rem',
              height: 22,
              bgcolor: chipBgColor,
              color: chipTextColor,
              border: `1px solid ${chipBorderColor}`,
              cursor: 'pointer',
            }}
          />
        ) : (
          <Box
            onClick={() => setEditing(true)}
            sx={{
              color: 'text.disabled',
              fontSize: '0.75rem',
              cursor: 'pointer',
              px: 0.5,
              '&:hover': { color: 'primary.main' },
            }}
          >
            {placeholder}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Autocomplete
        size="small"
        open
        autoFocus
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
        filterOptions={(opts, { inputValue }) => {
          const filtered = opts.filter((o) =>
            o.name.toLowerCase().includes(inputValue.toLowerCase()),
          );
          if (
            inputValue &&
            !filtered.some((o) => o.name.toLowerCase() === inputValue.toLowerCase())
          ) {
            filtered.push({
              id: '__new__',
              name: `Add "${inputValue}" as new ${createLabel}`,
              inputValue,
            });
          }
          return filtered;
        }}
        onChange={(_, val) => {
          mouseDownOnOption.current = false;
          setEditing(false);
          if (!val) return;
          if (val.id === '__new__') {
            onCreateNew(val.inputValue);
          } else {
            // Pass both id and name so the thunk can optimistically display the name
            onSelectExisting(val.id, val.name);
          }
        }}
        onBlur={() => {
          if (!mouseDownOnOption.current) setEditing(false);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus
            placeholder="Search or create…"
            sx={{ minWidth: 180 }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          return (
            <Box
              component="li"
              key={key}
              {...rest}
              onMouseDown={() => { mouseDownOnOption.current = true; }}
              sx={{
                fontSize: '0.8rem',
                ...(option.id === '__new__'
                  ? { color: 'primary.main', fontWeight: 600 }
                  : {}),
              }}
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