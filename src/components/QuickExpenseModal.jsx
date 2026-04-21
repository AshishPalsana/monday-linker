import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton
} from "@mui/material";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import HotelIcon from "@mui/icons-material/Hotel";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import BuildIcon from "@mui/icons-material/Build";
import { useState } from "react";

const EXPENSE_TYPES = [
  { key: "Fuel", icon: <LocalGasStationIcon sx={{ fontSize: 18 }} /> },
  { key: "Lodging", icon: <HotelIcon sx={{ fontSize: 18 }} /> },
  { key: "Meals", icon: <RestaurantIcon sx={{ fontSize: 18 }} /> },
  { key: "Supplies", icon: <BuildIcon sx={{ fontSize: 18 }} /> },
];

export default function QuickExpenseModal({ open, onClose, onConfirm, jobLabel }) {
  const [type, setType] = useState("Fuel");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const isValid = parseFloat(amount) > 0 && description.trim().length > 0;

  function handleConfirm() {
    onConfirm({
      type,
      amount: parseFloat(amount),
      description: description.trim(),
      date: new Date().toISOString(),
    });
    reset();
    onClose();
  }

  function reset() {
    setType("Fuel");
    setAmount("");
    setDescription("");
  }

  return (
    <Dialog 
      open={open} 
      onClose={() => { reset(); onClose(); }} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Add Expense</DialogTitle>
      <DialogContent>
        <Typography variant="caption" sx={{ color: "text.disabled", mb: 2, display: "block" }}>
          Linking to: <strong>{jobLabel}</strong>
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "text.secondary" }}>
            TYPE
          </Typography>
          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, val) => val && setType(val)}
            fullWidth
            size="small"
            sx={{ gap: 1, "& .MuiToggleButton-root": { border: "1px solid #eee", borderRadius: "8px !important", px: 1 } }}
          >
            {EXPENSE_TYPES.map((e) => (
              <ToggleButton key={e.key} value={e.key} sx={{ flex: 1, flexDirection: "column", gap: 0.5, py: 1 }}>
                {e.icon}
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700 }}>{e.key}</Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "text.secondary" }}>
            AMOUNT
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
              sx: { fontWeight: 700, fontSize: "1.1rem" }
            }}
          />
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block", color: "text.secondary" }}>
            DESCRIPTION
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="What was this for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={() => { reset(); onClose(); }} sx={{ color: "text.secondary" }}>Cancel</Button>
        <Button 
          variant="contained" 
          disabled={!isValid} 
          onClick={handleConfirm}
          sx={{ bgcolor: "#7c3aed", borderRadius: "8px", px: 3, fontWeight: 700 }}
        >
          Add Expense
        </Button>
      </DialogActions>
    </Dialog>
  );
}
