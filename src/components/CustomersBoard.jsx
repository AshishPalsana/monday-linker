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
  Tooltip,
  Avatar,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { fetchCustomers } from "../store/customersSlice";
import { MONDAY_COLUMN_IDS } from "../constants";
import StatusChip from "./StatusChip";
import CustomerDrawer from "./CustomerDrawer";

export default function CustomersBoard({ data, updateData, createCustomer }) {
  const dispatch = useDispatch();
  const { board, loading, error } = useSelector((state) => state.customers);
  const [openDialog, setOpenDialog] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const getColumnValue = (item, colId) => {
    const col = item.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";

    if (col.text && col.text.trim() !== "") return col.text;
    if (col.value) {
      try {
        const parsed = JSON.parse(col.value);
        if (parsed.email) return parsed.email;
        if (parsed.phone) return parsed.phone;
        if (parsed.text && typeof parsed.text === "string") return parsed.text;
      } catch {
        try {
          const unwrapped = JSON.parse(col.value);
          if (typeof unwrapped === "string" && unwrapped.trim() !== "")
            return unwrapped;
        } catch {
          // ignore
        }
      }
    }

    return "";
  };

  if (loading)
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
  if (error) return <Box sx={{ p: 3 }}>Error: {error}</Box>;
  if (!board) return null;

  const allItems = board.items_page.items;

  const activeCustomers = allItems.filter((c) => {
    const status =
      getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.STATUS) || "Active";
    return (
      status !== "Inactive" &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const inactiveCustomers = allItems.filter((c) => {
    const status = getColumnValue(c, MONDAY_COLUMN_IDS.CUSTOMERS.STATUS);
    return (
      status === "Inactive" &&
      (!search || c.name.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleNew = () => {
    const name = prompt("Enter customer name:");
    if (name) createCustomer(name);
  };

  const handleUpdate = (id, changes) => {
    updateData("customers", (prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...changes } : c)),
    );
  };

  const renderTable = (rows, label, color) => {
    return (
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
                  <TableCell sx={{ width: "20%" }}>Customer Name</TableCell>
                  <TableCell sx={{ width: "15%" }}>Email</TableCell>
                  <TableCell sx={{ width: "13%" }}>Phone</TableCell>
                  <TableCell sx={{ width: "11%" }}>Account #</TableCell>
                  <TableCell sx={{ width: "9%" }}>Status</TableCell>
                  <TableCell sx={{ width: "16%" }}>Billing Address</TableCell>
                  <TableCell sx={{ width: "9%" }}>Billing Terms</TableCell>
                  <TableCell sx={{ width: "4%" }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{
                        textAlign: "center",
                        py: 4,
                        color: "text.disabled",
                      }}
                    >
                      No customers
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => {
                    const status = getColumnValue(
                      c,
                      MONDAY_COLUMN_IDS.CUSTOMERS.STATUS,
                    );
                    return (
                      <TableRow
                        key={c.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => setOpenDialog(c)}
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
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: "rgba(79,142,247,0.2)",
                                color: "primary.light",
                              }}
                            >
                              {c.name?.slice(0, 2).toUpperCase() || "??"}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                            >
                              {c.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            {getColumnValue(
                              c,
                              MONDAY_COLUMN_IDS.CUSTOMERS.EMAIL,
                            ) || <span style={{ color: "#4f5a6e" }}>—</span>}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            {getColumnValue(
                              c,
                              MONDAY_COLUMN_IDS.CUSTOMERS.PHONE,
                            ) || <span style={{ color: "#4f5a6e" }}>—</span>}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            {getColumnValue(
                              c,
                              MONDAY_COLUMN_IDS.CUSTOMERS.ACCOUNT_NUMBER,
                            ) || <span style={{ color: "#4f5a6e" }}>—</span>}
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
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: "0.75rem",
                              maxWidth: 160,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {getColumnValue(
                              c,
                              MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_ADDRESS,
                            ) || <span style={{ color: "#4f5a6e" }}>—</span>}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: "0.75rem" }}
                          >
                            {getColumnValue(
                              c,
                              MONDAY_COLUMN_IDS.CUSTOMERS.BILLING_TERMS,
                            ) || <span style={{ color: "#4f5a6e" }}>—</span>}
                          </Typography>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            onClick={() => setOpenDialog(c)}
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
                  <TableCell colSpan={9}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: "text.disabled",
                      }}
                    >
                      <AddIcon sx={{ fontSize: 14 }} />
                      <Typography variant="caption">
                        Add customer name
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
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
            Customers
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activeCustomers.length} active customers
          </Typography>
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: "auto" }}
        >
          <TextField
            size="small"
            placeholder="Search customers…"
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
            New customer
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {renderTable(activeCustomers, "Active Customers", "#4f8ef7")}
        {renderTable(inactiveCustomers, "Inactive Customers", "#6b7280")}
      </Box>

      {openDialog && (
        <CustomerDrawer
          open={true}
          customer={openDialog}
          data={data}
          onClose={() => setOpenDialog(null)}
          onUpdate={handleUpdate}
        />
      )}
    </Box>
  );
}
