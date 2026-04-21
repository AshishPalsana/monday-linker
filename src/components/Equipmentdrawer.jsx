import { useEffect, useMemo, useState } from "react";
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
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";
import QrCodeOutlinedIcon from "@mui/icons-material/QrCodeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { MONDAY_COLUMNS } from "../constants/index";
import { updateEquipment } from "../store/equipmentslice";
import { fetchLocations } from "../store/locationsSlice";
import RelationCell from "./RelationCell";
import LocationDrawer from "./LocationDrawer";
import { LinkedGroup, RecordPill, LinkedTable } from "./LinkedRecordItem";
import { isValidMondayId, parseRelationIds, getColumnDisplayValue } from "../utils/mondayUtils";
import { createLocation } from "../services/monday";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const EQ_COL = MONDAY_COLUMNS.EQUIPMENT;
const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;
const CUST_COL = MONDAY_COLUMNS.CUSTOMERS;

// ── Shared sub-components ─────────────────────────────────────────────────────

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

const InlineField = ({ value, onChange, placeholder, error, type }) => (
  <TextField
    fullWidth
    size="small"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    type={type || "text"}
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

export default function EquipmentDrawer({ equipment, onClose, onSaveNew, open }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const canSave = (auth?.technician?.isAdmin ?? false) || !!onSaveNew;
  const { creating: apiCreating, saving: apiSaving } = useSelector(
    (s) => s.equipment,
  );
  const locations = useSelector(
    (s) => s.locations.board?.items_page?.items || [],
  );
  const allWorkOrders = useSelector(
    (s) => s.workOrders.board?.items_page?.items || [],
  );
  const allCustomers = useSelector(
    (s) => s.customers.board?.items_page?.items || [],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  const isTempId = equipment?.id && !isValidMondayId(equipment.id);
  const isNew = !equipment?.id || equipment?.id === "__new__" || isTempId;
  const isBusy = apiCreating || apiSaving || isSaving;

  const getCol = (colId) => getColumnDisplayValue(equipment, colId);

  const [form, setForm] = useState({
    name: equipment?.name || "",
    manufacturer: getCol(EQ_COL.MANUFACTURER),
    modelNumber: getCol(EQ_COL.MODEL_NUMBER),
    serialNumber: getCol(EQ_COL.SERIAL_NUMBER),
    installDate: getCol(EQ_COL.INSTALL_DATE),
    equipmentStatus: getCol(EQ_COL.STATUS) || "Active",
    notes: getCol(EQ_COL.NOTES),
    locationId: "",
    locationName: getCol(EQ_COL.LOCATION),
  });

  useEffect(() => {
    if (equipment?.column_values) {
      const locCol = equipment.column_values.find(
        (cv) => cv.id === EQ_COL.LOCATION,
      );
      const ids = parseRelationIds(locCol?.value);
      if (ids[0]) setForm((prev) => ({ ...prev, locationId: ids[0] }));
    }
    dispatch(fetchLocations());
  }, [equipment, dispatch]);

  const [attempted, setAttempted] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const REQUIRED = [{ key: "name", label: "Equipment Name" }];
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
          updateEquipment({ equipmentId: equipment.id, form }),
        ).unwrap();
        onClose();
      } finally {
        setIsSaving(false);
      }
    }
  };

  // ── Derive linked records ─────────────────────────────────────────────────
  const eqId = String(equipment?.id || "");
  const eqName = equipment?.name || "";

  const getLinkedIds = (item, colId) => {
    const col = item?.column_values?.find((cv) => cv.id === colId);
    return parseRelationIds(col?.value);
  };

  const linkedWorkOrders = useMemo(() => {
    if (!eqId || isNew) return [];
    return allWorkOrders.filter((wo) => {
      if (getLinkedIds(wo, WO_COL.EQUIPMENTS_REL).includes(eqId)) return true;
      const col = wo.column_values?.find((cv) => cv.id === WO_COL.EQUIPMENTS_REL);
      const txt = col?.display_value || col?.text || "";
      return eqName && txt.toLowerCase().includes(eqName.toLowerCase());
    });
  }, [eqId, eqName, allWorkOrders, isNew]);

  const linkedCustomers = useMemo(() => {
    if (!eqId || isNew) return [];
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
  }, [eqId, linkedWorkOrders, allCustomers, isNew]);

  const getWoStatus = (wo) => {
    const col = wo.column_values?.find((cv) => cv.id === WO_COL.EXECUTION_STATUS);
    return col?.label || col?.text || null;
  };

  const hasLinked = linkedWorkOrders.length > 0 || linkedCustomers.length > 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 500,
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
              {isNew ? "New Equipment" : form.name || "Edit Equipment"}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}>
              {isNew ? "Add a new equipment record" : "Equipment details"}
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

        <Section>Equipment</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow
            icon={ConstructionOutlinedIcon}
            label="Equipment Name"
            required
            error={err("name")}
          >
            <InlineField
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ice Machine"
              error={err("name")}
            />
          </PropertyRow>
          <PropertyRow icon={CategoryOutlinedIcon} label="Manufacturer">
            <InlineField
              value={form.manufacturer}
              onChange={(e) => set("manufacturer", e.target.value)}
              placeholder="e.g. Hoshizaki"
            />
          </PropertyRow>
          <PropertyRow icon={LocationOnOutlinedIcon} label="Location">
            <RelationCell
              value={form.locationName}
              options={locations}
              placeholder="— add location"
              chipBgColor="rgba(168,85,247,0.1)"
              chipTextColor="#c084fc"
              chipBorderColor="rgba(168,85,247,0.2)"
              createLabel="location"
              onSelectExisting={(id, name) => {
                set("locationId", id);
                set("locationName", name);
              }}
              onCreateNew={(name) => setPendingNewLocation({ name })}
            />
          </PropertyRow>
        </Box>

        <Section>Specifications</Section>
        <Box sx={{ mb: 3 }}>
          <PropertyRow icon={NumbersOutlinedIcon} label="Model Number">
            <InlineField
              value={form.modelNumber}
              onChange={(e) => set("modelNumber", e.target.value)}
              placeholder="e.g. T-49-HC"
            />
          </PropertyRow>
          <PropertyRow icon={QrCodeOutlinedIcon} label="Serial Number">
            <InlineField
              value={form.serialNumber}
              onChange={(e) => set("serialNumber", e.target.value)}
              placeholder="e.g. SN-83749203"
            />
          </PropertyRow>
          <PropertyRow icon={CalendarTodayOutlinedIcon} label="Install Date">
            <InlineField
              value={form.installDate}
              onChange={(e) => set("installDate", e.target.value)}
              type="date"
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
                icon={PersonOutlineIcon}
                label="Customers"
                iconColor="#22c55e"
                items={linkedCustomers}
                onNavigate={(item) => navigate(`/customers/${item.id}`)}
                columns={[
                  { label: "CUSTOMER NAME", width: "180px", key: "name" },
                  { label: "EMAIL", width: "200px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.EMAIL) },
                  { label: "PHONE", width: "140px", getValue: (item) => getColumnDisplayValue(item, CUST_COL.PHONE) },
                  { label: "STATUS", width: "110px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, CUST_COL.STATUS) },
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
              No linked work orders or customers yet.
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

      {pendingNewLocation && (
        <LocationDrawer
          open
          location={{ id: "__new__", name: pendingNewLocation.name, column_values: [] }}
          onClose={() => setPendingNewLocation(null)}
          onSaveNew={async (locForm) => {
            const created = await createLocation(locForm);
            set("locationId", created.id);
            set("locationName", created.name);
            setPendingNewLocation(null);
            dispatch(fetchLocations());
          }}
        />
      )}
    </Drawer>
  );
}