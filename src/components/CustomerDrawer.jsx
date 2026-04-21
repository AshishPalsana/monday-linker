import { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
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
import { LinkedGroup, RecordPill, LinkedTable } from "./LinkedRecordItem";
import { isValidMondayId, parseRelationIds, getColumnDisplayValue } from "../utils/mondayUtils";
import { validateEmail, cleanPhoneNumber } from "../utils/validationUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const EMPTY_ARRAY = [];

const CUST_COL = MONDAY_COLUMNS.CUSTOMERS;
const LOC_COL = MONDAY_COLUMNS.LOCATIONS;
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
  inputProps,
}) => (
  <TextField
    fullWidth
    size="small"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    multiline={multiline}
    rows={rows}
    inputProps={inputProps}
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
  const navigate = useNavigate();
  const { auth } = useAuth();
  const canSave = (auth?.technician?.isAdmin ?? false) || !!onSaveNew;

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
    status: getCol(CUST_COL.STATUS) || "Active",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
    billingAddress: getCol(CUST_COL.BILLING_ADDRESS),
    billingTerms: getCol(CUST_COL.BILLING_TERMS),
    xeroContactId: getCol(CUST_COL.XERO_CONTACT_ID),
    xeroSyncStatus: getCol(CUST_COL.XERO_SYNC_STATUS) || "Pending",
    syncErrorMessage: "",
    lastSyncAt: null,
    syncVersion: 0,
    notes: getCol(CUST_COL.NOTES),
  });

  // Sync name from props for new records (e.g. from WorkOrder modal)
  useEffect(() => {
    if (isNew && customer?.name) {
      setForm(prev => ({ ...prev, name: customer.name }));
    }
  }, [customer?.name, isNew]);

  // Fetch structured address from backend if this is an existing customer
  useEffect(() => {
    if (open && customer?.id && customer.id !== "__new__" && isValidMondayId(customer.id)) {
      const fetchStructuredData = async () => {
        try {
          const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001") + "/api";
          const res = await axios.get(`${API_BASE}/customers/${customer.id}`);
          if (res.data.data) {
            const d = res.data.data;
            setForm(prev => ({
              ...prev,
              addressLine1: d.addressLine1 || "",
              addressLine2: d.addressLine2 || "",
              city: d.city || "",
              state: d.state || "",
              zip: d.zip || "",
              country: d.country || "USA",
              billingTerms: d.billingTerms || prev.billingTerms || "",
              xeroSyncStatus: d.xeroSyncStatus || prev.xeroSyncStatus,
              xeroContactId: d.xeroContactId || prev.xeroContactId,
              syncErrorMessage: d.syncErrorMessage || "",
              lastSyncAt: d.lastSyncAt || null,
              syncVersion: d.syncVersion || 0,
            }));
          }
        } catch (err) {
          console.warn("[CustomerDrawer] No structured data found in backend for this customer.");
        }
      };
      fetchStructuredData();
    }
  }, [open, customer?.id]);

  const [attempted, setAttempted] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const REQUIRED = [
    { key: "name", label: "Name" },
    { key: "addressLine1", label: "Address Line 1" },
    { key: "city", label: "City" },
    { key: "country", label: "Country" },
  ];
  const missing = REQUIRED.filter((f) => !form[f.key]?.trim());

  const isEmailValid = !form.email || validateEmail(form.email);
  const isValid = missing.length === 0 && isEmailValid;

  const err = (k) => attempted && !form[k]?.trim();
  const formatErr = (k) => attempted && k === "email" && form.email && !validateEmail(form.email);

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) return;

    // Clean data before saving (trim strings)
    const cleanedForm = Object.keys(form).reduce((acc, key) => {
      acc[key] = typeof form[key] === "string" ? form[key].trim() : form[key];
      return acc;
    }, {});

    if (isNew) {
      if (onSaveNew) {
        setIsSaving(true);
        try {
          await onSaveNew(cleanedForm);
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      setIsSaving(true);
      try {
        await dispatch(
          updateCustomer({ customerId: customer.id, form: cleanedForm }),
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
          width: 600,
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
              {missing.length > 0 ? (
                <>Missing: <strong>{missing.map((f) => f.label).join(", ")}</strong></>
              ) : (
                <><strong>Invalid email format</strong></>
              )}
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
              onChange={(e) => set("email", e.target.value.trim())}
              placeholder="billing@company.com"
              error={err("email") || formatErr("email")}
            />
            {formatErr("email") && (
              <Typography sx={{ fontSize: "0.68rem", color: "#eb5757", mt: -0.25, mb: 0.5 }}>
                Enter a proper email address
              </Typography>
            )}
          </PropertyRow>
          <PropertyRow
            icon={PhoneOutlinedIcon}
            label="Phone"
            required
            error={err("phone")}
          >
            <InlineField
              value={form.phone}
              onChange={(e) => set("phone", cleanPhoneNumber(e.target.value))}
              placeholder="Numbers only"
              error={err("phone")}
            />
          </PropertyRow>
        </Box>

        <Section>Billing Address</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={HomeOutlinedIcon} label="Address Line 1" required error={err("addressLine1")}>
            <InlineField
              value={form.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
              placeholder="e.g. 123 Main St"
              error={err("addressLine1")}
            />
          </PropertyRow>
          <PropertyRow icon={HomeOutlinedIcon} label="Address Line 2">
            <InlineField
              value={form.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
              placeholder="Apt, Suite, etc."
            />
          </PropertyRow>
          <PropertyRow icon={LocationOnOutlinedIcon} label="City" required error={err("city")}>
            <InlineField
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="City"
              error={err("city")}
            />
          </PropertyRow>
          <PropertyRow icon={LocationOnOutlinedIcon} label="State">
            <InlineField
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="State/Province"
            />
          </PropertyRow>
          <PropertyRow icon={TagIcon} label="Postal Code">
            <InlineField
              value={form.zip}
              onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))}
              placeholder="ZIP/Postal Code"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            />
          </PropertyRow>
          <PropertyRow icon={SyncAltIcon} label="Country" required error={err("country")}>
            <InlineField
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="Country"
              error={err("country")}
            />
          </PropertyRow>
        </Box>

        <Section>Payment & Terms</Section>
        <Box sx={{ mb: 3 }}>
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
            <Typography sx={{ fontSize: "0.875rem", color: "#37352f", py: 0.5 }}>
              {form.xeroContactId || "-- Not Synced --"}
            </Typography>
          </PropertyRow>

          <PropertyRow icon={VerifiedOutlinedIcon} label="Status">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <InlineSelect
                disabled
                value={form.xeroSyncStatus}
                onChange={() => { }} // Disabled
                options={XERO_SYNC_STATUSES}
                getStatusColor={(val) => {
                  if (val === "Synced") return { bg: "#d3f8e2", color: "#0d6e48" };
                  if (val === "Failed") return { bg: "#fde8e8", color: "#b91c1c" };
                  if (val === "Pending") return { bg: "#fff4e5", color: "#663c00" };
                  return { bg: "#f1f1ef", color: "#787774" };
                }}
              />
              {form.xeroSyncStatus === "Failed" && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={async () => {
                    const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:3001") + "/api";
                    try {
                      await axios.post(`${API_BASE}/customers/${customer.id}/retry`);
                      set("xeroSyncStatus", "Pending");
                    } catch (e) {
                      console.error("Retry failed");
                    }
                  }}
                  sx={{ height: 24, fontSize: "0.7rem", textTransform: "none" }}
                >
                  Retry
                </Button>
              )}
            </Box>
          </PropertyRow>

          {form.syncErrorMessage && (
            <Box sx={{ ml: 4, mt: 0.5, p: 1, bgcolor: "#fef2f2", borderRadius: 1, border: "1px solid #fee2e2" }}>
              <Typography sx={{ fontSize: "0.75rem", color: "#991b1b" }}>
                <strong>Error:</strong> {form.syncErrorMessage}
              </Typography>
            </Box>
          )}

          {form.lastSyncAt && (
            <Typography sx={{ ml: 4, mt: 0.5, fontSize: "0.65rem", color: "#b0ada8" }}>
              Last Sync: {new Date(form.lastSyncAt).toLocaleString()}
            </Typography>
          )}
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
            <Divider sx={{ borderColor: "#e8e6e1", mb: 2, mt: 1 }} />
            <Section>Linked Records</Section>
            <Stack spacing={2.5} sx={{ mt: 1.5 }}>
              <LinkedTable
                icon={AssignmentOutlinedIcon}
                label="Work Orders"
                iconColor="#4f8ef7"
                items={linkedWorkOrders}
                onNavigate={(item) => navigate(`/workorders/${item.id}`)}
                columns={[
                  { label: "WO-ID", width: "100px", getValue: (item) => getColumnDisplayValue(item, WO_COL.WORKORDER_ID) },
                  { label: "WORK ORDER", width: "180px", key: "name" },
                  { label: "DESCRIPTION OF WORK", width: "200px", getValue: (item) => getColumnDisplayValue(item, WO_COL.DESCRIPTION) },
                  { label: "PROGRESS STATUS", width: "150px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, WO_COL.EXECUTION_STATUS) },
                  { label: "TECHNICIAN", width: "140px", getValue: (item) => getColumnDisplayValue(item, WO_COL.TECHNICIAN) },
                  { label: "MULTI-DAY", width: "100px", getValue: (item) => getColumnDisplayValue(item, WO_COL.MULTI_DAY) },
                  { label: "BILLING STAGE", width: "140px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, WO_COL.BILLING_STAGE) },
                  { label: "SERVICE HISTORY", width: "220px", getValue: (item) => getColumnDisplayValue(item, WO_COL.SERVICE_HISTORY) },
                  { label: "WORK PERFORMED", width: "220px", getValue: (item) => getColumnDisplayValue(item, WO_COL.WORK_PERFORMED) },
                ]}
              />

              <LinkedTable
                icon={LocationOnOutlinedIcon}
                label="Locations"
                iconColor="#c084fc"
                items={linkedLocations}
                onNavigate={(item) => navigate(`/locations/${item.id}`)}
                columns={[
                  { label: "LOCATION NAME", width: "180px", key: "name" },
                  { label: "STREET ADDRESS", width: "200px", getValue: (item) => getColumnDisplayValue(item, LOC_COL.STREET_ADDRESS) },
                  { label: "CITY", width: "140px", getValue: (item) => getColumnDisplayValue(item, LOC_COL.CITY) },
                  { label: "STATE", width: "100px", getValue: (item) => getColumnDisplayValue(item, LOC_COL.STATE) },
                  { label: "ZIP", width: "100px", getValue: (item) => getColumnDisplayValue(item, LOC_COL.ZIP) },
                  { label: "STATUS", width: "110px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, LOC_COL.STATUS) },
                ]}
              />

              <LinkedTable
                icon={ConstructionOutlinedIcon}
                label="Equipment"
                iconColor="#f97316"
                items={linkedEquipment}
                onNavigate={(item) => navigate(`/equipment/${item.id}`)}
                columns={[
                  { label: "EQUIPMENT NAME", width: "180px", key: "name" },
                  { label: "SERIAL #", width: "140px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.SERIAL_NUMBER) },
                  { label: "MANUFACTURER", width: "150px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.MANUFACTURER) },
                  { label: "STATUS", width: "110px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, EQ_COL.STATUS) },
                ]}
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
          disabled={isBusy}
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
        {canSave && (
          <Button
            onClick={handleSave}
            variant="contained"
            disableElevation
            disabled={isBusy}
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
            {isBusy ? <CircularProgress size={16} sx={{ color: "#fff", mr: 1 }} /> : null}
            {isNew ? "Create" : "Save changes"}
          </Button>
        )}
      </Box>
    </Drawer>
  );
}