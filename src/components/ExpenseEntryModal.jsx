import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Divider,
} from "@mui/material";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import { useState } from "react";

const EXPENSE_TYPES = ["Fuel", "Lodging", "Meals", "Supplies"];

const MOCK_WOS = [
  { id: "11429209991", label: "WO-1354 · Ice Machine Repair" },
  { id: "11429214235", label: "WO — Walk-in Freezer Install" },
  { id: "11433045817", label: "WO — GCO" },
];

function PropertyRow({ label, children }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        alignItems: "start",
        gap: 1.5,
        py: 0.5,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          pt: 1.1,
          color: "text.disabled",
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

export default function ExpenseEntryModal({ open, onClose, onConfirm }) {
  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [workOrder, setWorkOrder] = useState("");

  const isValid =
    expenseType.length > 0 && parseFloat(amount) > 0 && description.trim().length > 0;

  function handleConfirm() {
    onConfirm({
      expenseType,
      amount: parseFloat(amount),
      description,
      workOrderId: workOrder || null,
      date: new Date().toISOString(),
    });
    resetForm();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function resetForm() {
    setExpenseType("");
    setAmount("");
    setDescription("");
    setWorkOrder("");
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 22, color: "text.disabled" }} />
        Add Expense
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <PropertyRow label="Type">
          <FormControl fullWidth size="small">
            <InputLabel>Expense Type</InputLabel>
            <Select
              value={expenseType}
              label="Expense Type"
              onChange={(e) => setExpenseType(e.target.value)}
            >
              {EXPENSE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </PropertyRow>

        <PropertyRow label="Amount">
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
          />
        </PropertyRow>

        <PropertyRow label="Description">
          <TextField
            fullWidth
            size="small"
            placeholder="What was purchased…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </PropertyRow>

        <PropertyRow label="Work Order">
          <FormControl fullWidth size="small">
            <InputLabel>Link to WO (optional)</InputLabel>
            <Select
              value={workOrder}
              label="Link to WO (optional)"
              onChange={(e) => setWorkOrder(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {MOCK_WOS.map((wo) => (
                <MenuItem key={wo.id} value={wo.id}>
                  {wo.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </PropertyRow>

        <Divider sx={{ my: 2 }} />

        {/* Receipt placeholder */}
        <Box
          sx={{
            border: "1.5px dashed #ccc",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
            bgcolor: "#fafafa",
            cursor: "pointer",
            transition: "border-color 0.15s",
            "&:hover": { borderColor: "#1a6ef7" },
          }}
        >
          <AttachFileOutlinedIcon sx={{ fontSize: 28, color: "#ccc", mb: 0.75 }} />
          <Typography variant="body2" sx={{ color: "text.disabled", fontSize: 13 }}>
            Attach receipt photo
          </Typography>
          <Typography variant="caption" sx={{ color: "#bbb" }}>
            (CompanyCam integration — coming soon)
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} sx={{ textTransform: "none", color: "text.secondary" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!isValid}
          onClick={handleConfirm}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Save Expense
        </Button>
      </DialogActions>
    </Dialog>
  );
}
