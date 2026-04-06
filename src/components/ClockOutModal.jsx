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
  Collapse,
  Divider,
  InputAdornment,
} from "@mui/material";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useState } from "react";

// Expense types matching Monday.com Expenses board dropdown (ids 1-4)
const EXPENSE_TYPES = [
  { key: "fuel",     label: "Fuel"     },
  { key: "lodging",  label: "Lodging"  },
  { key: "meals",    label: "Meals"    },
  { key: "supplies", label: "Supplies" },
];

export default function ClockOutModal({ open, onClose, onConfirm, activeEntry }) {
  const [narrative, setNarrative] = useState("");
  const [location, setLocation] = useState("");
  const [expenseChecks,  setExpenseChecks]  = useState({});
  const [expenseAmounts, setExpenseAmounts] = useState({});
  const [expenseDetails, setExpenseDetails] = useState({});
  const [markComplete, setMarkComplete] = useState(false);

  const isJobEntry = activeEntry?.entryType === "Job";

  const checkedExpenses = EXPENSE_TYPES.filter((e) => expenseChecks[e.key]);
  const hasExpenses = checkedExpenses.length > 0;

  // All checked expenses must have both amount and details filled
  const expensesValid = checkedExpenses.every(
    (e) => (expenseAmounts[e.key] ?? "").toString().trim() !== "" &&
            (expenseDetails[e.key] ?? "").trim() !== ""
  );
  const isValid = narrative.trim().length > 0 && location.trim().length > 0 && expensesValid;

  function toggleExpense(key) {
    setExpenseChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleConfirm() {
    const expenses = checkedExpenses.map((e) => ({
      type:    e.label,
      amount:  parseFloat(expenseAmounts[e.key] || 0),
      details: expenseDetails[e.key] ?? "",
    }));
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
    setLocation("");
    setExpenseChecks({});
    setExpenseAmounts({});
    setExpenseDetails({});
    setMarkComplete(false);
  }

  const clockInLabel = activeEntry?.clockInTime
    ? new Date(activeEntry.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>Clock Out</DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
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
          />
        </Box>

        {/* Location */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 0.5 }}>
            Location / Site <span style={{ color: "#ef4444" }}>*</span>
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="e.g. Customer site, shop, warehouse…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Expenses */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
          <AddCircleOutlineIcon sx={{ fontSize: 18, color: "text.disabled" }} />
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.75rem" }}>
            Log any job expenses? (optional)
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          {EXPENSE_TYPES.map((e) => (
            <FormControlLabel
              key={e.key}
              control={
                <Checkbox
                  size="small"
                  checked={!!expenseChecks[e.key]}
                  onChange={() => toggleExpense(e.key)}
                />
              }
              label={<Typography variant="body2" sx={{ fontSize: 13 }}>{e.label}</Typography>}
              sx={{ mr: 0 }}
            />
          ))}
        </Box>

        <Collapse in={hasExpenses} unmountOnExit>
          <Box
            sx={{
              mt: 1,
              p: 2,
              bgcolor: "#fafafa",
              borderRadius: 2,
              border: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {checkedExpenses.map((e) => (
              <Box key={e.key}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 1 }}>
                  {e.label} <span style={{ color: "#ef4444" }}>*</span>
                </Typography>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500 }}>
                      Amount <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      sx={{ width: 130 }}
                      inputProps={{ min: 0, step: "0.01" }}
                      placeholder="0.00"
                      value={expenseAmounts[e.key] ?? ""}
                      onChange={(ev) =>
                        setExpenseAmounts((prev) => ({ ...prev, [e.key]: ev.target.value }))
                      }
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1, minWidth: 160 }}>
                    <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 500 }}>
                      Expense Details <span style={{ color: "#ef4444" }}>*</span>
                    </Typography>
                    <TextField
                      size="small"
                      placeholder="e.g. Fuel for van"
                      value={expenseDetails[e.key] ?? ""}
                      onChange={(ev) =>
                        setExpenseDetails((prev) => ({ ...prev, [e.key]: ev.target.value }))
                      }
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Collapse>

        {!isValid && (narrative.length > 0 || location.length > 0) && (
          <Typography variant="caption" sx={{ color: "#ef4444", display: "block", mt: 1.5 }}>
            Narrative and location are required before clocking out.
          </Typography>
        )}

        {/* Mark as Complete — only shown for Job entries */}
        {isJobEntry && (
          <>
            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={markComplete}
                  onChange={(e) => setMarkComplete(e.target.checked)}
                  sx={{
                    color: "#22c55e",
                    "&.Mui-checked": { color: "#22c55e" },
                  }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: markComplete ? "#22c55e" : "text.primary" }}>
                    Mark Work Order as Complete
                  </Typography>
                </Box>
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
          disabled={!isValid}
          onClick={handleConfirm}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Clock Out
        </Button>
      </DialogActions>
    </Dialog>
  );
}
