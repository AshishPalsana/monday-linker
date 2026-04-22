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
import { useSnackbar } from "notistack";

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
  min,
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
    inputProps={{ min }}
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
  const { enqueueSnackbar } = useSnackbar();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  const { creating, saving } = useSelector((s) => s.masterCosts);
  const workOrders = useSelector((s) => s.workOrders.board?.items_page?.items || EMPTY_ARRAY);

  const isNew = !costItem?.id || costItem.id === "__new__";
  const [form, setForm] = useState({
    name: "",
    type: "Labor",
    description: "",
    quantity: 1,
    rate: 0,
    date: new Date().toISOString().split("T")[0],
    workOrderId: defaultWorkOrderId || "",
  });
  const [attempted, setAttempted] = useState(false);

  const REQUIRED = [
    { key: "workOrderId", label: "Work Order" },
    { key: "name", label: "Item Name" },
    { key: "description", label: "Description" },
    { key: "quantity", label: "Quantity" },
    { key: "rate", label: "Rate" },
  ];
  const missing = REQUIRED.filter((f) => {
    const v = form[f.key];
    if (f.key === "quantity") return !v || parseFloat(v) <= 0;
    if (f.key === "rate") return v === "" || v === null || parseFloat(v) < 0;
    return !String(v ?? "").trim();
  });
  const isValid = missing.length === 0;
  const err = (k) => attempted && missing.some((f) => f.key === k);

  useEffect(() => {
    if (costItem && !isNew) {
      const getCol = (id) => costItem.column_values?.find(c => c.id === id);
      const relCol = getCol(MC_COL.WORK_ORDERS_REL);
      let existingWoId = defaultWorkOrderId || "";
      if (!existingWoId && relCol) {
        if (Array.isArray(relCol.linked_item_ids) && relCol.linked_item_ids.length > 0) {
          existingWoId = String(relCol.linked_item_ids[0]);
        } else if (relCol.value) {
          try {
            const parsed = JSON.parse(relCol.value);
            const linkedIds = parsed.linkedPulseIds || parsed.item_ids || [];
            existingWoId = String(linkedIds[0]?.linkedPulseId || linkedIds[0]?.id || linkedIds[0] || "");
          } catch (_) {}
        }
      }
      setForm({
        name: costItem.name || "",
        type: getCol(MC_COL.TYPE)?.text || "Labor",
        description: getCol(MC_COL.DESCRIPTION)?.text || "",
        quantity: parseFloat(getCol(MC_COL.QUANTITY)?.text || 1),
        rate: parseFloat(getCol(MC_COL.RATE)?.text || 0),
        date: getCol(MC_COL.DATE)?.text || new Date().toISOString().split("T")[0],
        workOrderId: existingWoId,
      });
    } else {
      setForm(prev => ({ ...prev, workOrderId: defaultWorkOrderId || "" }));
    }
  }, [costItem, isNew, defaultWorkOrderId]);

  const set = (k, v) => {
    if ((k === "quantity" || k === "rate") && v !== "" && parseFloat(v) < 0) return;
    setForm(p => ({ ...p, [k]: v }));
  };

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) return;

    const payload = {
      ...form,
      quantity: parseFloat(form.quantity),
      rate: parseFloat(form.rate),
    };

    try {
      if (isNew) {
        await dispatch(createMasterCost({ payload, token: auth?.token })).unwrap();
        enqueueSnackbar("Cost item created successfully.", { variant: "success" });
      } else {
        await dispatch(updateMasterCost({
          mondayItemId: costItem.id,
          payload,
          token: auth?.token
        })).unwrap();
        enqueueSnackbar("Cost item updated successfully.", { variant: "success" });
      }
      onClose();
    } catch (err) {
      enqueueSnackbar(`Failed to save: ${err?.message || "Unknown error"}`, { variant: "error" });
    }
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

      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5, ...(!isAdmin && { '& .MuiInputBase-root, & .MuiSelect-root, & .MuiSwitch-root, & .MuiCheckbox-root, & .MuiAutocomplete-root, & .MuiButtonBase-root:not(.MuiIconButton-root)': { pointerEvents: 'none' } }) }}>
        {attempted && !isValid && (
          <Box sx={{ mb: 2.5, px: 1.5, py: 1, bgcolor: "#fff3f3", borderRadius: "4px", border: "1px solid #fecaca" }}>
            <Typography sx={{ fontSize: "0.775rem", color: "#eb5757" }}>
              Missing: <strong>{missing.map((f) => f.label).join(", ")}</strong>
            </Typography>
          </Box>
        )}

        <Stack spacing={2}>
          <PropertyRow icon={AssignmentOutlinedIcon} label="Work Order" required error={err("workOrderId")}>
            <Select
              value={form.workOrderId}
              onChange={(e) => set("workOrderId", e.target.value)}
              variant="standard"
              fullWidth
              disabled={!!defaultWorkOrderId}
              sx={{
                fontSize: "0.875rem",
                "& .MuiInput-root:before": { borderBottomColor: err("workOrderId") ? "#eb5757" : undefined },
              }}
            >
              <MenuItem value="">Select Work Order...</MenuItem>
              {workOrders.map(wo => (
                <MenuItem key={wo.id} value={wo.id}>{wo.name}</MenuItem>
              ))}
            </Select>
          </PropertyRow>

          <PropertyRow icon={ReceiptLongIcon} label="Item Name" required error={err("name")}>
            <InlineField
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Labor Hours, New Motor"
              error={err("name")}
            />
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

          <PropertyRow icon={DescriptionOutlinedIcon} label="Description" required error={err("description")}>
            <InlineField
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. 1/2 HP Motor replacement"
              error={err("description")}
            />
          </PropertyRow>

          <PropertyRow icon={NumbersOutlinedIcon} label="Quantity" required error={err("quantity")}>
            <InlineField
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              error={err("quantity")}
            />
          </PropertyRow>

          <PropertyRow icon={AttachMoneyOutlinedIcon} label="Rate" required error={err("rate")}>
            <InlineField
              type="number"
              min={0}
              value={form.rate}
              onChange={(e) => set("rate", e.target.value)}
              error={err("rate")}
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
          onClick={onClose}
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
        {isAdmin && (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={creating || saving}
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
            {creating || saving ? <CircularProgress size={16} sx={{ color: "#fff", mr: 1 }} /> : null}
            {isNew ? "Add Item" : "Save Changes"}
          </Button>
        )}
      </Box>
    </Drawer>
  );
}
