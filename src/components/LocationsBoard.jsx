import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { fetchLocations } from "../store/locationsSlice";
import { fetchCustomers } from "../store/customersSlice";
import { fetchWorkOrders } from "../store/workOrderSlice";
import StatusChip from "./StatusChip";

export default function LocationsBoard({ data, updateData, createLocation }) {
  const dispatch = useDispatch();
  const {
    board: locBoard,
    loading: locLoading,
    error: locError,
  } = useSelector((state) => state.locations);
  const { board: custBoard } = useSelector((state) => state.customers);
  const { board: woBoard } = useSelector((state) => state.workOrders);

  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchLocations());
    dispatch(fetchCustomers());
    dispatch(fetchWorkOrders());
  }, [dispatch]);

  const getColumnValue = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    if (colId.startsWith("board_relation")) {
      return col.display_value || col.text || "";
    }
    return col.label || col.text || "";
  };

  if (locLoading)
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
  if (locError) return <Box sx={{ p: 3 }}>Error: {locError}</Box>;
  if (!locBoard) return null;

  const allLocations = locBoard.items_page.items;
  const allCustomers = custBoard?.items_page?.items || [];
  const allWorkOrders = woBoard?.items_page?.items || [];

  const activeLocations = allLocations.filter((l) => {
    const status = getColumnValue(l, "status") || "Active";
    return (
      status !== "Inactive" &&
      (!search || l.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const inactiveLocations = allLocations.filter((l) => {
    const status = getColumnValue(l, "status");
    return (
      status === "Inactive" &&
      (!search || l.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleNew = () => {
    const name = prompt("Enter location name:");
    if (name) createLocation(name);
  };
  const handleUpdate = (id, changes) => {
    updateData("locations", (prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...changes } : l)),
    );
  };

  const renderTable = (rows, label, color) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <Box
          sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: color }}
        />
        <Typography
          variant="subtitle2"
          sx={{ color, fontSize: "0.8rem", fontWeight: 700 }}
        >
          {label}
        </Typography>
        <Chip
          label={rows.length}
          size="small"
          sx={{
            height: 18,
            fontSize: "0.65rem",
            fontWeight: 700,
            bgcolor: color + "22",
            color,
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
                <TableCell sx={{ width: "22%" }}>Location Name</TableCell>
                <TableCell sx={{ width: "14%" }}>Street Address</TableCell>
                <TableCell sx={{ width: "10%" }}>City</TableCell>
                <TableCell sx={{ width: "7%" }}>State</TableCell>
                <TableCell sx={{ width: "7%" }}>ZIP</TableCell>
                <TableCell sx={{ width: "9%" }}>Status</TableCell>
                <TableCell sx={{ width: "14%" }}>Customer</TableCell>
                <TableCell sx={{ width: "4%" }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    sx={{ textAlign: "center", py: 4, color: "text.disabled" }}
                  >
                    No locations
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((l) => {
                  const status = getColumnValue(l, "status");
                  const customerName =
                    getColumnValue(l, "board_relation") ||
                    getColumnValue(l, "customer");

                  return (
                    <TableRow
                      key={l.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => setOpenDialog(l)}
                    >
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              bgcolor: "rgba(168,85,247,0.2)",
                              color: "#c084fc",
                            }}
                          >
                            {l.name.slice(0, 2).toUpperCase()}
                          </Avatar>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                          >
                            {l.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {getColumnValue(l, "street_address") || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {getColumnValue(l, "city") || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {getColumnValue(l, "state") || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {getColumnValue(l, "zip") || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {status ? (
                          <StatusChip status={status} />
                        ) : (
                          <span style={{ color: "#4f5a6e" }}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customerName ? (
                          <Chip
                            label={customerName}
                            size="small"
                            sx={{
                              maxWidth: 130,
                              fontSize: "0.72rem",
                              height: 22,
                              bgcolor: "rgba(79,142,247,0.1)",
                              color: "primary.light",
                              border: "1px solid rgba(79,142,247,0.2)",
                            }}
                          />
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.disabled"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={() => setOpenDialog(l)}
                        >
                          <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
              <TableRow
                hover
                sx={{ cursor: "pointer", opacity: 0.5 }}
                onClick={handleNew}
              >
                <TableCell colSpan={10}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "text.disabled",
                    }}
                  >
                    <AddIcon sx={{ fontSize: 14 }} />
                    <Typography variant="caption">Add location name</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );

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
            Locations
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activeLocations.length} active locations
          </Typography>
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}
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
            sx={{ width: 220 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNew}
            size="small"
            sx={{ px: 2 }}
          >
            New location
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {renderTable(activeLocations, "Active Locations", "#a855f7")}
        {renderTable(inactiveLocations, "Inactive Locations", "#6b7280")}
      </Box>

      {openDialog && (
        <LocationDialog
          location={openDialog}
          data={data}
          onClose={() => setOpenDialog(null)}
          onUpdate={handleUpdate}
        />
      )}
    </Box>
  );
}
