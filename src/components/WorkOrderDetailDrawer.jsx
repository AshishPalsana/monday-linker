import { useState, useEffect, useMemo } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import LockIcon from "@mui/icons-material/Lock";
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
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import SubtitlesOutlinedIcon from "@mui/icons-material/SubtitlesOutlined";
import { LinkedGroup, RecordPill, LinkedTable } from "./LinkedRecordItem";
import { useNavigate } from "react-router-dom";

const EMPTY_ARRAY = [];

import {
  MONDAY_COLUMNS,
  SCHEDULING_STATUS_OPTIONS,
  STATUS_HEX,
  VALIDATION_STATUSES,
  BILLING_STAGE_OPTIONS,
  BILLING_STAGE_HEX,
  COST_TYPE_HEX,
  PARTS_HEX,
} from "../constants/index";
import { updateWorkOrder, fetchWorkOrders } from "../store/workOrderSlice";
import { fetchMasterCosts } from "../store/masterCostsSlice";
import { useAuth } from "../hooks/useAuth";
import MasterCostDrawer from "./MasterCostDrawer";
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
import FileCell from "./FileCell";
import CustomerDrawer from "./CustomerDrawer";
import LocationDrawer from "./LocationDrawer";
import {
  getColumnDisplayValue,
  getColumnSnapshot,
  parseRelationIds,
} from "../utils/mondayUtils";
import { integrationApi } from "../services/integrationApi";
import { workOrderApi } from "../services/api";
import { useSnackbar } from "notistack";

