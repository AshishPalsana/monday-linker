import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  TextField,
  Avatar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AppButton from './AppButton';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { fetchCustomers, createCustomer as createCustomerThunk } from '../store/customersSlice';
import { MONDAY_COLUMN_IDS } from '../constants';
import StatusChip from './StatusChip';
import CustomerDrawer from './CustomerDrawer';
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from './BoardTable';



export default function CustomersBoard({ createCustomer }) {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((state) => state.customers);
  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const getColumnValue = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return '';
    if (col.text && col.text.trim() !== '') return col.text;
    if (col.value) {
      try {
        const parsed = JSON.parse(col.value);
        if (parsed.email) return parsed.email;
        if (parsed.phone) return parsed.phone;
        if (parsed.text && typeof parsed.text === 'string') return parsed.text;
      } catch {
        // ignore
      }
    }
    return '';
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

  const handleNew = () => {
    setOpenDialog({ id: '__new__', name: '', column_values: [] });
  };

  const CUSTOMER_COLUMNS = [
    { label: 'Customer Name', width: 220 },
    { label: 'Email',         width: 200 },
    { label: 'Phone',         width: 140 },
    { label: 'Account No.',   width: 160 },
    { label: 'Status',        width: 160 },
    { label: 'Billing Address', width: 220 },
    { label: 'Billing Terms', width: 130 },
    { label: 'Xero Contact ID', width: 140 },
    { label: 'Xero Sync',     width: 140 },
    { label: 'Notes',         width: 250 },
  ];

  const renderCustomerRow = (c) => {
    const status     = getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.STATUS);
    const xeroStatus = getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.XERO_SYNC_STATUS);
    return (
      <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenDialog(c)}>
        <TableCell sx={{ ...DATA_CELL_SX, py: '5px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, bgcolor: 'rgba(79,142,247,0.2)', color: 'primary.light' }}>
              {c.name?.slice(0, 2).toUpperCase() || '??'}
            </Avatar>
            <Tooltip title={c.name} placement="top" enterDelay={600} arrow>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
              </Typography>
            </Tooltip>
          </Box>
        </TableCell>
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.EMAIL)} />
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.PHONE)} />
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.ACCOUNT_NUMBER)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? <StatusChip status={status} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_ADDRESS)} />
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_TERMS)} />
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.XERO_CONTACT_ID)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {xeroStatus ? <StatusChip status={xeroStatus} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.NOTES)} />
      </TableRow>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{
        px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 },
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, flexShrink: 0,
      }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.3px' }}>
            Customers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredItems.length} total customers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            size="small"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />,
            }}
            sx={{
              flex: { xs: 1, sm: 'none' },
              width: { xs: 'auto', sm: 260 },
              '& .MuiOutlinedInput-root': { height: 36, borderRadius: '8px', bgcolor: '#fff' },
            }}
          />
          <AppButton startIcon={<AddIcon />} onClick={handleNew} sx={{ flexShrink: 0 }}>
            New customer
          </AppButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          return (
            <BoardGroup key={group.id} label={group.title} color={group.color || '#6b7280'} count={rows.length}>
              <BoardTable
                columns={CUSTOMER_COLUMNS}
                rows={rows}
                renderRow={renderCustomerRow}
                emptyMessage="No customers"
                minWidth={1760}
              />
            </BoardGroup>
          );
        })}
      </Box>

      {openDialog && (
        <CustomerDrawer
          open={true}
          customer={openDialog}
          onClose={() => setOpenDialog(null)}
          onSaveNew={async (form) => {
            await dispatch(createCustomerThunk(form));
            setOpenDialog(null);
          }}
        />
      )}
    </Box>
  );
}