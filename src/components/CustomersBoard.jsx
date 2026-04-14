import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
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
import { MONDAY_COLUMNS } from '../constants/index';
import { getColumnDisplayValue } from '../utils/mondayUtils';
import StatusChip from './StatusChip';
import CustomerDrawer from './CustomerDrawer';
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from './BoardTable';



const COL = MONDAY_COLUMNS.CUSTOMERS;

export default function CustomersBoard({ createCustomer }) {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((state) => state.customers);
  const { id } = useParams();
  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (id && board?.items_page?.items) {
      const item = board.items_page.items.find(i => String(i.id) === id);
      if (item) setOpenDialog(item);
    }
  }, [id, board]);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

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
    const status     = getColumnDisplayValue(c, COL.STATUS);
    const xeroStatus = getColumnDisplayValue(c, COL.XERO_SYNC_STATUS);
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
        <TruncCell value={getColumnDisplayValue(c, COL.EMAIL)} />
        <TruncCell value={getColumnDisplayValue(c, COL.PHONE)} />
        <TruncCell value={getColumnDisplayValue(c, COL.ACCOUNT_NUMBER)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? <StatusChip status={status} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(c, COL.BILLING_ADDRESS)} />
        <TruncCell value={getColumnDisplayValue(c, COL.BILLING_TERMS)} />
        <TruncCell value={getColumnDisplayValue(c, COL.XERO_CONTACT_ID)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {xeroStatus ? <StatusChip status={xeroStatus} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(c, COL.NOTES)} />
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