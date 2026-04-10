import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Stack,
  Chip,
  TextField,
  Button,
  CircularProgress,
  Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import TagIcon from "@mui/icons-material/Tag";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import QrCodeOutlinedIcon from "@mui/icons-material/QrCodeOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import CalendarViewWeekOutlinedIcon from "@mui/icons-material/CalendarViewWeekOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import { LinkedGroup, RecordPill } from "./LinkedRecordItem";

import { 
  MONDAY_COLUMN_IDS, 
  STATUS_OPTIONS, 
  STATUS_HEX,
  PARTS_ORDERED_OPTIONS,
  PARTS_HEX
} from "../constants";
import { updateWorkOrder } from "../store/workOrderSlice";
import {
  linkExistingCustomer,
  createCustomerAndLink,
} from "../store/customersSlice";
import {
  linkExistingLocation,
  createLocationAndLink,
} from "../store/locationsSlice";
import StatusChip from "./StatusChip";
import RelationCell from "./RelationCell";
import CustomerDrawer from "./CustomerDrawer";
import LocationDrawer from "./LocationDrawer";

const WO_EXECUTION_OPTIONS = [
  'In Progress', 
  'Additional Trip Needed (Parts Ordered)', 
  'Additional Trip Needed (Need Parts)', 
  'Additional Trip Needed (Time Only)', 
  'Completed',
  'Cancelled'
];


// ── Helpers ───────────────────────────────────────────────────────────────────

const getCol = (item, colId) =>
  item?.column_values?.find((cv) => cv.id === colId);

const getColText = (item, colId) => {
  const col = getCol(item, colId);
  if (!col) return "";
  return col.display_value || col.label || col.text || "";
};

const getLinkedId = (item, colId) => {
  const ids = getLinkedIds(item, colId);
  return ids.length > 0 ? ids[0] : "";
};

const getLinkedIds = (item, colId) => {
  const col = getCol(item, colId);
  if (!col?.value) return [];
  try {
    const parsed = JSON.parse(col.value);
    const ids = parsed?.item_ids || parsed?.linkedPulseIds || parsed?.linked_item_ids || [];
    return ids.map((idObj) => {
      const id = typeof idObj === "object" ? idObj.linkedPulseId || idObj.id : idObj;
      return String(id);
    });
  } catch {
    return [];
  }
};

const getMultiDay = (item) => {
  const col = getCol(item, MONDAY_COLUMN_IDS.WORK_ORDERS.MULTI_DAY);
  try {
    return col?.value
      ? JSON.parse(col.value)?.checked === true ||
          JSON.parse(col.value)?.checked === "true"
      : false;
  } catch {
    return false;
  }
};

// ── Shared UI components ──────────────────────────────────────────────────────

const Section = ({ children }) => (
  <Typography
    sx={{
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: "#b0ada8",
      px: 1,
      mb: 0.25,
      mt: 0.25,
    }}
  >
    {children}
  </Typography>
);

const PropertyRow = ({ icon: Icon, label, children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "160px 1fr",
      alignItems: "start",
      borderRadius: "4px",
      px: 1,
      py: "7px",
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
      </Typography>
    </Box>
    <Box sx={{ pt: "2px" }}>{children}</Box>
  </Box>
);

const InlineField = ({ value, onChange, placeholder, multiline, rows }) => (
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
        "&::placeholder": { color: "#c1bfbc", opacity: 1 },
      },
      "& .MuiInputBase-inputMultiline": { p: 0 },
    }}
  />
);

