import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { useState, useEffect } from "react";

export default function ExpenseDrawer({ open, onClose, onSave, expenseType, initialData }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(initialData?.amount?.toString() ?? "");
      setDescription(initialData?.description ?? "");
    }
  }, [open, initialData]);

  const isValid = parseFloat(amount) > 0 && description.trim().length > 0;

  function handleSave() {
    onSave({ amount: parseFloat(amount), description: description.trim() });
    reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function reset() {
    setAmount("");
    setDescription("");
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { width: 360, p: 3, display: "flex", flexDirection: "column" } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 20, color: "text.disabled", mr: 1 }} />
        <Typography variant="subtitle1" fontWeight={700} flex={1}>
          {expenseType} Expense
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 0.5 }}>
        Amount <span style={{ color: "#ef4444" }}>*</span>
      </Typography>
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
        sx={{ mb: 2.5 }}
      />

      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mb: 0.5 }}>
        Description <span style={{ color: "#ef4444" }}>*</span>
      </Typography>
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={3}
        placeholder={`Describe the ${expenseType?.toLowerCase()} expense…`}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: "flex", gap: 1.5, mt: "auto" }}>
        <Button
          fullWidth
          onClick={handleClose}
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Cancel
        </Button>
        <Button
          fullWidth
          variant="contained"
          disabled={!isValid}
          onClick={handleSave}
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
        >
          Save
        </Button>
      </Box>
    </Drawer>
  );
}
