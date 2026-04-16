import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";
import AttachMoneyOutlinedIcon from "@mui/icons-material/AttachMoneyOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import { MONDAY_COLUMNS, COST_TYPE_OPTIONS, COST_TYPE_HEX } from "../constants/index";
import { createMasterCost, updateMasterCost } from "../store/masterCostsSlice";
import { useAuth } from "../hooks/useAuth";

const EMPTY_ARRAY = [];
const MC_COL = MONDAY_COLUMNS.MASTER_COSTS;

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
        sx={{
          fontSize: "0.8rem",
          color: "#9b9a97",
          fontWeight: 500,
          userSelect: "none",
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: "#eb5757", ml: 0.25 }}>
            *
          </Box>
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

const InlineField = ({
  value,
  onChange,
  placeholder,
  error,
  multiline,
  rows,
  type = "text",
}) => (
  <TextField
    fullWidth
    size="small"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    multiline={multiline}
    rows={rows}
    type={type}
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
        "&::placeholder": { color: error ? "#f5b8b8" : "#c1bfbc", opacity: 1 },
      },
      "& .MuiInputBase-inputMultiline": { p: 0 },
    }}
  />
);

export default function MasterCostDrawer({ open, onClose, costItem, defaultWorkOrderId }) {
  const dispatch = useDispatch();
  const { auth } = useAuth();
  const { creating, saving } = useSelector((s) => s.masterCosts);
  const workOrders = useSelector((s) => s.workOrders.board?.items_page?.items || EMPTY_ARRAY);

  const isNew = !costItem?.id || costItem.id === "__new__";
  const [form, setForm] = useState({
    type: "Labor",
    description: "",
    quantity: 1,
    rate: 0,
    date: new Date().toISOString().split("T")[0],
    workOrderId: defaultWorkOrderId || "",
  });

  useEffect(() => {
    if (costItem && !isNew) {
      const getCol = (id) => costItem.column_values?.find(c => c.id === id);
      setForm({
        type: getCol(MC_COL.TYPE)?.text || "Labor",
        description: getCol(MC_COL.DESCRIPTION)?.text || "",
        quantity: parseFloat(getCol(MC_COL.QUANTITY)?.text || 1),
        rate: parseFloat(getCol(MC_COL.RATE)?.text || 0),
        date: getCol(MC_COL.DATE)?.text || new Date().toISOString().split("T")[0],
        workOrderId: defaultWorkOrderId || "", // Relation is handled differently, usually passed in
      });
    } else {
      setForm(prev => ({ ...prev, workOrderId: defaultWorkOrderId || "" }));
    }
  }, [costItem, isNew, defaultWorkOrderId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const payload = {
      ...form,
      quantity: parseFloat(form.quantity),
      rate: parseFloat(form.rate),
    };

    if (isNew) {
      await dispatch(createMasterCost({ payload, token: auth?.token })).unwrap();
    } else {
      await dispatch(updateMasterCost({ 
        mondayItemId: costItem.id, 
        payload, 
        token: auth?.token 
      })).unwrap();
    }
    onClose();
  };

  const total = (parseFloat(form.quantity || 0) * parseFloat(form.rate || 0)).toFixed(2);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
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
      <Box sx={{ px: 3, pt: 3.5, pb: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography sx={{ fontSize: "1.15rem", fontWeight: 700, color: "#37352f" }}>
              {isNew ? "Add Cost Item" : "Edit Cost Item"}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}>
              Track labor, parts, or expenses for this work order
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#e8e6e1" }} />

      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5 }}>
        <Stack spacing={2}>
          <PropertyRow icon={AssignmentOutlinedIcon} label="Work Order" required>
            <Select
              value={form.workOrderId}
              onChange={(e) => set("workOrderId", e.target.value)}
              variant="standard"
              fullWidth
              disabled={!!defaultWorkOrderId}
              sx={{ fontSize: "0.875rem" }}
            >
              <MenuItem value="">Select Work Order...</MenuItem>
              {workOrders.map(wo => (
                <MenuItem key={wo.id} value={wo.id}>{wo.name}</MenuItem>
              ))}
            </Select>
          </PropertyRow>

          <PropertyRow icon={CategoryOutlinedIcon} label="Type" required>
            <Select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              variant="standard"
              fullWidth
              sx={{ fontSize: "0.875rem" }}
            >
              {COST_TYPE_OPTIONS.map(opt => (
                <MenuItem key={opt} value={opt}>
                  <Box sx={{ 
                    px: 1, py: 0.2, borderRadius: "3px", 
                    bgcolor: `${COST_TYPE_HEX[opt]}15`, color: COST_TYPE_HEX[opt],
                    fontSize: "0.75rem", fontWeight: 600
                  }}>
                    {opt}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </PropertyRow>

          <PropertyRow icon={DescriptionOutlinedIcon} label="Description" required>
            <InlineField
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. 1/2 HP Motor replacement"
            />
          </PropertyRow>

          <PropertyRow icon={NumbersOutlinedIcon} label="Quantity" required>
            <InlineField
              type="number"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
          </PropertyRow>

          <PropertyRow icon={AttachMoneyOutlinedIcon} label="Rate" required>
            <InlineField
              type="number"
              value={form.rate}
              onChange={(e) => set("rate", e.target.value)}
            />
          </PropertyRow>

          <PropertyRow icon={AttachMoneyOutlinedIcon} label="Total Cost">
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "#22c55e" }}>
              ${total}
            </Typography>
          </PropertyRow>

          <PropertyRow icon={EventOutlinedIcon} label="Date">
            <InlineField
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </PropertyRow>
        </Stack>
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: "1px solid #e8e6e1", display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "#787774" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={creating || saving || !form.workOrderId || !form.description}
          sx={{ textTransform: "none", bgcolor: "#2f6feb" }}
        >
          {creating || saving ? <CircularProgress size={20} color="inherit" /> : (isNew ? "Add Item" : "Save Changes")}
        </Button>
      </Box>
    </Drawer>
  );
}