const StatusChips = ({ options, hexMap, value, onChange }) => (
  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
    {options.map((opt) => {
      const color = hexMap?.[opt] || STATUS_HEX[opt] || "#6b7280";
      const active = value === opt;
      return (
        <Chip
          key={opt}
          label={opt}
          size="small"
          onClick={() => onChange(active ? "" : opt)}
          sx={{
            fontSize: "0.7rem",
            height: 20,
            fontWeight: 600,
            cursor: "pointer",
            bgcolor: active ? color : "transparent",
            color: active ? "#fff" : "#6b7280",
            border: "1px solid",
            borderColor: active ? color : "#e5e7eb",
            "&:hover": { bgcolor: active ? color : "#f3f4f6" },
            transition: "all 0.1s",
          }}
        />
      );
    })}
  </Stack>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function WorkOrderDetailDrawer({ open, onClose, workOrder }) {
  const dispatch = useDispatch();
  const saving = useSelector((s) => s.workOrders.saving);
  const customers = useSelector(
    (s) => s.customers.board?.items_page?.items || [],
  );
  const locations = useSelector(
    (s) => s.locations.board?.items_page?.items || [],
  );
  const allEquipment = useSelector(
    (s) => s.equipment.board?.items_page?.items || [],
  );

  const [form, setForm] = useState(() => ({
    name: workOrder?.name || "",
    description: getColText(
      workOrder,
      MONDAY_COLUMN_IDS.WORK_ORDERS.DESCRIPTION,
    ),
    status: getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.STATUS),
    scheduledDate: getColText(
      workOrder,
      MONDAY_COLUMN_IDS.WORK_ORDERS.SCHEDULED_DATE,
    ),
    multiDay: getMultiDay(workOrder),
    serviceHistory: getColText(
      workOrder,
      MONDAY_COLUMN_IDS.WORK_ORDERS.SERVICE_HISTORY,
    ),
    workPerformed: getColText(
      workOrder,
      MONDAY_COLUMN_IDS.WORK_ORDERS.WORK_PERFORMED,
    ),
    executionStatus: getColText(
      workOrder,
      MONDAY_COLUMN_IDS.WORK_ORDERS.EXECUTION_STATUS,
    ),
    partsOrdered: getColText(
      workOrder,
      MONDAY_COLUMN_IDS.WORK_ORDERS.PARTS_ORDERED,
    ),
    customerName: getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER),
    customerId: getLinkedId(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.CUSTOMER),
    locationName: getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION),
    locationId: getLinkedId(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.LOCATION),
  }));
  const [pendingNewCustomer, setPendingNewCustomer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const woId = workOrder
    ? getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.WORKORDER_ID)
    : "";
  const model = workOrder
    ? getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.MODEL)
    : "";
  const serialNumber = workOrder
    ? getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.SERIAL_NUMBER)
    : "";
  const equipment = workOrder
    ? getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.EQUIPMENT)
    : "";
  const technician = workOrder
    ? getColText(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.TECHNICIAN)
    : "";

  const handleSave = async () => {
    await dispatch(
      updateWorkOrder({ workOrderId: workOrder.id, form }),
    ).unwrap();
    onClose();
  };

  if (!workOrder) return null;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 520,
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            borderLeft: "1px solid #e8e6e1",
            boxShadow: "-2px 0 20px rgba(0,0,0,0.07)",
          },
        }}
      >
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Box sx={{ flex: 1, mr: 2 }}>
              {woId && (
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#9b9a97",
                    letterSpacing: "0.04em",
                    mb: 0.4,
                    fontFamily: "monospace",
                  }}
                >
                  WO # {woId}
                </Typography>
              )}
              <TextField
                value={form.name || ""}
                onChange={(e) => set("name", e.target.value)}
                variant="standard"
                fullWidth
                placeholder="Work order title"
                sx={{
                  "& .MuiInput-root": {
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "#37352f",
                    "&:before, &:after": { display: "none" },
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: "#c1bfbc",
                    opacity: 1,
                  },
                }}
              />
              <Typography
                sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}
              >
                Work order details
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                borderRadius: "5px",
                color: "#9b9a97",
                "&:hover": { bgcolor: "#f1f1ef", color: "#37352f" },
                flexShrink: 0,
              }}
            >
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "#e8e6e1" }} />

        <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5 }}>
          <Section>Overview</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={PersonOutlineIcon} label="Customer">
              <RelationCell
                value={form.customerName}
                options={customers}
                placeholder="— add customer"
                chipBgColor="rgba(79,142,247,0.1)"
                chipTextColor="primary.light"
                chipBorderColor="rgba(79,142,247,0.2)"
                createLabel="customer"
                onSelectExisting={(id, name) => {
                  set("customerId", id);
                  set("customerName", name);
                  dispatch(
                    linkExistingCustomer({
                      workOrderId: workOrder.id,
                      customerId: id,
                      customerName: name,
                      previousSnapshot: {
                        value: null,
                        text: null,
                        display_value: null,
                      },
                    }),
                  );
                }}
                onCreateNew={(v) => setPendingNewCustomer({ name: v })}
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
                  dispatch(
                    linkExistingLocation({
                      workOrderId: workOrder.id,
                      locationId: id,
                      locationName: name,
                      previousSnapshot: {
                        value: null,
                        text: null,
                        display_value: null,
                      },
                    }),
                  );
                }}
                onCreateNew={(v) => setPendingNewLocation({ name: v })}
              />
            </PropertyRow>
            <PropertyRow icon={VerifiedOutlinedIcon} label="Status">
              <StatusChips
                options={STATUS_OPTIONS}
                hexMap={STATUS_HEX}
                value={form.status}
                onChange={(v) => set("status", v)}
              />
            </PropertyRow>
            <PropertyRow icon={EngineeringOutlinedIcon} label="Technician">
              <Typography
                sx={{
                  fontSize: "0.875rem",
                  color: technician ? "#37352f" : "#c1bfbc",
                }}
              >
                {technician || "—"}
              </Typography>
            </PropertyRow>
            <PropertyRow icon={EventOutlinedIcon} label="Scheduled Date">
              <TextField
                type="date"
                size="small"
                value={form.scheduledDate || ""}
                onChange={(e) => set("scheduledDate", e.target.value)}
                variant="standard"
                InputLabelProps={{ shrink: true }}
                sx={{
                  "& .MuiInput-root": {
                    fontSize: "0.875rem",
                    color: "#37352f",
                    "&:before, &:after": { display: "none" },
                  },
                  "& .MuiInputBase-input": { p: 0, lineHeight: 1.55 },
                }}
              />
            </PropertyRow>
            <PropertyRow icon={CalendarViewWeekOutlinedIcon} label="Multi-Day">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Switch
                  size="small"
                  checked={!!form.multiDay}
                  onChange={(e) => set("multiDay", e.target.checked)}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#4caf50" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      bgcolor: "#4caf50",
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.82rem",
                    color: form.multiDay ? "#4caf50" : "#9b9a97",
                  }}
                >
                  {form.multiDay ? "Yes" : "No"}
                </Typography>
              </Box>
            </PropertyRow>
          </Box>

          <Section>Description of Work</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={NotesOutlinedIcon} label="Description">
              <InlineField
                value={form.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Add description…"
                multiline
                rows={3}
              />
            </PropertyRow>
          </Box>

          {(equipment || model || serialNumber) && (
            <>
              <Section>Equipment</Section>
              <Box sx={{ mb: 2.5 }}>
                {equipment && (
                  <PropertyRow icon={BuildOutlinedIcon} label="Equipment">
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {allEquipment.filter(eq => {
                        const linkedIds = getLinkedIds(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.EQUIPMENT);
                        return linkedIds.includes(String(eq.id));
                      }).map((eq) => (
                        <RecordPill
                          key={eq.id}
                          id={eq.id}
                          type="equipment"
                          name={eq.name}
                          bgColor="rgba(34,197,94,0.1)"
                          textColor="#15803d"
                          borderColor="rgba(34,197,94,0.2)"
                        />
                      ))}
                      {/* Fallback if not found in Redux items yet */}
                      {!allEquipment.some(eq => String(eq.id) === getLinkedId(workOrder, MONDAY_COLUMN_IDS.WORK_ORDERS.EQUIPMENT)) && equipment && (
                         equipment.split(",").map((e, i) => (
                          <Chip
                            key={i}
                            label={e.trim()}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.73rem",
                              bgcolor: "rgba(34,197,94,0.1)",
                              color: "#15803d",
                              border: "1px solid rgba(34,197,94,0.2)",
                              borderRadius: "4px",
                              "& .MuiChip-label": { px: 1 },
                            }}
                          />
                        ))
                      )}
                    </Box>
                  </PropertyRow>
                )}
                {model && (
                  <PropertyRow icon={TagIcon} label="Model">
                    <Typography sx={{ fontSize: "0.875rem", color: "#37352f" }}>
                      {model}
                    </Typography>
                  </PropertyRow>
                )}
                {serialNumber && (
                  <PropertyRow icon={QrCodeOutlinedIcon} label="Serial Number">
                    <Typography
                      sx={{
                        fontSize: "0.875rem",
                        color: "#37352f",
                        fontFamily: "monospace",
                      }}
                    >
                      {serialNumber}
                    </Typography>
                  </PropertyRow>
                )}
              </Box>
            </>
          )}

          <Section>Service</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={HistoryOutlinedIcon} label="Service History">
              <InlineField
                value={form.serviceHistory || ""}
                onChange={(e) => set("serviceHistory", e.target.value)}
                placeholder="Previous service notes…"
                multiline
                rows={3}
              />
            </PropertyRow>
            <PropertyRow icon={HandymanOutlinedIcon} label="Work Performed">
              <InlineField
                value={form.workPerformed || ""}
                onChange={(e) => set("workPerformed", e.target.value)}
                placeholder="Describe work performed…"
                multiline
                rows={3}
              />
            </PropertyRow>
          </Box>

          <Section>Execution</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={VerifiedOutlinedIcon} label="Execution Status">
              <StatusChips
                options={WO_EXECUTION_OPTIONS}
                hexMap={STATUS_HEX}
                value={form.executionStatus}
                onChange={(v) => set("executionStatus", v)}
              />
            </PropertyRow>
            <PropertyRow icon={InventoryOutlinedIcon} label="Parts Ordered">
              <StatusChips
                options={PARTS_ORDERED_OPTIONS}
                hexMap={PARTS_HEX}
                value={form.partsOrdered}
                onChange={(v) => set("partsOrdered", v)}
              />
            </PropertyRow>
          </Box>

          <Divider sx={{ borderColor: '#e8e6e1', my: 2 }} />
          <Section>Linked Records</Section>
          <Stack spacing={2} sx={{ px: 1, mt: 1 }}>
            <LinkedGroup
              icon={PersonOutlineIcon}
              label="Customer"
              iconColor="#4f8ef7"
              items={customers.filter(c => String(c.id) === form.customerId)}
              renderItem={(c) => (
                <RecordPill
                  key={c.id}
                  id={c.id}
                  type="customer"
                  name={c.name}
                  bgColor="#ebf0fd"
                  textColor="#1e40af"
                  borderColor="#c7d7fb"
                />
              )}
            />
            <LinkedGroup
              icon={LocationOnOutlinedIcon}
              label="Location"
              iconColor="#c084fc"
              items={locations.filter(l => String(l.id) === form.locationId)}
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
          </Stack>
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
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#4bb87f",
              }}
            />
            <Typography sx={{ fontSize: "0.71rem", color: "#b0ada8" }}>
              Monday CRM · Synced
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={onClose}
              disabled={saving}
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
              disabled={saving}
              startIcon={
                saving ? <CircularProgress size={14} color="inherit" /> : null
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
              Save changes
            </Button>
          </Box>
        </Box>
      </Drawer>

      <CustomerDrawer
        open={!!pendingNewCustomer}
        customer={
          pendingNewCustomer
            ? {
                id: "__new__",
                name: pendingNewCustomer.name,
                column_values: [],
              }
            : null
        }
        onClose={() => setPendingNewCustomer(null)}
        onSaveNew={async (custForm) => {
          await dispatch(
            createCustomerAndLink({
              form: custForm,
              workOrderId: workOrder.id,
            }),
          );
          setPendingNewCustomer(null);
        }}
      />
      <LocationDrawer
        open={!!pendingNewLocation}
        location={
          pendingNewLocation
            ? {
                id: "__new__",
                name: pendingNewLocation.name,
                column_values: [],
              }
            : null
        }
        onClose={() => setPendingNewLocation(null)}
        onSaveNew={async (locForm) => {
          await dispatch(
            createLocationAndLink({ form: locForm, workOrderId: workOrder.id }),
          );
          setPendingNewLocation(null);
        }}
      />
    </>
  );
}
