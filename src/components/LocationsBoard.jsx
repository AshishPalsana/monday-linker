import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  TextField,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import AppButton from "./AppButton";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { fetchLocations } from "../store/locationsSlice";
import { fetchCustomers } from "../store/customersSlice";
import { fetchWorkOrders } from "../store/workOrderSlice";
import { COL } from "../services/mondayMutations";
import StatusChip from "./StatusChip";
import LocationDrawer from "./LocationDrawer";
import { createLocation as createLocationThunk } from "../store/locationsSlice";
import { BoardGroup, BoardTable, DATA_CELL_SX, DASH, TruncCell } from "./BoardTable";



export default function LocationsBoard({ createLocation }) {
  const dispatch = useDispatch();
  const { board: locBoard, loading, error } = useSelector((s) => s.locations);
  const custBoard = useSelector((s) => s.customers.board);

  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchCustomers());
    dispatch(fetchWorkOrders());
  }, [dispatch]);

  // Get a column value by its real Monday column ID
  const getCol = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    if (col.label && col.label.trim()) return col.label;
    if (col.text && col.text.trim()) return col.text;
    if (col.display_value && col.display_value.trim()) return col.display_value;
    return "";
  };

  // Resolve linked customer name from the Customers board relation column
  const getCustomerName = (item) => {
    const col = item.column_values?.find(
      (cv) => cv.id === COL.LOCATIONS.CUSTOMERS_REL,
    );
    if (!col) return "";
    return col.display_value || col.text || "";
  };

  // Resolve linked names from any board relation column (returns comma-separated string)
  const getRelationNames = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    return col.display_value || col.text || "";
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <Box sx={{ p: 3 }}>Error: {error}</Box>;
  if (!locBoard) return null;

  const allLocations = locBoard.items_page.items;
  const groups = locBoard.groups || [];

  // Filter items by search once
  const filteredLocations = allLocations.filter(loc => 
    !search || loc.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group items by group.id
  const locationsByGroup = filteredLocations.reduce((acc, loc) => {
    const groupId = loc.group?.id || 'default';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(loc);
    return acc;
  }, {});

  const handleNew = () => {
    setOpenDialog({ id: '__new__', name: '', column_values: [] });
  };

  const LOCATION_COLUMNS = [
    { label: 'Location Name',  width: 200 },
    { label: 'Street Address', width: 220 },
    { label: 'City',           width: 130 },
    { label: 'State',          width: 80  },
    { label: 'ZIP',            width: 80  },
    { label: 'Status',         width: 130 },
    { label: 'Notes',          width: 250 },
    { label: 'Work Orders',    width: 160 },
    { label: 'Customer',       width: 160 },
    { label: 'Equipments',     width: 160 },
  ];

  const renderLocationRow = (l) => {
    const status         = getCol(l, COL.LOCATIONS.STATUS);
    const customerName   = getCustomerName(l);
    const workOrderNames = getRelationNames(l, COL.LOCATIONS.WORK_ORDERS_REL);
    const equipmentNames = getRelationNames(l, COL.LOCATIONS.EQUIPMENTS_REL);
    return (
      <TableRow key={l.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenDialog(l)}>
        <TableCell sx={{ ...DATA_CELL_SX, py: '5px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
            <Avatar sx={{ width: 26, height: 26, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, bgcolor: 'rgba(168,85,247,0.2)', color: '#c084fc' }}>
              {l.name.slice(0, 2).toUpperCase()}
            </Avatar>
            <Tooltip title={l.name} placement="top" enterDelay={600} arrow>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.name}
              </Typography>
            </Tooltip>
          </Box>
        </TableCell>
        <TruncCell value={getCol(l, COL.LOCATIONS.STREET_ADDRESS)} />
        <TruncCell value={getCol(l, COL.LOCATIONS.CITY)} />
        <TruncCell value={getCol(l, COL.LOCATIONS.STATE)} />
        <TruncCell value={getCol(l, COL.LOCATIONS.ZIP)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {status ? <StatusChip status={status} /> : DASH}
        </TableCell>
        <TruncCell value={getCol(l, COL.LOCATIONS.NOTES)} />
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {workOrderNames ? (
            <Tooltip title={workOrderNames} placement="top" enterDelay={600} arrow>
              <Chip label={workOrderNames} size="small" sx={{ maxWidth: '100%', fontSize: '0.72rem', height: 22, bgcolor: 'rgba(79,142,247,0.08)', color: '#4f8ef7', border: '1px solid rgba(79,142,247,0.2)' }} />
            </Tooltip>
          ) : DASH}
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {customerName ? (
            <Tooltip title={customerName} placement="top" enterDelay={600} arrow>
              <Chip label={customerName} size="small" sx={{ maxWidth: '100%', fontSize: '0.72rem', height: 22, bgcolor: 'rgba(79,142,247,0.1)', color: 'primary.light', border: '1px solid rgba(79,142,247,0.2)' }} />
            </Tooltip>
          ) : DASH}
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, overflow: 'visible' }}>
          {equipmentNames ? (
            <Tooltip title={equipmentNames} placement="top" enterDelay={600} arrow>
              <Chip label={equipmentNames} size="small" sx={{ maxWidth: '100%', fontSize: '0.72rem', height: 22, bgcolor: 'rgba(34,197,94,0.08)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }} />
            </Tooltip>
          ) : DASH}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: "1.25rem",
              letterSpacing: "-0.3px",
            }}
          >
            Locations
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {filteredLocations.length} total locations
          </Typography>
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: { xs: 0, sm: "auto" }, width: { xs: "100%", sm: "auto" } }}
        >
          <TextField
            size="small"
            placeholder="Search locations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  sx={{ fontSize: 16, color: "text.disabled", mr: 0.5 }}
                />
              ),
            }}
            sx={{
              flex: { xs: 1, sm: "none" },
              width: { xs: "auto", sm: 260 },
              '& .MuiOutlinedInput-root': { height: 36, borderRadius: '8px', bgcolor: '#fff' },
            }}
          />
          <AppButton startIcon={<AddIcon />} onClick={handleNew} sx={{ flexShrink: 0 }}>
            New location
          </AppButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: { xs: 1.5, sm: 3 }, py: { xs: 1.5, sm: 2 } }}>
        {groups.map((group) => {
          const rows = locationsByGroup[group.id] || [];
          return (
            <BoardGroup key={group.id} label={group.title} color={group.color || '#6b7280'} count={rows.length}>
              <BoardTable
                columns={LOCATION_COLUMNS}
                rows={rows}
                renderRow={renderLocationRow}
                emptyMessage="No locations"
                minWidth={1590}
              />
            </BoardGroup>
          );
        })}
      </Box>

      {openDialog && (
        <LocationDrawer
          open={true}
          location={openDialog}
          onClose={() => setOpenDialog(null)}
          onSaveNew={async (form) => {
            await dispatch(createLocationThunk(form));
            setOpenDialog(null);
          }}
        />
      )}
    </Box>
  );
}
