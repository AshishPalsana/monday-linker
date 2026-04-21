import { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import MarkunreadMailboxOutlinedIcon from "@mui/icons-material/MarkunreadMailboxOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import { MONDAY_COLUMNS } from "../constants/index";
import { updateLocation } from "../store/locationsSlice";
import { LinkedGroup, RecordPill, LinkedTable } from "./LinkedRecordItem";
import { isValidMondayId, parseRelationIds, getColumnDisplayValue } from "../utils/mondayUtils";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const EMPTY_ARRAY = [];

const CUST_COL = MONDAY_COLUMNS.CUSTOMERS;
const LOC_COL = MONDAY_COLUMNS.LOCATIONS;
const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;
const EQ_COL = MONDAY_COLUMNS.EQUIPMENT;

// ─── Sub-components ───────────────────────────────────────────────────────────

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

export default function LocationDrawer({ location, onClose, onSaveNew, open, zIndex }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const canSave = (auth?.technician?.isAdmin ?? false) || !!onSaveNew;
  const { creating: apiCreating, saving: apiSaving } = useSelector(
    (s) => s.locations,
  );
  const allWorkOrders = useSelector(
    (s) => s.workOrders.board?.items_page?.items || EMPTY_ARRAY,
  );
  const allCustomers = useSelector(
    (s) => s.customers.board?.items_page?.items || EMPTY_ARRAY,
  );
  const allEquipment = useSelector(
    (s) => s.equipment.board?.items_page?.items || EMPTY_ARRAY,
  );

  const [isSaving, setIsSaving] = useState(false);

  const isTempId = location?.id && !isValidMondayId(location.id);
  const isNew = !location?.id || location?.id === "__new__" || isTempId;
  const isBusy = apiCreating || apiSaving || isSaving;

  const getCol = (colId) => {
    const col = location?.column_values?.find((cv) => cv.id === colId);
    if (!col) return "";
    if (col.label && col.label.trim()) return col.label;
    if (col.text && col.text.trim()) return col.text;
    return "";
  };

  const [form, setForm] = useState({
    name: location?.name || "",
    streetAddress: getCol(LOC_COL.STREET_ADDRESS),
    city: getCol(LOC_COL.CITY),
    state: getCol(LOC_COL.STATE),
    zip: getCol(LOC_COL.ZIP),
    locationStatus: getCol(LOC_COL.STATUS) || "Active",
    notes: getCol(LOC_COL.NOTES),
  });

  // Sync name from props for new records (e.g. from WorkOrder modal)
  useEffect(() => {
    if (isNew && location?.name) {
      setForm(prev => ({ ...prev, name: location.name }));
    }
  }, [location?.name, isNew]);

  const [attempted, setAttempted] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const REQUIRED = [{ key: "name", label: "Location Name" }];
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
          updateLocation({ locationId: location.id, form }),
        ).unwrap();
        onClose();
      } finally {
        setIsSaving(false);
      }
    }
  };

  const locId = String(location?.id || "");
  const locName = location?.name || "";

  const getLinkedIds = (item, colId) => {
    const col = item?.column_values?.find((cv) => cv.id === colId);
    return parseRelationIds(col?.value);
  };

  const linkedWorkOrders = useMemo(() => {
    if (!locId || isNew) return [];
    return allWorkOrders.filter((wo) => {
      if (getLinkedIds(wo, WO_COL.LOCATION).includes(locId)) return true;
      const col = wo.column_values?.find((cv) => cv.id === WO_COL.LOCATION);
      const txt = col?.display_value || col?.text || "";
      return locName && txt.toLowerCase().includes(locName.toLowerCase());
    });
  }, [locId, locName, allWorkOrders, isNew]);

  const linkedCustomers = useMemo(() => {
    if (!locId || isNew) return [];
    const custIdSet = new Set();
    linkedWorkOrders.forEach((wo) => {
      getLinkedIds(wo, WO_COL.CUSTOMER).forEach((id) => custIdSet.add(id));
      const col = wo.column_values?.find((cv) => cv.id === WO_COL.CUSTOMER);
      const txt = col?.display_value || col?.text || "";
      if (txt) {
        allCustomers
          .filter((c) => txt.toLowerCase().includes(c.name.toLowerCase()))
          .forEach((c) => custIdSet.add(String(c.id)));
      }
    });
    return allCustomers.filter((c) => custIdSet.has(String(c.id)));
  }, [linkedWorkOrders, allCustomers, isNew]);

  const linkedEquipment = useMemo(() => {
    if (!locId || isNew) return [];
    return allEquipment.filter((eq) => {
      if (getLinkedIds(eq, EQ_COL.LOCATION).includes(locId)) return true;
      const col = eq.column_values?.find((cv) => cv.id === EQ_COL.LOCATION);
      const txt = col?.display_value || col?.text || "";
      return locName && txt.toLowerCase().includes(locName.toLowerCase());
    });
  }, [locId, locName, allEquipment, isNew]);

  const getWoStatus = (wo) => {
    const col = wo.column_values?.find((cv) => cv.id === WO_COL.EXECUTION_STATUS);
    return col?.label || col?.text || null;
  };

  const hasLinked =
    linkedWorkOrders.length > 0 ||
    linkedCustomers.length > 0 ||
    linkedEquipment.length > 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      {...(zIndex != null && {
        sx: { zIndex },
        ModalProps: { keepMounted: false },
      })}
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
              {isNew ? "New Location" : form.name || "Edit Location"}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}>
              {isNew ? "Add a new service location" : "Location details"}
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

      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5, pointerEvents: !canSave ? "none" : undefined }}>
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

        <Section>Location</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow
            icon={LocationOnOutlinedIcon}
            label="Location Name"
            required
            error={err("name")}
          >
            <InlineField
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Walmart Store #210"
              error={err("name")}
            />
          </PropertyRow>
        </Box>

        <Section>Address</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={HomeOutlinedIcon} label="Street Address">
            <InlineField
              value={form.streetAddress}
              onChange={(e) => set("streetAddress", e.target.value)}
              placeholder="123 Main St"
            />
          </PropertyRow>
          <PropertyRow icon={LocationCityOutlinedIcon} label="City">
            <InlineField
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="City"
            />
          </PropertyRow>
          <PropertyRow icon={MapOutlinedIcon} label="State">
            <InlineField
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="e.g. CA"
            />
          </PropertyRow>
          <PropertyRow icon={MarkunreadMailboxOutlinedIcon} label="ZIP">
            <InlineField
              value={form.zip}
              onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))}
              placeholder="00000"
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
            />
          </PropertyRow>
        </Box>

        <Section>Notes</Section>
        <Box
          sx={{
            px: 1,
            py: "6px",
            mb: 2,
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
            placeholder="Add a note…"
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
                  { label: "WO-ID",              width: "100px", getValue: (item) => getColumnDisplayValue(item, WO_COL.WORKORDER_ID) },
                  { label: "WORK ORDER",         width: "180px", key: "name" },
                  { label: "CUSTOMER",           width: "160px", getValue: (item) => getColumnDisplayValue(item, WO_COL.CUSTOMER) },
                  { label: "SCHEDULING STATUS",  width: "160px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, WO_COL.STATUS) },
                  { label: "SCHEDULED DATE",     width: "130px", getValue: (item) => getColumnDisplayValue(item, WO_COL.SCHEDULED_DATE) },
                  { label: "PROGRESS STATUS",    width: "160px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, WO_COL.EXECUTION_STATUS) },
                  { label: "DESCRIPTION OF WORK",width: "220px", getValue: (item) => getColumnDisplayValue(item, WO_COL.DESCRIPTION) },
                  { label: "TECHNICIAN",         width: "140px", getValue: (item) => getColumnDisplayValue(item, WO_COL.TECHNICIAN) },
                  { label: "MULTI-DAY",          width: "100px", getValue: (item) => getColumnDisplayValue(item, WO_COL.MULTI_DAY) },
                  { label: "PARTS ORDERED",      width: "130px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, WO_COL.PARTS_ORDERED) },
                  { label: "BILLING STAGE",      width: "140px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, WO_COL.BILLING_STAGE) },
                  { label: "SERVICE HISTORY",    width: "220px", getValue: (item) => getColumnDisplayValue(item, WO_COL.SERVICE_HISTORY) },
                  { label: "WORK PERFORMED",     width: "220px", getValue: (item) => getColumnDisplayValue(item, WO_COL.WORK_PERFORMED) },
                ]}
              />

              <LinkedTable
                icon={PersonOutlineIcon}
                label="Customers"
                iconColor="#22c55e"
                items={linkedCustomers}
                onNavigate={(item) => navigate(`/customers/${item.id}`)}
                columns={[
                  { label: "CUSTOMER NAME",   width: "180px", key: "name" },
                  { label: "EMAIL",           width: "200px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.EMAIL) },
                  { label: "PHONE",           width: "140px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.PHONE) },
                  { label: "ACCOUNT NUMBER",  width: "140px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.ACCOUNT_NUMBER) },
                  { label: "STATUS",          width: "110px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, CUST_COL.STATUS) },
                  { label: "BILLING ADDRESS", width: "220px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.BILLING_ADDRESS) },
                  { label: "BILLING TERMS",    width: "140px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.BILLING_TERMS) },
                  { label: "NOTES",            width: "200px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.NOTES) },
                  { label: "XERO SYNC STATUS", width: "150px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, CUST_COL.XERO_SYNC_STATUS) },
                  { label: "XERO CONTACT ID",  width: "150px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.XERO_CONTACT_ID) },
                  { label: "MASTER COSTS",      width: "160px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.MASTER_COSTS) },
                  { label: "WORK ORDERS",       width: "180px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.WORK_ORDERS_REL) },
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
                  { label: "MANUFACTURER",   width: "150px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.MANUFACTURER) },
                  { label: "MODEL NUMBER",   width: "140px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.MODEL_NUMBER) },
                  { label: "SERIAL #",       width: "140px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.SERIAL_NUMBER) },
                  { label: "INSTALL DATE",   width: "130px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.INSTALL_DATE) },
                  { label: "STATUS",         width: "130px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, EQ_COL.STATUS) },
                  { label: "NOTES",          width: "200px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.NOTES) },
                  { label: "CUSTOMERS",      width: "160px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.CUSTOMERS_REL) },
                  { label: "WORK ORDERS",    width: "180px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.WORK_ORDERS_REL) },
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
              No linked work orders, customers, or equipment yet.
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