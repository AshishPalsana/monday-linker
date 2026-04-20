import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Stack,
  Divider,
  CircularProgress,
  Chip,
  Switch,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import CalendarViewWeekOutlinedIcon from "@mui/icons-material/CalendarViewWeekOutlined";

import { createWorkOrder } from "../store/workOrderSlice";
import { createCustomer } from "../store/customersSlice";
import { createLocation } from "../store/locationsSlice";
import { SCHEDULING_STATUS_OPTIONS, STATUS_HEX, VALIDATION_STATUSES, PARTS_HEX } from "../constants/index";
import CustomerDrawer from "./CustomerDrawer";
import LocationDrawer from "./LocationDrawer";
import RelationCell from "./RelationCell";

const EXECUTION_STATUS_OPTIONS = VALIDATION_STATUSES.EXECUTION;
const PARTS_ORDERED_OPTIONS = VALIDATION_STATUSES.PARTS_ORDERED;


const PropertyRow = ({ icon: Icon, label, required, error, children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "160px 1fr",
      alignItems: "start",
      borderRadius: "4px",
      px: 1,
      py: "8px",
      "&:hover": { bgcolor: "#f7f6f3" },
      transition: "background 0.12s",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: "4px" }}>
      <Icon sx={{ fontSize: 16, color: "#9b9a97", flexShrink: 0 }} />
      <Typography sx={{ fontSize: "0.85rem", color: "#9b9a97", fontWeight: 500 }}>
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
        <Typography sx={{ fontSize: "0.75rem", color: "#eb5757", mt: 0.5, ml: 1 }}>
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
        fontSize: "0.9rem",
        color: "#37352f",
        "&:before, &:after": { display: "none" },
      },
      "& .MuiInputBase-input": {
        p: "4px 8px",
        lineHeight: 1.5,
        "&::placeholder": { color: error ? "#f5b8b8" : "#c1bfbc", opacity: 1 },
      },
    }}
  />
);

