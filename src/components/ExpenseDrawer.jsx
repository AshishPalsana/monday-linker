import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useState, useEffect } from "react";

const PropertyRow = ({ icon: Icon, label, required, error, children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "152px 1fr",
      alignItems: "start",
      borderRadius: "4px",
      px: 1,
      py: "6px",
      "&:hover": { bgcolor: "#f7f6f3" },
      transition: "background 0.12s",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pt: "3px" }}>
      <Icon sx={{ fontSize: 14, color: "#9b9a97", flexShrink: 0 }} />
      <Typography
        sx={{ fontSize: "0.8rem", color: "#9b9a97", fontWeight: 500, userSelect: "none" }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: "#eb5757", ml: 0.25 }}>*</Box>
        )}
      </Typography>
    </Box>
    <Box>
      {children}
      {error && (
        <Typography sx={{ fontSize: "0.68rem", color: "#eb5757", mt: 0.25 }}>
          Required
        </Typography>
      )}
    </Box>
  </Box>
);

export default function ExpenseDrawer({ open, onClose, onSave, expenseType, initialData }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(initialData?.amount?.toString() ?? "");
      setDescription(initialData?.description ?? "");
      setAttempted(false);
    }
  }, [open, initialData]);

  const REQUIRED = [
    { key: "amount", label: "Amount" },
    { key: "description", label: "Description" },
  ];

  const missing = REQUIRED.filter((f) => {
    if (f.key === "amount") return !(parseFloat(amount) > 0);
    return !description.trim();
  });

  const isValid = missing.length === 0;
  const err = (k) => attempted && missing.some((f) => f.key === k);

  function handleSave() {
    setAttempted(true);
    if (!isValid) return;
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
    setAttempted(false);
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: {
          width: 460,
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #e8e6e1",
          boxShadow: "-2px 0 20px rgba(0,0,0,0.07)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: "1px solid #edece9",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptLongOutlinedIcon sx={{ fontSize: 18, color: "#9b9a97" }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#37352f", lineHeight: 1.3 }}>
              {expenseType} Expense
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}>
              Log an expense for this job
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{ borderRadius: "5px", color: "#9b9a97", "&:hover": { bgcolor: "#f1f1ef", color: "#37352f" } }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5 }}>
        {attempted && !isValid && (
          <Box
            sx={{
              mb: 2.5,
              px: 1.5,
              py: 1,
              bgcolor: "#fff3f3",
              borderRadius: "4px",
              border: "1px solid #fecaca",
            }}
          >
            <Typography sx={{ fontSize: "0.775rem", color: "#eb5757" }}>
              Missing: <strong>{missing.map((f) => f.label).join(", ")}</strong>
            </Typography>
          </Box>
        )}

        <PropertyRow icon={AttachMoneyOutlinedIcon} label="Amount" required error={err("amount")}>
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || parseFloat(v) >= 0) setAmount(v);
            }}
            inputProps={{ min: 0, step: "0.01" }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            variant="standard"
            sx={{
              "& .MuiInput-root": {
                fontSize: "0.875rem",
                color: "#37352f",
                "&:before, &:after": { display: "none" },
              },
              "& .MuiInputBase-input": {
                p: 0,
                lineHeight: 1.55,
                "&::placeholder": { color: err("amount") ? "#f5b8b8" : "#c1bfbc", opacity: 1 },
              },
            }}
          />
        </PropertyRow>

        <PropertyRow icon={DescriptionOutlinedIcon} label="Description" required error={err("description")}>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={3}
            placeholder={`Describe the ${expenseType?.toLowerCase()} expense…`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            variant="standard"
            sx={{
              "& .MuiInput-root": {
                fontSize: "0.875rem",
                color: "#37352f",
                "&:before, &:after": { display: "none" },
              },
              "& .MuiInputBase-input": {
                p: 0,
                lineHeight: 1.55,
                "&::placeholder": { color: "#c1bfbc", opacity: 1 },
              },
              "& .MuiInputBase-inputMultiline": { p: 0 },
            }}
          />
        </PropertyRow>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid #edece9",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1,
          flexShrink: 0,
        }}
      >
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
          onClick={handleSave}
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
          Save
        </Button>
      </Box>
    </Drawer>
  );
}
