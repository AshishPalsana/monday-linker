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
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useState, useEffect, useMemo } from "react";
import { formatCSTTime } from "../utils/cstTime";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocations, createLocation } from "../store/locationsSlice";
import ExpenseDrawer from "./ExpenseDrawer";
import LocationDrawer from "./LocationDrawer";

const EXPENSE_TYPES = [
  { key: "fuel", label: "Fuel" },
  { key: "lodging", label: "Lodging" },
  { key: "meals", label: "Meals" },
  { key: "supplies", label: "Supplies" },
];


export default function ClockOutModal({ open, onClose, onConfirm, activeEntry, loading = false }) {
  const dispatch = useDispatch();
  const rawLocations = useSelector((s) => s.locations.board?.items_page?.items);
  const locationsLoading = useSelector((s) => s.locations.loading);

  const locations = useMemo(() => {
    return (rawLocations || []).map((item) => ({ id: item.id, label: item.name }));
  }, [rawLocations]);

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
  const [submitted, setSubmitted] = useState(false);
  const [narrativeTouched, setNarrativeTouched] = useState(false);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  const isJobEntry = activeEntry?.entryType === "Job";
  const isDailyShift = activeEntry?.entryType === "DailyShift";
  const checkedExpenses = EXPENSE_TYPES.filter((e) => expenseChecks[e.key]);
  const expensesValid = checkedExpenses.every((e) => !!expenseData[e.key]);
  const narrativeValid = narrative.trim().length >= 10;
  const narrativeRequired = narrative.trim().length === 0;
  const isValid = isDailyShift
    ? true
    : !narrativeRequired && narrativeValid && location !== null && expensesValid;

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
    setSubmitted(true);
    setNarrativeTouched(true);
    if (!isValid) return;
    if (isDailyShift) {
      onConfirm({ narrative: "", location: null, expenses: [], markComplete: false, clockOutTime: new Date().toISOString() });
      resetForm();
      return;
    }
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
    setSubmitted(false);
    setNarrativeTouched(false);
  }

  const clockInLabel = activeEntry?.clockInTime ? formatCSTTime(activeEntry.clockInTime) : "—";

  const activeDrawerExpense = EXPENSE_TYPES.find((e) => e.key === drawerType);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        PaperProps={{ sx: { borderRadius: "12px", zIndex: 1300 } }}
      >
        {loading && (
          <LinearProgress
            sx={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: "12px 12px 0 0" }}
          />
        )}
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
          {isDailyShift ? "End Shift" : "Clock Out"}
        </DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>

          {/* Active Entry */}
          {activeEntry && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: isDailyShift ? "rgba(124,58,237,0.07)" : "rgba(79,142,247,0.08)",
                borderRadius: 2,
                border: `1px solid ${isDailyShift ? "rgba(124,58,237,0.2)" : "rgba(79,142,247,0.2)"}`,
              }}
            >
              <Typography variant="caption" sx={{ color: isDailyShift ? "#7c3aed" : "#1a6ef7", fontWeight: 600, display: "block" }}>
                {isDailyShift ? "Daily Shift" : "Active Entry"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.primary", mt: 0.25 }}>
                {isDailyShift
                  ? "Daily Attendance"
                  : activeEntry.entryType === "Job"
                    ? activeEntry.workOrder?.label ?? "Work Order"
                    : activeEntry.taskDescription}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                {isDailyShift ? "Clocking out will end your shift and close any active tasks." : `Clocked in at ${clockInLabel}`}
              </Typography>
            </Box>
          )}

          {/* Narrative + Location + Expenses — only for Job / NonJob */}
          {!isDailyShift && (
            <>
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
                  onChange={(e) => {
                    setNarrative(e.target.value);
                    setNarrativeTouched(true);
                  }}
                  error={
                    (submitted && narrativeRequired) ||
                    (narrativeTouched && !narrativeRequired && !narrativeValid)
                  }
                  helperText={
                    submitted && narrativeRequired
                      ? "Work Narrative is required."
                      : narrativeTouched && !narrativeRequired && !narrativeValid
                        ? "Narrative must be at least 10 characters."
                        : " "
                  }
                  FormHelperTextProps={{ sx: { mx: 0 } }}
                />
              </Box>

              {/* Location */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
                  <PlaceOutlinedIcon sx={{ fontSize: 15, color: "text.disabled" }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    Location / Site <span style={{ color: "#ef4444" }}>*</span>
                  </Typography>
                </Box>
                <Autocomplete
                  options={locations}
                  loading={locationsLoading}
                  value={location}
                  onChange={(_, val) => {
                    if (val?.id === "__new__") {
                      setPendingNewLocation({ name: val.inputValue });
                      return;
                    }
                    setLocation(val);
                  }}
                  filterOptions={(opts, { inputValue }) => {
                    const filtered = opts.filter((o) =>
                      (o.label || "").toLowerCase().includes(inputValue.toLowerCase())
                    );
                    if (
                      inputValue &&
                      !filtered.some(
                        (o) => (o.label || "").toLowerCase() === inputValue.toLowerCase()
                      )
                    ) {
                      filtered.push({
                        id: "__new__",
                        label: `Add "${inputValue}" as new location`,
                        inputValue,
                      });
                    }
                    return filtered;
                  }}
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
                        {option.id === "__new__" ? `+ ${option.label}` : option.label}
                      </Box>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search locations…"
                      size="small"
                      error={submitted && location === null}
                      helperText={submitted && location === null ? "Please select a location before clocking out." : " "}
                      FormHelperTextProps={{ sx: { mx: 0 } }}
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

              {submitted && checkedExpenses.length > 0 && !expensesValid && (
                <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mt: 1, ml: 0.5 }}>
                  Please complete details for all selected expenses.
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
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleClose}
            sx={{
              px: 2,
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.85rem",
              color: "#37352f",
              bgcolor: "transparent",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              "&:hover": { bgcolor: "#f1f1ef" },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading}
            sx={{
              px: 2.5,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              bgcolor: "#2383e2",
              borderRadius: "6px",
              boxShadow: "none",
              "&:hover": { bgcolor: "#1a6fba", boxShadow: "none" },
              "&:disabled": { bgcolor: "#e3e2df", color: "#b0ada8" },
            }}
          >
            {loading ? (
              <CircularProgress size={18} sx={{ color: "rgba(255,255,255,0.8)" }} />
            ) : isDailyShift ? "End Shift" : "Clock Out"}
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

      <LocationDrawer
        open={!!pendingNewLocation}
        zIndex={1400}
        location={
          pendingNewLocation
            ? { id: "__new__", name: pendingNewLocation.name, column_values: [] }
            : null
        }
        onClose={() => setPendingNewLocation(null)}
        onSaveNew={async (locForm) => {
          const result = await dispatch(createLocation(locForm)).unwrap();
          setLocation({
            id: result.id,
            label: result.name,
          });
          setPendingNewLocation(null);
        }}
      />
    </>
  );
}