export default function WorkOrderDrawer({ open, onClose, defaultGroupId }) {
  const dispatch = useDispatch();
  const creating = useSelector((s) => s.workOrders.creating);
  const customers = useSelector(
    (s) => s.customers.board?.items_page?.items || [],
  );
  const locations = useSelector(
    (s) => s.locations.board?.items_page?.items || [],
  );

  const [form, setForm] = useState({
    name: "",
    customerId: "",
    customerName: "",
    locationId: "",
    locationName: "",
    description: "",
    status: "Unscheduled",
    scheduledDate: "",
    multiDay: false,
    serviceHistory: "",
    workPerformed: "",
    executionStatus: "",
    partsOrdered: "",
    groupId: defaultGroupId || "topics",
  });

  const [errors, setErrors] = useState({});
  const [pendingNewCustomer, setPendingNewCustomer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: "",
        customerId: "",
        customerName: "",
        locationId: "",
        locationName: "",
        description: "",
        status: "Unscheduled",
        scheduledDate: "",
        multiDay: false,
        serviceHistory: "",
        workPerformed: "",
        executionStatus: "",
        partsOrdered: "",
        groupId: defaultGroupId || "topics",
      });
      setErrors({});
    }
  }, [open, defaultGroupId]);

  const handleSave = async () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await dispatch(createWorkOrder(form));
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 600,
          bgcolor: "#fff",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: "1px solid #edece9",
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#37352f", lineHeight: 1.3 }}>
            New Work Order
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "#9b9a97", mt: 0.3 }}>
            Create a new work order
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ borderRadius: "5px", color: "#9b9a97", "&:hover": { bgcolor: "#f1f1ef", color: "#37352f" } }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 4 }}>
        <TextField
          fullWidth
          placeholder="Work order title..."
          value={form.name}
          onChange={(e) => {
            setForm({ ...form, name: e.target.value });
            if (errors.name) setErrors({ ...errors, name: false });
          }}
          variant="standard"
          sx={{
            mb: 4,
            "& .MuiInput-root": {
              fontSize: "2rem",
              fontWeight: 700,
              color: "#37352f",
              "&:before, &:after": { display: "none" },
            },
            "& .MuiInputBase-input::placeholder": {
              color: errors.name ? "#f5b8b8" : "#e1dfdc",
              opacity: 1,
            },
          }}
        />

        <Stack spacing={0.5}>
          <PropertyRow icon={PersonOutlineIcon} label="Customer">
            <RelationCell
              value={form.customerName}
              options={customers}
              placeholder="— select customer"
              chipBgColor="rgba(79, 142, 247, 0.1)"
              chipTextColor="#3367d6"
              chipBorderColor="rgba(79, 142, 247, 0.2)"
              createLabel="customer"
              onSelectExisting={(id, name) =>
                setForm({ ...form, customerId: id, customerName: name })
              }
              onCreateNew={(val) => setPendingNewCustomer({ name: val })}
            />
          </PropertyRow>

          <PropertyRow icon={LocationOnOutlinedIcon} label="Location">
            <RelationCell
              value={form.locationName}
              options={locations}
              placeholder="— select location"
              chipBgColor="rgba(168, 85, 247, 0.1)"
              chipTextColor="#9333ea"
              chipBorderColor="rgba(168, 85, 247, 0.2)"
              createLabel="location"
              onSelectExisting={(id, name) =>
                setForm({ ...form, locationId: id, locationName: name })
              }
              onCreateNew={(val) => setPendingNewLocation({ name: val })}
            />
          </PropertyRow>

          <PropertyRow icon={VerifiedOutlinedIcon} label="Status">
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: "2px" }}
            >
              {SCHEDULING_STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  size="small"
                  onClick={() => setForm({ ...form, status: opt })}
                  sx={{
                    fontSize: "0.72rem",
                    height: 22,
                    fontWeight: 600,
                    cursor: "pointer",
                    bgcolor:
                      form.status === opt ? STATUS_HEX[opt] : "transparent",
                    color: form.status === opt ? "#fff" : "#6b7280",
                    border: "1px solid",
                    borderColor:
                      form.status === opt ? STATUS_HEX[opt] : "#e5e7eb",
                    "&:hover": {
                      bgcolor:
                        form.status === opt ? STATUS_HEX[opt] : "#f3f4f6",
                    },
                    transition: "all 0.1s",
                  }}
                />
              ))}
            </Stack>
          </PropertyRow>

          <PropertyRow icon={EventOutlinedIcon} label="Scheduled Date">
            <TextField
              type="date"
              size="small"
              value={form.scheduledDate}
              onChange={(e) =>
                setForm({ ...form, scheduledDate: e.target.value })
              }
              variant="standard"
              InputLabelProps={{ shrink: true }}
              sx={{
                "& .MuiInput-root": {
                  fontSize: "0.9rem",
                  color: "#37352f",
                  "&:before, &:after": { display: "none" },
                },
                "& .MuiInputBase-input": { p: "4px 8px", lineHeight: 1.5 },
              }}
            />
          </PropertyRow>

          <PropertyRow icon={CalendarViewWeekOutlinedIcon} label="Multi-Day">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                size="small"
                checked={form.multiDay}
                onChange={(e) =>
                  setForm({ ...form, multiDay: e.target.checked })
                }
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

          <Divider sx={{ my: 2 }} />

          <PropertyRow icon={NotesOutlinedIcon} label="Description">
            <InlineField
              multiline
              rows={3}
              placeholder="Add description..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </PropertyRow>

          <Divider sx={{ my: 2 }} />

          <PropertyRow icon={HistoryOutlinedIcon} label="Service History">
            <InlineField
              multiline
              rows={3}
              placeholder="Previous service notes..."
              value={form.serviceHistory}
              onChange={(e) =>
                setForm({ ...form, serviceHistory: e.target.value })
              }
            />
          </PropertyRow>

          <PropertyRow icon={HandymanOutlinedIcon} label="Work Performed">
            <InlineField
              multiline
              rows={3}
              placeholder="Describe work performed..."
              value={form.workPerformed}
              onChange={(e) =>
                setForm({ ...form, workPerformed: e.target.value })
              }
            />
          </PropertyRow>

          <Divider sx={{ my: 2 }} />

          <PropertyRow icon={VerifiedOutlinedIcon} label="Execution Status">
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: "2px" }}
            >
              {EXECUTION_STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  size="small"
                  onClick={() =>
                    setForm({
                      ...form,
                      executionStatus: form.executionStatus === opt ? "" : opt,
                    })
                  }
                  sx={{
                    fontSize: "0.72rem",
                    height: 22,
                    fontWeight: 600,
                    cursor: "pointer",
                    bgcolor:
                      form.executionStatus === opt
                        ? STATUS_HEX[opt] || "#6b7280"
                        : "transparent",
                    color: form.executionStatus === opt ? "#fff" : "#6b7280",
                    border: "1px solid",
                    borderColor:
                      form.executionStatus === opt
                        ? STATUS_HEX[opt] || "#6b7280"
                        : "#e5e7eb",
                    "&:hover": {
                      bgcolor:
                        form.executionStatus === opt
                          ? STATUS_HEX[opt] || "#6b7280"
                          : "#f3f4f6",
                    },
                    transition: "all 0.1s",
                  }}
                />
              ))}
            </Stack>
          </PropertyRow>

          <PropertyRow icon={InventoryOutlinedIcon} label="Parts Ordered">
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: "2px" }}
            >
              {PARTS_ORDERED_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  size="small"
                  onClick={() =>
                    setForm({
                      ...form,
                      partsOrdered: form.partsOrdered === opt ? "" : opt,
                    })
                  }
                  sx={{
                    fontSize: "0.72rem",
                    height: 22,
                    fontWeight: 600,
                    cursor: "pointer",
                    bgcolor:
                      form.partsOrdered === opt
                        ? PARTS_HEX[opt] || "#6b7280"
                        : "transparent",
                    color: form.partsOrdered === opt ? "#fff" : "#6b7280",
                    border: "1px solid",
                    borderColor:
                      form.partsOrdered === opt
                        ? PARTS_HEX[opt] || "#6b7280"
                        : "#e5e7eb",
                    "&:hover": {
                      bgcolor:
                        form.partsOrdered === opt
                          ? PARTS_HEX[opt] || "#6b7280"
                          : "#f3f4f6",
                    },
                    transition: "all 0.1s",
                  }}
                />
              ))}
            </Stack>
          </PropertyRow>
        </Stack>
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
          onClick={onClose}
          disabled={creating}
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
          disabled={creating}
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
          {creating ? <CircularProgress size={16} sx={{ color: "#fff", mr: 1 }} /> : null}
          Create
        </Button>
      </Box>

      <CustomerDrawer
        open={!!pendingNewCustomer}
        customer={
          pendingNewCustomer
            ? { id: "__new__", name: pendingNewCustomer.name, column_values: [] }
            : { id: "", name: "", column_values: [] }
        }
        onClose={() => setPendingNewCustomer(null)}
        onSaveNew={async (custForm) => {
          const result = await dispatch(createCustomer(custForm)).unwrap();
          setForm((prev) => ({
            ...prev,
            customerId: result.id,
            customerName: result.name,
          }));
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
          const result = await dispatch(createLocation(locForm)).unwrap();
          setForm((prev) => ({
            ...prev,
            locationId: result.id,
            locationName: result.name,
          }));
          setPendingNewLocation(null);
        }}
      />
    </Drawer>
  );
}