const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;
const EQ_COL = MONDAY_COLUMNS.EQUIPMENT;
const WO_EXECUTION_OPTIONS = VALIDATION_STATUSES.EXECUTION;
const PARTS_ORDERED_OPTIONS = VALIDATION_STATUSES.PARTS_ORDERED;


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
  const navigate = useNavigate();
  const saving = useSelector((s) => s.workOrders.saving);
  const customers = useSelector(
    (s) => s.customers.board?.items_page?.items || EMPTY_ARRAY,
  );
  const locations = useSelector(
    (s) => s.locations.board?.items_page?.items || EMPTY_ARRAY,
  );
  const allEquipment = useSelector(
    (s) => s.equipment.board?.items_page?.items || EMPTY_ARRAY,
  );

  const [form, setForm] = useState(() => ({
    name: workOrder?.name || "",
    description: getColumnDisplayValue(workOrder, WO_COL.DESCRIPTION),
    status: getColumnDisplayValue(workOrder, WO_COL.STATUS),
    scheduledDate: getColumnDisplayValue(workOrder, WO_COL.SCHEDULED_DATE),
    multiDay: getColumnDisplayValue(workOrder, WO_COL.MULTI_DAY) === "Yes",
    serviceHistory: getColumnDisplayValue(workOrder, WO_COL.SERVICE_HISTORY),
    workPerformed: getColumnDisplayValue(workOrder, WO_COL.WORK_PERFORMED),
    executionStatus: getColumnDisplayValue(workOrder, WO_COL.EXECUTION_STATUS),
    partsOrdered: getColumnDisplayValue(workOrder, WO_COL.PARTS_ORDERED),
    billingStage: getColumnDisplayValue(workOrder, WO_COL.BILLING_STAGE),
    customerName: getColumnDisplayValue(workOrder, WO_COL.CUSTOMER),
    customerId: parseRelationIds(
      workOrder?.column_values?.find((cv) => cv.id === WO_COL.CUSTOMER)?.value,
    )[0],
    locationName: getColumnDisplayValue(workOrder, WO_COL.LOCATION),
    locationId: parseRelationIds(
      workOrder?.column_values?.find((cv) => cv.id === WO_COL.LOCATION)?.value,
    )[0],
    photos: getColumnDisplayValue(workOrder, WO_COL.PHOTOS_DOCUMENTS),
    mirror: getColumnDisplayValue(workOrder, WO_COL.MIRROR),
  }));

  const { enqueueSnackbar } = useSnackbar();
  const isLocked = form.billingStage === "Sent to Xero" || workOrder?.isLocked;
  const [promoting, setPromoting] = useState(false);

  const { auth } = useAuth();
  const isAdmin = auth?.technician?.isAdmin ?? false;
  const allCostsRaw = useSelector((s) => s.masterCosts.items);
  const costsLoading = useSelector((s) => s.masterCosts.loading);
  const allCosts = useMemo(() => {
    if (!workOrder?.id) return allCostsRaw;
    return allCostsRaw.filter((cost) => {
      const relCol = cost.column_values?.find(
        (c) => c.id === MONDAY_COLUMNS.MASTER_COSTS.WORK_ORDERS_REL,
      );
      if (!relCol) return false;
      if (Array.isArray(relCol.linked_item_ids) && relCol.linked_item_ids.length > 0) {
        return relCol.linked_item_ids.map(String).includes(String(workOrder.id));
      }
      if (relCol.value) {
        try {
          const parsed = JSON.parse(relCol.value);
          const linkedIds = parsed.linkedPulseIds || parsed.item_ids || [];
          return linkedIds.some(
            (id) => String(id?.linkedPulseId || id?.id || id) === String(workOrder.id),
          );
        } catch (_) {}
      }
      return false;
    });
  }, [allCostsRaw, workOrder?.id]);
  const [costDrawerOpen, setCostDrawerOpen] = useState(false);
  const [editingCost, setEditingCost] = useState(null);

  useEffect(() => {
    if (open && workOrder?.id) {
      dispatch(fetchMasterCosts({ workOrderId: workOrder.id, token: auth?.token }));
    }
  }, [open, workOrder?.id, dispatch, auth?.token]);

  const totalCost = useMemo(() => {
    return allCosts.reduce((sum, cost) => {
      const val = cost.column_values?.find(c => c.id === MONDAY_COLUMNS.MASTER_COSTS.TOTAL_COST)?.text || 0;
      return sum + parseFloat(val);
    }, 0);
  }, [allCosts]);

  const [pendingNewCustomer, setPendingNewCustomer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  // ── Xero Project sync status ─────────────────────────────────────────────
  const [xeroSync, setXeroSync] = useState(null);   // null = loading, object = result
  const [xeroLoading, setXeroLoading] = useState(false);
  const [xeroRetrying, setXeroRetrying] = useState(false);

  useEffect(() => {
    if (!open || !workOrder?.id) return;
    let cancelled = false;
    setXeroSync(null);
    setXeroLoading(true);
    integrationApi
      .getXeroSyncStatus(workOrder.id)
      .then((data) => { if (!cancelled) setXeroSync(data); })
      .catch(() => { if (!cancelled) setXeroSync({ synced: false, error: "Could not fetch Xero status" }); })
      .finally(() => { if (!cancelled) setXeroLoading(false); });
    return () => { cancelled = true; };
  }, [open, workOrder?.id]);

  const handleXeroRetry = async () => {
    setXeroRetrying(true);
    enqueueSnackbar("Syncing to Xero…", { variant: "info" });
    try {
      const result = await integrationApi.retryXeroSync(workOrder.id);
      setXeroSync({
        synced: true,
        xeroProjectId: result.xeroProjectId,
        workOrderId: xeroSync?.workOrderId,
      });
      enqueueSnackbar("Xero project synced successfully.", { variant: "success" });
    } catch (err) {
      setXeroSync((prev) => ({ ...prev, error: err.message }));
      enqueueSnackbar(`Xero sync failed: ${err.message || "Unknown error"}`, { variant: "error" });
    } finally {
      setXeroRetrying(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const woId = getColumnDisplayValue(workOrder, WO_COL.WORKORDER_ID);
  const model = getColumnDisplayValue(workOrder, WO_COL.MODEL);
  const serialNumber = getColumnDisplayValue(workOrder, WO_COL.SERIAL_NUMBER);
  const equipment = getColumnDisplayValue(workOrder, WO_COL.EQUIPMENTS_REL);
  const technician = getColumnDisplayValue(workOrder, WO_COL.TECHNICIAN);

  const handlePromote = async () => {
    setPromoting(true);
    try {
      const { data } = await workOrderApi.prepareInvoice(workOrder.id, auth?.token);

      if (data.xeroInvoice) {
        enqueueSnackbar(
          `Promoted ${data.promoted} item(s). Xero invoice ${data.xeroInvoice.invoiceNumber} created.`,
          {
            variant: "success",
            action: (
              <Button
                size="small"
                sx={{ color: "#fff", textDecoration: "underline" }}
                onClick={() => window.open(data.xeroInvoice.invoiceUrl, "_blank")}
              >
                Open in Xero
              </Button>
            ),
            autoHideDuration: 10000,
          }
        );
      } else {
        enqueueSnackbar(`Successfully promoted ${data.promoted} item(s) to invoice.`, { variant: "success" });
      }

      if (data.xeroWarning) {
        enqueueSnackbar(data.xeroWarning, { variant: "warning", autoHideDuration: 8000 });
      }
      if (data.xeroError) {
        enqueueSnackbar(`Xero: ${data.xeroError}`, { variant: "error", autoHideDuration: 8000 });
      }

      dispatch(fetchMasterCosts({ workOrderId: workOrder.id, token: auth?.token }));
    } catch (err) {
      enqueueSnackbar(`Failed to promote items: ${err.message}`, { variant: "error" });
    } finally {
      setPromoting(false);
    }
  };

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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.3 }}>
                <Typography sx={{ fontSize: "0.78rem", color: isLocked ? "#eb5757" : "#9b9a97" }}>
                  {isLocked ? "This work order is locked for billing" : "Work order details"}
                </Typography>
                {isLocked && <LockIcon sx={{ fontSize: 12, color: "#eb5757" }} />}
              </Box>
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

        <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2.5, ...(!isAdmin && { '& .MuiInputBase-root, & .MuiSelect-root, & .MuiSwitch-root, & .MuiCheckbox-root, & .MuiAutocomplete-root, & .MuiButtonBase-root:not(.MuiIconButton-root)': { pointerEvents: 'none' } }) }}>
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
                      previousSnapshot: getColumnSnapshot(
                        workOrder,
                        WO_COL.CUSTOMER,
                      ),
                    }),
                  );
                }}
                onCreateNew={(v) => setPendingNewCustomer({ name: v })}
                readOnly={!isAdmin}
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
                      previousSnapshot: getColumnSnapshot(
                        workOrder,
                        WO_COL.LOCATION,
                      ),
                    }),
                  );
                }}
                onCreateNew={(v) => setPendingNewLocation({ name: v })}
                readOnly={!isAdmin}
              />
            </PropertyRow>
            <PropertyRow icon={VerifiedOutlinedIcon} label="Scheduling Status">
              <StatusChips
                options={SCHEDULING_STATUS_OPTIONS}
                hexMap={STATUS_HEX}
                value={form.status}
                onChange={(v) => set("status", v)}
              />
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
            <PropertyRow icon={CalendarViewWeekOutlinedIcon} label="Multi-Day Job">
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

          <Section>Photos / Documents</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={PhotoCameraOutlinedIcon} label="Files">
              <FileCell item={workOrder} columnId={WO_COL.PHOTOS_DOCUMENTS} />
            </PropertyRow>
          </Box>

          <Section>Execution & Hardware</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={VerifiedOutlinedIcon} label="Progress Status">
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
            <PropertyRow icon={BuildOutlinedIcon} label="Equipment">
              <LinkedTable
                icon={ConstructionOutlinedIcon}
                label="Linked Equipment"
                iconColor="#f97316"
                items={allEquipment.filter((eq) => {
                  const linkedIds = parseRelationIds(
                    workOrder?.column_values?.find(
                      (cv) => cv.id === WO_COL.EQUIPMENTS_REL,
                    )?.value,
                  );
                  return linkedIds.includes(String(eq.id));
                })}
                onNavigate={(item) => navigate(`/equipment/${item.id}`)}
                columns={[
                  { label: "EQUIPMENT NAME", width: "180px", key: "name" },
                  { label: "SERIAL #", width: "140px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.SERIAL_NUMBER) },
                  { label: "MANUFACTURER", width: "150px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.MANUFACTURER) },
                  { label: "MODEL #", width: "120px", getValue: (item) => getColumnDisplayValue(item, EQ_COL.MODEL_NUMBER) },
                  { label: "STATUS", width: "110px", isStatus: true, getValue: (item) => getColumnDisplayValue(item, EQ_COL.STATUS) },
                ]}
              />
              {equipment === "—" && <Typography sx={{ fontSize: "0.875rem", color: "#c1bfbc", mt: 1 }}>— no equipment</Typography>}
            </PropertyRow>
            <PropertyRow icon={LinkOutlinedIcon} label="Mirror Tracking">
              <Typography sx={{ fontSize: "0.875rem", color: form.mirror ? "#37352f" : "#c1bfbc", fontFamily: "monospace" }}>
                {form.mirror || "—"}
              </Typography>
            </PropertyRow>
          </Box>

          {/* ── Billing Stage ─────────────────────────────────────────── */}
          <Section>Billing</Section>
          <Box sx={{ mb: 2.5 }}>
            <PropertyRow icon={CalendarViewWeekOutlinedIcon} label="Billing Stage">
              <StatusChips
                options={BILLING_STAGE_OPTIONS}
                hexMap={BILLING_STAGE_HEX}
                value={form.billingStage}
                onChange={(v) => !isLocked && set("billingStage", v)}
              />
            </PropertyRow>

            {form.billingStage === "Ready for Billing" && (
              <Box sx={{ mt: 1.5, px: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={promoting ? <CircularProgress size={14} /> : <ReceiptLongIcon />}
                  disabled={promoting || isLocked}
                  onClick={handlePromote}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    borderColor: "#2f6feb",
                    color: "#2f6feb",
                    "&:hover": { bgcolor: "rgba(47,111,235,0.04)", borderColor: "#1a56d6" }
                  }}
                >
                  {promoting ? "Promoting Costs..." : "Promote Costs to Invoice Items"}
                </Button>
                <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.disabled", textAlign: "center", fontStyle: "italic" }}>
                  Promotion is 1:1 and applies configured markups.
                </Typography>
              </Box>
            )}
          </Box>
          {/* ─────────────────────────────────────────────────────────── */}

          <Divider sx={{ borderColor: "#e8e6e1", my: 2 }} />

          {/* ── Xero Project Integration ─────────────────────────────── */}
          <Section>Xero Project</Section>
          <Box
            sx={{
              mx: 1,
              mb: 2.5,
              mt: 0.75,
              p: 1.5,
              borderRadius: "6px",
              border: "1px solid",
              borderColor: xeroSync?.synced
                ? "rgba(19,159,119,0.25)"
                : xeroSync?.error
                  ? "rgba(235,87,87,0.25)"
                  : "#e8e6e1",
              bgcolor: xeroSync?.synced
                ? "rgba(19,159,119,0.04)"
                : xeroSync?.error
                  ? "rgba(235,87,87,0.04)"
                  : "#fafafa",
              transition: "all 0.2s",
            }}
          >
            {xeroLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={12} sx={{ color: "#9b9a97" }} />
                <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97" }}>
                  Checking Xero sync…
                </Typography>
              </Box>
            ) : xeroSync?.synced ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#139f77",
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#139f77" }}
                    >
                      Xero Project Linked
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.72rem",
                        color: "#9b9a97",
                        fontFamily: "monospace",
                        mt: 0.2,
                      }}
                    >
                      {xeroSync.workOrderId}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  component="a"
                  href="https://go.xero.com/projects/list"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    fontSize: "0.72rem",
                    textTransform: "none",
                    color: "#139f77",
                    fontWeight: 600,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "4px",
                    border: "1px solid rgba(19,159,119,0.3)",
                    "&:hover": { bgcolor: "rgba(19,159,119,0.08)" },
                  }}
                >
                  Open in Xero ↗
                </Button>
              </Box>
            ) : !(form.customerId || form.customerName) ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#f59e0b",
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#92400e" }}
                    >
                      Customer Link Required
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "#9b9a97",
                        mt: 0.2,
                      }}
                    >
                      Link a customer in Overview to enable Xero sync.
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  disabled
                  sx={{
                    fontSize: "0.72rem",
                    textTransform: "none",
                    color: "#9b9a97",
                    fontWeight: 600,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "4px",
                    border: "1px solid #e5e7eb",
                    flexShrink: 0,
                  }}
                  title="A customer must be linked to this Work Order before it can be synced to Xero."
                >
                  Retry sync
                </Button>
              </Box>
            ) : xeroSync?.error ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "#eb5757",
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#eb5757" }}
                    >
                      Xero Sync Failed
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.7rem",
                        color: "#9b9a97",
                        mt: 0.2,
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={xeroSync.error}
                    >
                      {xeroSync.error}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  disabled={xeroRetrying}
                  onClick={handleXeroRetry}
                  sx={{
                    fontSize: "0.72rem",
                    textTransform: "none",
                    color: "#eb5757",
                    fontWeight: 600,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "4px",
                    border: "1px solid rgba(235,87,87,0.3)",
                    "&:hover": { bgcolor: "rgba(235,87,87,0.06)" },
                    flexShrink: 0,
                  }}
                >
                  {xeroRetrying ? (
                    <CircularProgress size={10} sx={{ color: "#eb5757", mr: 0.5 }} />
                  ) : null}
                  Retry sync
                </Button>
              </Box>
            ) : xeroSync?.pending ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#f59e0b",
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: "0.78rem", color: "#92400e" }}>
                  Xero sync pending — may take a few seconds after creation.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#d1d5db",
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97" }}>
                  Xero not connected — go to Settings → Integrations to connect.
                </Typography>
              </Box>
            )}
          </Box>
          {/* ───────────────────────────────────────────── */}

          {/* ── Job Costs ─────────────────────────────────────── */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Section>Job Costs</Section>
            {!isLocked && (
              <Button
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => { setEditingCost(null); setCostDrawerOpen(true); }}
                sx={{ fontSize: "0.65rem", py: 0, textTransform: "none" }}
              >
                Add Cost
              </Button>
            )}
          </Box>

          <Box sx={{ mb: 2.5, px: 1 }}>
            {costsLoading ? (
              <CircularProgress size={16} sx={{ color: "#9b9a97", my: 1 }} />
            ) : allCosts.length === 0 ? (
              <Typography sx={{ fontSize: "0.75rem", color: "#9b9a97", fontStyle: "italic" }}>
                No labor or parts costs recorded yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {allCosts.map((cost) => {
                  const type = cost.column_values?.find(c => c.id === MONDAY_COLUMNS.MASTER_COSTS.TYPE)?.text;
                  const total = cost.column_values?.find(c => c.id === MONDAY_COLUMNS.MASTER_COSTS.TOTAL_COST)?.text;
                  const desc = cost.column_values?.find(c => c.id === MONDAY_COLUMNS.MASTER_COSTS.DESCRIPTION)?.text;

                  return (
                    <Box
                      key={cost.id}
                      onClick={() => { setEditingCost(cost); setCostDrawerOpen(true); }}
                      sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        p: 1.25, borderRadius: "6px", border: "1px solid #e8e6e1",
                        cursor: "pointer", "&:hover": { bgcolor: "#f7f6f3", borderColor: "#d1cfc9" },
                        transition: "all 0.1s"
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{
                          px: 0.8, py: 0.15, borderRadius: "3px",
                          bgcolor: `${COST_TYPE_HEX[type]}15`, color: COST_TYPE_HEX[type],
                          fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase"
                        }}>
                          {type}
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#37352f", lineHeight: 1.2 }}>
                            {desc || "Cost Item"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: "#9b9a97", mt: 0.1 }}>
                            {cost.name}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#37352f" }}>
                        ${parseFloat(total || 0).toFixed(2)}
                      </Typography>
                    </Box>
                  );
                })}

                <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 1, pr: 1.25 }}>
                  <Typography sx={{ fontSize: "0.7rem", color: "#9b9a97", textTransform: "uppercase", letterSpacing: "0.05em", mr: 1, mt: 0.4 }}>
                    Total Job Cost
                  </Typography>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: "#22c55e" }}>
                    ${totalCost.toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            )}
          </Box>

          <Divider sx={{ borderColor: "#e8e6e1", my: 2 }} />

          <Section>Linked Records</Section>
          <Stack spacing={2} sx={{ px: 1, mt: 1.5 }}>
            {(() => {
              const cv = workOrder?.column_values?.find((c) => c.id === WO_COL.INVOICE_ITEMS_REL);
              const names = cv?.text ? cv.text.split(",").map(s => s.trim()) : [];
              const ids = parseRelationIds(cv?.value);
              return (
                <LinkedGroup
                  icon={ReceiptOutlinedIcon}
                  label="Invoice Line Items"
                  iconColor="#4f8ef7"
                  items={ids}
                  renderItem={(id, idx) => <RecordPill key={id} id={id} type="invoice" name={names[idx] || `Item ${id}`} bgColor="#ebf0fd" textColor="#1e40af" borderColor="#c7d7fb" />}
                />
              );
            })()}
            {(() => {
              const cv = workOrder?.column_values?.find((c) => c.id === WO_COL.TIME_ENTRIES_REL);
              const names = cv?.text ? cv.text.split(",").map(s => s.trim()) : [];
              const ids = parseRelationIds(cv?.value);
              return (
                <LinkedGroup
                  icon={AccessTimeOutlinedIcon}
                  label="Time Entries"
                  iconColor="#c084fc"
                  items={ids}
                  renderItem={(id, idx) => <RecordPill key={id} id={id} type="time" name={names[idx] || `Entry ${id}`} bgColor="#f3f0ff" textColor="#6d28d9" borderColor="#ddd6fe" />}
                />
              );
            })()}
            {(() => {
              const cv = workOrder?.column_values?.find((c) => c.id === WO_COL.EXPENSES_REL);
              const names = cv?.text ? cv.text.split(",").map(s => s.trim()) : [];
              const ids = parseRelationIds(cv?.value);
              return (
                <LinkedGroup
                  icon={PaymentsOutlinedIcon}
                  label="Expenses"
                  iconColor="#22c55e"
                  items={ids}
                  renderItem={(id, idx) => <RecordPill key={id} id={id} type="expense" name={names[idx] || `Expense ${id}`} bgColor="#f0fdf4" textColor="#15803d" borderColor="#dcfce7" />}
                />
              );
            })()}
            <LinkedGroup
              icon={SubtitlesOutlinedIcon}
              label="Subitems"
              iconColor="#94a3b8"
              items={workOrder?.subitems || []}
              renderItem={(s) => <RecordPill key={s.id} id={s.id} type="subitem" name={s.name} bgColor="#f8fafc" textColor="#475569" borderColor="#e2e8f0" />}
            />
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
            disabled={saving}
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
              onClick={handleSave}
              variant="contained"
              disableElevation
              disabled={saving || isLocked}
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
              {saving ? <CircularProgress size={16} sx={{ color: "#fff", mr: 1 }} /> : null}
              Save changes
            </Button>
          )}
        </Box>
      </Drawer>

      <CustomerDrawer
        open={!!pendingNewCustomer}
        customer={
          pendingNewCustomer
            ? { id: "__new__", name: pendingNewCustomer.name, column_values: [] }
            : null
        }
        onClose={() => setPendingNewCustomer(null)}
        onSaveNew={async (custForm) => {
          await dispatch(
            createCustomerAndLink({ form: custForm, workOrderId: workOrder.id }),
          );
          setPendingNewCustomer(null);
        }}
      />
      <LocationDrawer
        open={!!pendingNewLocation}
        location={
          pendingNewLocation
            ? { id: "__new__", name: pendingNewLocation.name, column_values: [] }
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
      <MasterCostDrawer
        open={costDrawerOpen}
        onClose={() => setCostDrawerOpen(false)}
        costItem={editingCost}
        defaultWorkOrderId={workOrder?.id}
      />
    </>
  );
}
