import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  TextField,
  IconButton,
  Avatar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import { fetchCustomers, createCustomer as createCustomerThunk } from '../store/customersSlice';
import { MONDAY_COLUMN_IDS } from '../constants';
import StatusChip from './StatusChip';
import CustomerDrawer from './CustomerDrawer';
import AddItemRow from './AddItemRow';

// Shared styles applied to every header cell — prevents any wrapping
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

// Shared styles applied to every data cell — single line with ellipsis
const DATA_CELL = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '0.75rem',
  color: 'text.secondary',
  py: '7px',
  px: 1.5,
  maxWidth: 0, // required for ellipsis to work inside table-layout:fixed cells
};

const DASH = <span style={{ color: '#9ba6b4' }}>—</span>;

// Truncated text cell with tooltip showing full value on hover
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
    const name = prompt('Enter customer name:');
    if (name) createCustomer(name);
  };

  const renderTable = (rows, label, color) => (
    <Box sx={{ mb: 4 }}>
      {/* Group label */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color }} />
        <Typography variant="subtitle2" sx={{ color, fontSize: '0.8rem', fontWeight: 700 }}>
          {label}
        </Typography>
        <Chip
          label={rows.length}
          size="small"
          sx={{
            height: 18, fontSize: '0.65rem', fontWeight: 700,
            bgcolor: color + '22', color, border: `1px solid ${color}44`,
          }}
        />
      </Box>

      <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
        {/*
          minWidth forces a horizontal scrollbar on small screens instead of compressing columns.
          tableLayout fixed + explicit column widths gives every column a guaranteed size
          so ellipsis can work correctly.
        */}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table
            size="small"
            stickyHeader
            sx={{ tableLayout: 'fixed', minWidth: 900 }}
          >
            <colgroup>
              <col style={{ width: '17%' }} /> {/* Customer Name */}
              <col style={{ width: '13%' }} /> {/* Email */}
              <col style={{ width: '10%' }} /> {/* Phone */}
              <col style={{ width: '8%' }}  /> {/* Account # */}
              <col style={{ width: '8%' }}  /> {/* Status */}
              <col style={{ width: '14%' }} /> {/* Billing Address */}
              <col style={{ width: '8%' }}  /> {/* Billing Terms */}
              <col style={{ width: '10%' }} /> {/* Xero Contact ID */}
              <col style={{ width: '8%' }}  /> {/* Xero Sync Status */}
              <col style={{ width: '4%' }}  /> {/* Edit button */}
            </colgroup>

            <TableHead>
              <TableRow>
                <TableCell sx={HEAD_CELL}>Customer Name</TableCell>
                <TableCell sx={HEAD_CELL}>Email</TableCell>
                <TableCell sx={HEAD_CELL}>Phone</TableCell>
                <TableCell sx={HEAD_CELL}>Account number</TableCell>
                <TableCell sx={HEAD_CELL}>Customer Status</TableCell>
                <TableCell sx={HEAD_CELL}>Billing Address</TableCell>
                <TableCell sx={HEAD_CELL}>Billing Terms</TableCell>
                <TableCell sx={HEAD_CELL}>Xero Contact ID</TableCell>
                <TableCell sx={HEAD_CELL}>Xero Sync Status</TableCell>
                <TableCell sx={{ ...HEAD_CELL, width: 40 }} />
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                    No customers
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => {
                  const status     = getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.STATUS);
                  const xeroStatus = getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.XERO_SYNC_STATUS);

                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setOpenDialog(c)}
                    >
                      {/* Customer Name — avatar + truncated name */}
                      <TableCell sx={{ ...DATA_CELL, py: '5px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                          <Avatar sx={{
                            width: 26, height: 26, fontSize: '0.6rem', fontWeight: 700,
                            flexShrink: 0,
                            bgcolor: 'rgba(79,142,247,0.2)', color: 'primary.light',
                          }}>
                            {c.name?.slice(0, 2).toUpperCase() || '??'}
                          </Avatar>
                          <Tooltip title={c.name} placement="top" enterDelay={600} arrow>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600, fontSize: '0.8rem', color: 'text.primary',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                            >
                              {c.name}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>

                      {/* Email */}
                      <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.EMAIL)} />

                      {/* Phone */}
                      <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.PHONE)} />

                      {/* Account # */}
                      <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.ACCOUNT_NUMBER)} />

                      {/* Status chip */}
                      <TableCell sx={{ ...DATA_CELL, overflow: 'visible' }}>
                        {status ? <StatusChip status={status} /> : DASH}
                      </TableCell>

                      {/* Billing Address — long text, tooltip on hover */}
                      <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_ADDRESS)} />

                      {/* Billing Terms */}
                      <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_TERMS)} />

                      {/* Xero Contact ID */}
                      <TruncCell value={getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.XERO_CONTACT_ID)} />

                      {/* Xero Sync Status chip */}
                      <TableCell sx={{ ...DATA_CELL, overflow: 'visible' }}>
                        {xeroStatus ? <StatusChip status={xeroStatus} /> : DASH}
                      </TableCell>

                      {/* Edit button */}
                      <TableCell
                        sx={{ ...DATA_CELL, overflow: 'visible', px: 0.5 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton size="small" onClick={() => setOpenDialog(c)}>
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* New Inline Add Row */}
              <AddItemRow
                placeholder="Add customer name"
                colSpan={10}
                onAdd={(name) => dispatch(createCustomerThunk(name))}
              />
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
            Customers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredItems.length} total customers
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
          <TextField
            size="small"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.5 }} />,
            }}
            sx={{ width: 220 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleNew} size="small" sx={{ px: 2 }}>
            New customer
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2 }}>
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          return renderTable(rows, group.title, group.color || '#6b7280');
        })}
      </Box>

      {openDialog && (
        <CustomerDrawer
          open={true}
          customer={openDialog}
          onClose={() => setOpenDialog(null)}
        />
      )}
    </Box>
  );
}