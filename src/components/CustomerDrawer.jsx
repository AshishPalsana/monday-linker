import { useMemo, useState } from "react";
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
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import TagIcon from "@mui/icons-material/Tag";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import { MONDAY_COLUMNS } from "../constants/index";
import { updateCustomer } from "../store/customersSlice";
import { LinkedGroup, RecordPill } from "./LinkedRecordItem";
import { isValidMondayId, parseRelationIds } from "../utils/mondayUtils";

const EMPTY_ARRAY = [];

const CUST_COL = MONDAY_COLUMNS.CUSTOMERS;
const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;
const EQ_COL = MONDAY_COLUMNS.EQUIPMENT;

const XERO_SYNC_STATUSES = ["Synced", "Error", "Not Synced"];

// ── Shared mini-components ──────────────────────────────────────────────────

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
}) => (
  <TextField
    fullWidth
    size="small"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    multiline={multiline}
    rows={rows}
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

const InlineSelect = ({
  value,
  onChange,
  options,
  placeholder,
  getStatusColor,
}) => (
  <Select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    displayEmpty
    variant="standard"
    disableUnderline
    MenuProps={{
      PaperProps: {
        sx: {
          mt: 0.5,
          borderRadius: "8px",
          border: "1px solid #e8e6e1",
          "& .MuiList-root": { p: "4px" },
        },
      },
    }}
    sx={{
      fontSize: "0.875rem",
      color: value ? "#37352f" : "#c1bfbc",
      width: "100%",
      "& .MuiSelect-select": {
        p: 0,
        lineHeight: 1.55,
        display: "flex",
        alignItems: "center",
      },
      "& .MuiSvgIcon-root": { fontSize: 15, color: "#9b9a97" },
    }}
    renderValue={(selected) => {
      if (!selected)
        return (
          <em style={{ color: "#c1bfbc", fontStyle: "normal" }}>
            {placeholder || "Select…"}
          </em>
        );
      const colors = getStatusColor ? getStatusColor(selected) : null;
      if (colors)
        return (
          <Box
            sx={{
              px: 1,
              py: "1px",
              borderRadius: "3px",
              bgcolor: colors.bg,
              color: colors.color,
              fontSize: "0.75rem",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {selected}
          </Box>
        );
      return selected;
    }}
  >
    <MenuItem
      value=""
      sx={{
        fontSize: "0.875rem",
        py: "6px",
        borderRadius: "4px",
        mb: "2px",
        color: "#c1bfbc",
      }}
    >
      {placeholder || "None"}
    </MenuItem>
    {options.map((opt) => {
      const colors = getStatusColor ? getStatusColor(opt) : null;
      return (
        <MenuItem
          key={opt}
          value={opt}
          sx={{
            fontSize: "0.875rem",
            py: "6px",
            borderRadius: "4px",
            mb: "2px",
            "&:hover": { bgcolor: "#f1f1ef" },
            "&.Mui-selected": { bgcolor: "#f1f1ef", fontWeight: 600 },
          }}
        >
          {colors ? (
            <Box
              sx={{
                px: 1,
                py: "1px",
                borderRadius: "3px",
                bgcolor: colors.bg,
                color: colors.color,
                fontSize: "0.75rem",
                fontWeight: 500,
              }}
            >
              {opt}
            </Box>
          ) : (
            opt
          )}
        </MenuItem>
      );
    })}
  </Select>
);

const Section = ({ children }) => (
  <Typography
    sx={{
      fontSize: "0.68rem",
      fontWeight: 600,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: "#b0ada8",
      px: 1,
      mb: 0.25,
    }}
  >
    {children}
  </Typography>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerDrawer({ customer, onClose, onSaveNew, open }) {
  const dispatch = useDispatch();

  const { creating: apiCreating, saving: apiSaving } = useSelector(
    (s) => s.customers,
  );
  const allWorkOrders = useSelector(
    (s) => s.workOrders.board?.items_page?.items || EMPTY_ARRAY,
  );
  const allLocations = useSelector(
    (s) => s.locations.board?.items_page?.items || EMPTY_ARRAY,
  );
  const allEquipment = useSelector(
    (s) => s.equipment.board?.items_page?.items || EMPTY_ARRAY,
  );

  const [isSaving, setIsSaving] = useState(false);

  const isTempId = customer?.id && !isValidMondayId(customer.id);
  const isNew = !customer?.id || customer?.id === "__new__" || isTempId;
  const isBusy = apiCreating || apiSaving || isSaving;

  const getCol = (colId) => {
    const col = customer?.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    if (col.text && col.text.trim() !== "") return col.text;
    if (col.label && col.label.trim() !== "") return col.label;
    if (col.value) {
      try {
        const parsed = JSON.parse(col.value);
        if (parsed.email) return parsed.email;
        if (parsed.phone) return parsed.phone;
        if (parsed.text && typeof parsed.text === "string") return parsed.text;
      } catch {
        /* ignore */
      }
    }
    return "";
  };

  const [form, setForm] = useState({
    name: customer?.name || "",
    email: getCol(CUST_COL.EMAIL),
    phone: getCol(CUST_COL.PHONE),
    accountNumber: getCol(CUST_COL.ACCOUNT_NUMBER),
    status: getCol(CUST_COL.STATUS) || "Active",
    billingAddress: getCol(CUST_COL.BILLING_ADDRESS),
    billingTerms: getCol(CUST_COL.BILLING_TERMS),
    xeroContactId: getCol(CUST_COL.XERO_CONTACT_ID),
    xeroSyncStatus: getCol(CUST_COL.XERO_SYNC_STATUS),
    notes: getCol(CUST_COL.NOTES),
  });

  const [attempted, setAttempted] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const REQUIRED = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "billingAddress", label: "Billing Address" },
  ];
  const missing = REQUIRED.filter((f) => !form[f.key]?.trim());
  const isValid = missing.length === 0;
  const err = (k) => attempted && !form[k]?.trim();

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) return;
    if (isNew) {
      if (onSaveNew) {
        setIsSaving(true);
        try {
          await onSaveNew(form);
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      setIsSaving(true);
      try {
        await dispatch(
          updateCustomer({ customerId: customer.id, form }),
        ).unwrap();
        onClose();
      } finally {
        setIsSaving(false);
      }
    }
  };

  const custId = String(customer?.id || "");
  const custName = customer?.name || "";

  const getLinkedIds = (item, colId) => {
    const col = item?.column_values?.find((cv) => cv.id === colId);
    return parseRelationIds(col?.value);
  };

  const linkedWorkOrders = useMemo(() => {
    if (!custId || isNew) return [];
    return allWorkOrders.filter((wo) => {
      if (getLinkedIds(wo, WO_COL.CUSTOMER).includes(custId)) return true;
      const col = wo.column_values?.find((cv) => cv.id === WO_COL.CUSTOMER);
      const displayText = col?.display_value || col?.text || "";
      return (
        custName && displayText.toLowerCase().includes(custName.toLowerCase())
      );
    });
  }, [custId, custName, allWorkOrders, isNew]);

  const linkedLocations = useMemo(() => {
    if (!custId || isNew) return [];
    const locIdSet = new Set();
    linkedWorkOrders.forEach((wo) => {
      getLinkedIds(wo, WO_COL.LOCATION).forEach((id) => locIdSet.add(id));
      const col = wo.column_values?.find((cv) => cv.id === WO_COL.LOCATION);
      const txt = col?.display_value || col?.text || "";
      if (txt) {
        allLocations
          .filter((l) => txt.toLowerCase().includes(l.name.toLowerCase()))
          .forEach((l) => locIdSet.add(String(l.id)));
      }
    });
    return allLocations.filter((l) => locIdSet.has(String(l.id)));
  }, [linkedWorkOrders, allLocations, isNew]);

  const linkedEquipment = useMemo(() => {
    if (!custId || isNew) return [];
    const eqIdSet = new Set();
    linkedWorkOrders.forEach((wo) => {
      getLinkedIds(wo, WO_COL.EQUIPMENTS_REL).forEach((id) => eqIdSet.add(id));
    });
    return allEquipment.filter((eq) => eqIdSet.has(String(eq.id)));
  }, [linkedWorkOrders, allEquipment, isNew]);

  const getWoStatus = (wo) => {
    const col = wo.column_values?.find((cv) => cv.id === WO_COL.EXECUTION_STATUS);
    return col?.label || col?.text || null;
  };

  const hasLinked =
    linkedWorkOrders.length > 0 ||
    linkedLocations.length > 0 ||
    linkedEquipment.length > 0;

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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#37352f",
                lineHeight: 1.3,
              }}
            >
              {isNew ? "New Customer" : form.name || "Edit Customer"}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}>
              {isNew ? "Create a new customer record" : "Customer profile"}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              borderRadius: "5px",
              color: "#9b9a97",
              "&:hover": { bgcolor: "#f1f1ef", color: "#37352f" },
            }}
          >
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#e8e6e1" }} />

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
              Missing:{" "}
              <strong>{missing.map((f) => f.label).join(", ")}</strong>
            </Typography>
          </Box>
        )}

        <Section>Contact</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow
            icon={PersonOutlineIcon}
            label="Name"
            required
            error={err("name")}
          >
            <InlineField
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
              error={err("name")}
            />
          </PropertyRow>
          <PropertyRow
            icon={EmailOutlinedIcon}
            label="Email"
            required
            error={err("email")}
          >
            <InlineField
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="billing@company.com"
              error={err("email")}
            />
          </PropertyRow>
          <PropertyRow
            icon={PhoneOutlinedIcon}
            label="Phone"
            required
            error={err("phone")}
          >
            <InlineField
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(555) 000-0000"
              error={err("phone")}
            />
          </PropertyRow>
          <PropertyRow icon={TagIcon} label="Account No.">
            <InlineField
              value={form.accountNumber}
              onChange={(e) => set("accountNumber", e.target.value)}
              placeholder="ACT-999"
            />
          </PropertyRow>
        </Box>

        <Section>Billing</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow
            icon={HomeOutlinedIcon}
            label="Billing Address"
            required
            error={err("billingAddress")}
          >
            <InlineField
              value={form.billingAddress}
              onChange={(e) => set("billingAddress", e.target.value)}
              placeholder="Street, City, State, ZIP"
              error={err("billingAddress")}
              multiline
              rows={2}
            />
          </PropertyRow>
          <PropertyRow icon={TagIcon} label="Billing Terms">
            <InlineField
              value={form.billingTerms}
              onChange={(e) => set("billingTerms", e.target.value)}
              placeholder="e.g. Net 30"
            />
          </PropertyRow>
        </Box>

        <Section>Xero Integration</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={SyncAltIcon} label="Xero Contact ID">
            <InlineField
              value={form.xeroContactId}
              onChange={(e) => set("xeroContactId", e.target.value)}
              placeholder="e.g. XR-001"
            />
          </PropertyRow>
          <PropertyRow icon={VerifiedOutlinedIcon} label="Xero Sync Status">
            <InlineSelect
              value={form.xeroSyncStatus}
              onChange={(v) => set("xeroSyncStatus", v)}
              options={XERO_SYNC_STATUSES}
              placeholder="Select status…"
              getStatusColor={(val) => {
                if (val === "Synced")
                  return { bg: "#d3f8e2", color: "#0d6e48" };
                if (val === "Error") return { bg: "#fde8e8", color: "#b91c1c" };
                if (val === "Not Synced")
                  return { bg: "#f1f1ef", color: "#787774" };
                return null;
              }}
            />
          </PropertyRow>
        </Box>

        <Section>Notes</Section>
        <Box
          sx={{
            px: 1,
            py: "6px",
            mb: 3,
            borderRadius: "4px",
            "&:hover": { bgcolor: "#f7f6f3" },
          }}
        >
          <TextField
            fullWidth
            multiline
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Add a note for the field team…"
            variant="standard"
            sx={{
              "& .MuiInput-root": {
                fontSize: "0.875rem",
                color: "#37352f",
                "&:before, &:after": { display: "none" },
              },
              "& .MuiInputBase-inputMultiline": { p: 0, lineHeight: 1.65 },
              "& .MuiInputBase-input::placeholder": {
                color: "#c1bfbc",
                opacity: 1,
              },
            }}
          />
        </Box>

        {!isNew && hasLinked && (
          <>
            <Divider sx={{ borderColor: "#e8e6e1", mb: 2 }} />
            <Section>Linked Records</Section>
            <Stack spacing={2} sx={{ px: 1, mt: 1 }}>
              <LinkedGroup
                icon={AssignmentOutlinedIcon}
                label="Work Orders"
                iconColor="#4f8ef7"
                items={linkedWorkOrders}
                renderItem={(wo) => (
                  <RecordPill
                    key={wo.id}
                    id={wo.id}
                    type="workorder"
                    name={wo.name}
                    statusLabel={getWoStatus(wo)}
                    bgColor="#ebf0fd"
                    textColor="#1e40af"
                    borderColor="#c7d7fb"
                  />
                )}
              />

              <LinkedGroup
                icon={LocationOnOutlinedIcon}
                label="Locations"
                iconColor="#c084fc"
                items={linkedLocations}
                renderItem={(l) => (
                  <RecordPill
                    key={l.id}
                    id={l.id}
                    type="location"
                    name={l.name}
                    bgColor="#f3f0ff"
                    textColor="#6d28d9"
                    borderColor="#ddd6fe"
                  />
                )}
              />

              <LinkedGroup
                icon={ConstructionOutlinedIcon}
                label="Equipment"
                iconColor="#f97316"
                items={linkedEquipment}
                renderItem={(eq) => (
                  <RecordPill
                    key={eq.id}
                    id={eq.id}
                    type="equipment"
                    name={eq.name}
                    bgColor="#fff7ed"
                    textColor="#c2410c"
                    borderColor="#fed7aa"
                  />
                )}
              />
            </Stack>
          </>
        )}

        {!isNew && !hasLinked && (
          <Box sx={{ mt: 1, px: 1 }}>
            <Divider sx={{ borderColor: "#e8e6e1", mb: 2 }} />
            <Typography
              sx={{ fontSize: "0.75rem", color: "#c1bfbc", fontStyle: "italic" }}
            >
              No linked work orders, locations, or equipment yet.
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid #e8e6e1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#4bb87f" }}
          />
          <Typography sx={{ fontSize: "0.71rem", color: "#b0ada8" }}>
            Monday CRM · Synced
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={onClose}
            disabled={isBusy}
            sx={{
              px: 2,
              height: 32,
              borderRadius: "4px",
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "#787774",
              textTransform: "none",
              "&:hover": { bgcolor: "#f1f1ef" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disableElevation
            disabled={isBusy}
            startIcon={
              isBusy ? <CircularProgress size={14} color="inherit" /> : null
            }
            sx={{
              px: 2.5,
              height: 32,
              borderRadius: "4px",
              fontSize: "0.82rem",
              fontWeight: 600,
              textTransform: "none",
              bgcolor: "#2f6feb",
              "&:hover": { bgcolor: "#1a56d6" },
              "&:disabled": { bgcolor: "#e3e2df", color: "#b0ada8" },
            }}
          >
            {isNew ? "Create" : "Save changes"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}