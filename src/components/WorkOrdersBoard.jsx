import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWorkOrders } from "../store/workOrderSlice";
import { fetchCustomers } from "../store/customersSlice";
import { fetchLocations } from "../store/locationsSlice";
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
  Avatar,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  Divider,
  Badge,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import { MONDAY_COLUMN_IDS } from "../constants";
import StatusChip from "./StatusChip";

const GROUP_LABELS = {
  random: "Random Stuff",
  active: "Active Work Orders",
  completed: "Completed WO",
};
const GROUP_COLORS = {
  random: "#a855f7",
  active: "#4f8ef7",
  completed: "#22c55e",
};

export default function WorkOrdersBoard({ createCustomer, createLocation }) {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((state) => state.workOrders);
  const customers = useSelector(
    (state) => state.customers.board?.items_page?.items || [],
  );
  const locations = useSelector(
    (state) => state.locations.board?.items_page?.items || [],
  );
  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchWorkOrders());
    dispatch(fetchCustomers());
    dispatch(fetchLocations());
  }, [dispatch]);

  // Build ID-to-name maps for customers and locations
  const customerIdToName = customers.reduce((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});
  const locationIdToName = locations.reduce((acc, l) => {
    acc[l.id] = l.name;
    return acc;
  }, {});

  // Helper: Get value for a column, with special handling for board_relation
  const getColumnValue = (item, colId) => {
    const col = item.column_values.find((cv) => cv.id === colId);
    if (!col) return "";
    // Customers & Locations (Board Relations)
    if (
      colId === MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER ||
      colId === MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION
    ) {
      if (col.value) {
        try {
          const parsed = JSON.parse(col.value);
          const pulseIds =
            parsed?.linkedPulseIds || parsed?.linked_item_ids || [];
          if (Array.isArray(pulseIds) && pulseIds.length > 0) {
            const idToNameMap =
              colId === MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER
                ? customerIdToName
                : locationIdToName;
            return pulseIds
              .map((p) => {
                const id = typeof p === "object" ? p.linkedPulseId || p.id : p;
                return idToNameMap[id] || id;
              })
              .join(", ");
          }
        } catch (e) {
          /* ignore */
        }
      }
      return col.display_value || col.text || "";
    }
    // Default: use .label or .text
    return col.label || col.text || "";
  };

  // Parse customers, locations, technicians from board data if available
  // For now, only work orders are available from API; customers/locations may need separate boards or relations
  // We'll focus on rendering work orders with available columns

  if (loading) return (
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
  if (error) return <div>Error: {error}</div>;
  if (!board) return null;
  // ...existing code...

  // Map Monday groups to local group keys
  const groups = board.groups.map((g) => g.id);
  const groupLabels = Object.fromEntries(
    board.groups.map((g) => [g.id, g.title]),
  );

  // Filter work orders by search
  const filteredItems = board.items_page.items.filter(
    (item) => !search || item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const itemsByGroup = (groupId) =>
    filteredItems.filter((item) => item.group.id === groupId);

  // New work order and update handlers would require API mutation (not implemented here)
  // For now, disable add/edit

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
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
            Work Orders
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {board.items_page.items.length} total
          </Typography>
        </Box>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}
        >
          <TextField
            size="small"
            placeholder="Search work orders…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon
                  sx={{ fontSize: 16, color: "text.disabled", mr: 0.5 }}
                />
              ),
            }}
            sx={{ width: 220 }}
          />
          {/* Disabled add for now, as API mutation is not implemented */}
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

      {/* Table */}
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {groups.map((groupId) => {
          const rows = itemsByGroup(groupId);
          const title = (groupLabels[groupId] || "").toLowerCase();
          const color = title.includes("random")
            ? GROUP_COLORS.random
            : title.includes("active")
              ? GROUP_COLORS.active
              : title.includes("completed")
                ? GROUP_COLORS.completed
                : "#4f8ef7";

          return (
            <Box key={groupId} sx={{ mb: 4 }}>
              {/* Group header */}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "3px",
                    bgcolor: color,
                  }}
                />
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: color,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                  }}
                >
                  {groupLabels[groupId]}
                </Typography>
                <Chip
                  label={rows.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: color + "22",
                    color: color,
                    border: `1px solid ${color}44`,
                  }}
                />
              </Box>

              <Paper
                elevation={0}
                sx={{
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
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
                            sx={{
                              textAlign: "center",
                              py: 4,
                              color: "text.disabled",
                            }}
                          >
                            No work orders in this group
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((item) => (
                          <TableRow
                            key={item.id}
                            hover
                            sx={{ cursor: "pointer" }}
                          >
                            {/* Work order name */}
                            <TableCell>{item.name}</TableCell>
                            {/* Customers cell */}
                            <TableCell>
                              <CustomerCell
                                customer={getColumnValue(
                                  item,
                                  MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER,
                                )}
                                wo={item}
                                createCustomer={createCustomer}
                                onUpdate={() => {}}
                                onClick={() => setOpenDialog(item)}
                              />
                            </TableCell>
                            {/* Locations: show dash if empty, else value */}
                            <TableCell>
                              <LocationCell
                                location={getColumnValue(
                                  item,
                                  MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION,
                                )}
                                wo={item}
                                createLocation={createLocation}
                                onUpdate={() => {}}
                                onClick={() => setOpenDialog(item)}
                              />
                            </TableCell>
                            {/* Description of Work: show dash if empty, else value */}
                            <TableCell onClick={() => setOpenDialog(item)}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.75rem" }}
                              >
                                {getColumnValue(
                                  item,
                                  MONDAY_COLUMN_IDS.WORK_ORDERS.DESCRIPTION,
                                ) || "-"}
                              </Typography>
                            </TableCell>
                            {/* Status: show dash if empty, else value, and color if possible */}
                            <TableCell>
                              {(() => {
                                const status = getColumnValue(
                                  item,
                                  MONDAY_COLUMN_IDS.WORK_ORDERS.STATUS,
                                );
                                return status ? (
                                  <StatusChip status={status} />
                                ) : (
                                  "-"
                                );
                              })()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Inline Customer Cell with autocomplete + create
function CustomerCell({ customer, wo, createCustomer, onUpdate, onClick }) {
  const [editing, setEditing] = useState(false);
  const customers = useSelector(
    (state) => state.customers.board?.items_page?.items || [],
  );

  if (!editing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        onClick={onClick}
      >
        {customer ? (
          <Chip
            label={customer.name || customer}
            size="small"
            sx={{
              maxWidth: 130,
              fontSize: "0.72rem",
              height: 22,
              bgcolor: "rgba(79,142,247,0.1)",
              color: "primary.light",
              border: "1px solid rgba(79,142,247,0.2)",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          />
        ) : (
          <Box
            sx={{
              color: "text.disabled",
              fontSize: "0.75rem",
              cursor: "pointer",
              "&:hover": { color: "primary.main" },
              px: 0.5,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            — add customer
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box onClick={onClick}>
      <Autocomplete
        size="small"
        open
        autoFocus
        options={customers}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        filterOptions={(options, { inputValue }) => {
          const filtered = options.filter((o) =>
            o.name.toLowerCase().includes(inputValue.toLowerCase()),
          );
          if (
            inputValue &&
            !filtered.some(
              (o) => o.name.toLowerCase() === inputValue.toLowerCase(),
            )
          ) {
            filtered.push({
              id: "__new__",
              name: `Add "${inputValue}" as new customer`,
              inputValue,
            });
          }
          return filtered;
        }}
        onChange={(_, val) => {
          if (!val) {
            setEditing(false);
            return;
          }
          if (val.id === "__new__") {
            createCustomer(val.inputValue, wo.id);
          } else {
            onUpdate(wo.id, { customerId: val.id });
          }
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
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
              sx={{
                fontSize: "0.8rem",
                ...(option.id === "__new__"
                  ? { color: "primary.main", fontWeight: 600 }
                  : {}),
              }}
            >
              {option.id === "__new__" ? `+ ${option.name}` : option.name}
            </Box>
          );
        }}
        sx={{ width: 220 }}
      />
    </Box>
  );
}

// Inline Location Cell with autocomplete + create
function LocationCell({ location, wo, createLocation, onUpdate, onClick }) {
  const [editing, setEditing] = useState(false);
  const locations = useSelector(
    (state) => state.locations.board?.items_page?.items || [],
  );

  if (!editing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        onClick={onClick}
      >
        {location ? (
          <Chip
            label={location.name || location}
            size="small"
            sx={{
              maxWidth: 130,
              fontSize: "0.72rem",
              height: 22,
              bgcolor: "rgba(168,85,247,0.1)",
              color: "#c084fc",
              border: "1px solid rgba(168,85,247,0.2)",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          />
        ) : (
          <Box
            sx={{
              color: "text.disabled",
              fontSize: "0.75rem",
              cursor: "pointer",
              "&:hover": { color: "secondary.main" },
              px: 0.5,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
          >
            — add location
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box onClick={onClick}>
      <Autocomplete
        size="small"
        open
        autoFocus
        options={locations}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        filterOptions={(options, { inputValue }) => {
          const filtered = options.filter((o) =>
            o.name.toLowerCase().includes(inputValue.toLowerCase()),
          );
          if (
            inputValue &&
            !filtered.some(
              (o) => o.name.toLowerCase() === inputValue.toLowerCase(),
            )
          ) {
            filtered.push({
              id: "__new__",
              name: `Add "${inputValue}" as new location`,
              inputValue,
            });
          }
          return filtered;
        }}
        onChange={(_, val) => {
          if (!val) {
            setEditing(false);
            return;
          }
          if (val.id === "__new__") {
            // Correctly pass customer ID from column values
            const custVal = wo.column_values?.find(
              (cv) => cv.id === "board_relation_mm14ngb2",
            )?.text;
            createLocation(val.inputValue, wo.id, custVal);
          } else {
            onUpdate(wo.id, { locationId: val.id });
          }
          setEditing(false);
        }}
        onBlur={() => setEditing(false)}
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
              sx={{
                fontSize: "0.8rem",
                ...(option.id === "__new__"
                  ? { color: "secondary.main", fontWeight: 600 }
                  : {}),
              }}
            >
              {option.id === "__new__" ? `+ ${option.name}` : option.name}
            </Box>
          );
        }}
        sx={{ width: 200 }}
      />
    </Box>
  );
}
