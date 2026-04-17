import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  Avatar,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { useBoardHeader, useBoardHeaderContext } from '../contexts/BoardHeaderContext';
import { fetchCustomers, createCustomer as createCustomerThunk } from '../store/customersSlice';
import { MONDAY_COLUMNS } from '../constants/index';
import { getColumnDisplayValue } from '../utils/mondayUtils';
import StatusChip from './StatusChip';
import CustomerDrawer from './CustomerDrawer';
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from './BoardTable';

const COL = MONDAY_COLUMNS.CUSTOMERS;

export default function CustomersBoard() {
  const dispatch = useDispatch();
  const { board, loading, error, statusColors } = useSelector((state) => state.customers);
  const { search } = useBoardHeaderContext();
  const { id } = useParams();
  const navigate = useNavigate();

  // Derived state for the selected customer based on the URL ID
  const openDialog = useMemo(() => {
    if (!id) return null;
    if (id === '__new__') return { id: '__new__', name: '', column_values: [] };
    if (!board?.items_page?.items) return null;
    return board.items_page.items.find(i => String(i.id) === id) || null;
  }, [id, board]);

  // URL Cleanup: if an ID is provided but doesn't exist in the board, clear it.
  useEffect(() => {
    if (id && board?.items_page?.items && !openDialog && !loading) {
      if (id !== '__new__') {
        navigate('/customers', { replace: true });
      }
    }
  }, [id, board, openDialog, loading, navigate]);

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const handleNew = useCallback(() => {
    navigate('/customers/__new__');
  }, [navigate]);

  const allItems = board?.items_page?.items || [];
  const groups = board?.groups || [];

  const filteredItems = allItems.filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  useBoardHeader({
    title: 'Customers',
    count: filteredItems.length,
    buttonLabel: 'New customer',
    onButtonClick: handleNew,
  });

  const itemsByGroup = filteredItems.reduce((acc, item) => {
    const groupId = item.group?.id || 'default';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <Box sx={{ p: 3 }}>Error: {error}</Box>;
  if (!board) return null;

  const CUSTOMER_COLUMNS = [
    { label: 'Customer Name', width: 220 },
    { label: 'Email', width: 200 },
    { label: 'Phone', width: 140 },
    { label: 'Account No.', width: 160 },
    { label: 'Customer Status', width: 160 },
    { label: 'Billing Address', width: 220 },
    { label: 'Billing Terms', width: 130 },
    { label: 'Xero Contact ID', width: 140 },
    { label: 'Xero Sync', width: 140 },
    { label: 'Work Orders', width: 180 },
    { label: 'Locations', width: 180 },
    { label: 'Notes', width: 250 },
  ];

  const renderCustomerRow = (c) => {
    const status = getColumnDisplayValue(c, COL.STATUS);
    const xeroStatus = getColumnDisplayValue(c, COL.XERO_SYNC_STATUS);
    return (
      <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.id}`)}>
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
          {status ? <StatusChip status={status} colorMap={statusColors} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(c, COL.BILLING_ADDRESS)} />
        <TruncCell value={getColumnDisplayValue(c, COL.BILLING_TERMS)} />
        <TruncCell value={getColumnDisplayValue(c, COL.XERO_CONTACT_ID)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {xeroStatus ? <StatusChip status={xeroStatus} colorMap={statusColors} /> : DASH}
        </TableCell>
        <TruncCell value={getColumnDisplayValue(c, COL.WORK_ORDERS_REL)} />
        <TruncCell value={getColumnDisplayValue(c, COL.LOCATIONS_REL)} />
        <TruncCell value={getColumnDisplayValue(c, COL.NOTES)} />
      </TableRow>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
                minWidth={2120}
              />
            </BoardGroup>
          );
        })}
      </Box>

      {openDialog && (
        <CustomerDrawer
          open={true}
          customer={openDialog}
          onClose={() => navigate('/customers')}
          onSaveNew={async (form) => {
            await dispatch(createCustomerThunk(form));
            navigate('/customers');
          }}
        />
      )}
    </Box>
  );
}