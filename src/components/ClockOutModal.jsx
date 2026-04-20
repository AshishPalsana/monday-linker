import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  Autocomplete,
  CircularProgress,
  LinearProgress,
} from "@mui/material";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocations } from "../store/locationsSlice";
import ExpenseDrawer from "./ExpenseDrawer";

const EXPENSE_TYPES = [
  { key: "fuel", label: "Fuel" },
  { key: "lodging", label: "Lodging" },
  { key: "meals", label: "Meals" },
  { key: "supplies", label: "Supplies" },
];

export default function ClockOutModal({ open, onClose, onConfirm, activeEntry, loading = false }) {
  const dispatch = useDispatch();
  const rawLocations = useSelector((s) => s.locations.board?.items_page?.items ?? []);
  const locationsLoading = useSelector((s) => s.locations.loading);
  const locations = rawLocations.map((item) => ({ id: item.id, label: item.name }));

  useEffect(() => {
    if (open) dispatch(fetchLocations());
  }, [open, dispatch]);

  const [narrative, setNarrative] = useState("");
  const [location, setLocation] = useState(null);
  const [expenseChecks, setExpenseChecks] = useState({});
  const [expenseData, setExpenseData] = useState({}); // key → { amount, description }
  const [markComplete, setMarkComplete] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState(null);

  const isJobEntry = activeEntry?.entryType === "Job";
  const checkedExpenses = EXPENSE_TYPES.filter((e) => expenseChecks[e.key]);
  const expensesValid = checkedExpenses.every((e) => !!expenseData[e.key]);
  const narrativeValid = narrative.trim().length >= 10;
  const isValid = narrativeValid && location !== null && expensesValid;

  function handleExpenseClick(key) {
    if (expenseChecks[key]) {
      // Uncheck → clear data
      setExpenseChecks((prev) => ({ ...prev, [key]: false }));
      setExpenseData((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      // Check → open drawer
      setDrawerType(key);
      setDrawerOpen(true);
    }
  }

  function handleEditExpense(key) {
    setDrawerType(key);
    setDrawerOpen(true);
  }

  function handleDrawerSave({ amount, description }) {
    setExpenseChecks((prev) => ({ ...prev, [drawerType]: true }));
    setExpenseData((prev) => ({ ...prev, [drawerType]: { amount, description } }));
    setDrawerOpen(false);
    setDrawerType(null);
  }

  function handleDrawerClose() {
    if (!expenseData[drawerType]) {
      setExpenseChecks((prev) => ({ ...prev, [drawerType]: false }));
    }
    setDrawerOpen(false);
    setDrawerType(null);
  }

  function handleConfirm() {
    const expenses = checkedExpenses.map((e) => {
      const { amount, description } = expenseData[e.key] || {};
      return {
        type: e.label, // This must match the dropdown value in Monday
        amount: amount ?? 0,
        description: description ?? "",
      };
    });
    onConfirm({
      narrative,
      location,
      expenses,
      markComplete: isJobEntry ? markComplete : false,
      clockOutTime: new Date().toISOString(),
    });
    resetForm();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function resetForm() {
    setNarrative("");
    setLocation(null);
    setExpenseChecks({});
    setExpenseData({});
    setMarkComplete(false);
    setDrawerOpen(false);
    setDrawerType(null);
  }

  const clockInLabel = activeEntry?.clockInTime
    ? new Date(activeEntry.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  const activeDrawerExpense = EXPENSE_TYPES.find((e) => e.key === drawerType);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "12px" } }}
      >
        {loading && (
          <LinearProgress
            sx={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: "12px 12px 0 0" }}
          />
        )}
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Clock Out</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>

          {/* Active Entry */}
          {activeEntry && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: "rgba(79,142,247,0.08)",
                borderRadius: 2,
                border: "1px solid rgba(79,142,247,0.2)",
              }}
            >
              <Typography variant="caption" sx={{ color: "#1a6ef7", fontWeight: 600, display: "block" }}>
                Active Entry
              </Typography>
              <Typography variant="body2" sx={{ color: "text.primary", mt: 0.25 }}>
                {activeEntry.entryType === "Job"
                  ? activeEntry.workOrder?.label ?? "Work Order"
                  : activeEntry.taskDescription}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                Clocked in at {clockInLabel}
              </Typography>
            </Box>
          )}

          {/* Narrative */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
              <NoteAltOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                Work Narrative <span style={{ color: "#ef4444" }}>*</span>
              </Typography>
            </Box>
            <TextField
              multiline
              minRows={3}
              maxRows={6}
              fullWidth
              size="small"
              placeholder="Describe the work performed…"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              error={narrative.length > 0 && !narrativeValid}
              helperText={
                narrative.length > 0 && !narrativeValid
                  ? `At least 10 characters required (${narrative.trim().length}/10)`
                  : " "
              }
              FormHelperTextProps={{ sx: { mx: 0 } }}
            />
          </Box>

          {/* Location */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 0.5 }}>
              Location / Site <span style={{ color: "#ef4444" }}>*</span>
            </Typography>
            <Autocomplete
              options={locations}
              loading={locationsLoading}
              value={location}
              onChange={(_, val) => setLocation(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search locations…"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {locationsLoading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Expenses */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
            <AddCircleOutlineIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
              Log any job expenses? (optional)
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
            {EXPENSE_TYPES.map((e) => {
              const filled = !!expenseData[e.key];
              const checked = !!expenseChecks[e.key];
              return (
                <Box key={e.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={() => handleExpenseClick(e.key)}
                    sx={
                      filled
                        ? { color: "#22c55e", "&.Mui-checked": { color: "#22c55e" }, p: 0.5 }
                        : { p: 0.5 }
                    }
                  />
                  <Typography
                    variant="body2"
                    onClick={() => handleExpenseClick(e.key)}
                    sx={{
                      fontSize: 13,
                      color: filled ? "#22c55e" : "text.primary",
                      fontWeight: filled ? 600 : 400,
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.label}
                    {filled && (
                      <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 4 }}>
                        · ${expenseData[e.key].amount.toFixed(2)}
                      </span>
                    )}
                  </Typography>
                  {filled && (
                    <IconButton
                      size="small"
                      onClick={() => handleEditExpense(e.key)}
                      sx={{ p: 0.25 }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 13, color: "#22c55e" }} />
                    </IconButton>
                  )}
                </Box>
              );
            })}
          </Box>

          {checkedExpenses.length > 0 && !expensesValid && (
            <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mt: 1 }}>
              Please complete details for all selected expenses.
            </Typography>
          )}

          {!isValid && (narrative.length > 0 || location !== null) && expensesValid && (
            <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mt: 1.5 }}>
              {!narrativeValid && narrative.length > 0
                ? "Narrative must be at least 10 characters."
                : location === null
                  ? "Please select a location before clocking out."
                  : "All required fields must be filled before clocking out."}
            </Typography>
          )}

          {/* Mark as Complete */}
          {isJobEntry && (
            <>
              <Divider sx={{ mt: 2, mb: 1.5 }} />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={markComplete}
                    onChange={(e) => setMarkComplete(e.target.checked)}
                    sx={{ color: "#22c55e", "&.Mui-checked": { color: "#22c55e" } }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: markComplete ? "#22c55e" : "text.primary" }}
                  >
                    Mark Work Order as Complete
                  </Typography>
                }
              />
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleClose} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!isValid || loading}
            onClick={handleConfirm}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, minWidth: 110 }}
          >
            {loading ? (
              <CircularProgress size={18} sx={{ color: "rgba(255,255,255,0.8)" }} />
            ) : (
              "Clock Out"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <ExpenseDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSave={handleDrawerSave}
        expenseType={activeDrawerExpense?.label ?? ""}
        initialData={drawerType ? expenseData[drawerType] : null}
      />
    </>
  );
}
