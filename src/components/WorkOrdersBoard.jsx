import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWorkOrders } from "../store/workOrderSlice";
import {
  fetchCustomers,
  linkExistingCustomer,
  createCustomerAndLink,
} from "../store/customersSlice";
import {
  fetchLocations,
  linkExistingLocation,
  createLocationAndLink,
} from "../store/locationsSlice";
import CustomerDrawer from "./CustomerDrawer";
import LocationDrawer from "./LocationDrawer";
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  CircularProgress,
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import AppButton from "./AppButton";
import CheckIcon from "@mui/icons-material/Check";
import { MONDAY_COLUMNS } from "../constants/index";
import StatusChip from "./StatusChip";
import WorkOrderDrawer from "./WorkOrderDrawer";
import WorkOrderDetailDrawer from "./WorkOrderDetailDrawer";
import RelationCell from "./RelationCell";
import FileCell from "./FileCell";
import { BoardGroup, BoardTable, DATA_CELL_SX } from "./BoardTable";
import { getColumnDisplayValue, getColumnSnapshot } from "../utils/mondayUtils";

const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;
const EMPTY_ARRAY = [];

export default function WorkOrdersBoard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { board, loading, error, statusColors } = useSelector((s) => s.workOrders);
  const { search } = useBoardHeaderContext();

  const customers = useSelector(
    (s) => s.customers.board?.items_page?.items || EMPTY_ARRAY,
  );
  const locations = useSelector(
    (s) => s.locations.board?.items_page?.items || EMPTY_ARRAY,
  );
  const [pendingNewCustomer, setPendingNewCustomer] = useState(null);
  const [pendingNewLocation, setPendingNewLocation] = useState(null);
  const [openWorkOrderDrawer, setOpenWorkOrderDrawer] = useState(false);
  const { id } = useParams();

  // Derived state for the selected work order based on the URL ID
  const selectedWorkOrder = useMemo(() => {
    if (!id || !board?.items_page?.items) return null;
    return board.items_page.items.find((i) => String(i.id) === id) || null;
  }, [id, board]);

  // URL Cleanup: if an ID is provided but doesn't exist in the board, clear it.
  useEffect(() => {
    if (id && board?.items_page?.items && !selectedWorkOrder && !loading) {
      navigate("/workorders", { replace: true });
    }
  }, [id, board, selectedWorkOrder, loading, navigate]);

  const handleSelectWorkOrder = (item) => {
    navigate(`/workorders/${item.id}`);
  };

  const handleCloseDetail = () => {
    navigate("/workorders");
  };

  useEffect(() => {
    dispatch(fetchWorkOrders());
    dispatch(fetchCustomers());
    dispatch(fetchLocations());
  }, [dispatch]);

  const customerMap = customers.reduce((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});
  const locationMap = locations.reduce((acc, l) => {
    acc[l.id] = l.name;
    return acc;
  }, {});

  const handleLinkCustomer = (item, customerId, customerName) => {
    const previousSnapshot = getColumnSnapshot(item, WO_COL.CUSTOMER);
    dispatch(
      linkExistingCustomer({
        workOrderId: item.id,
        customerId,
        customerName,
        previousSnapshot,
      }),
    );
  };

  const handleLinkLocation = (item, locationId, locationName) => {
    const previousSnapshot = getColumnSnapshot(item, WO_COL.LOCATION);
    dispatch(
      linkExistingLocation({
        workOrderId: item.id,
        locationId,
        locationName,
        previousSnapshot,
      }),
    );
  };

  const allItems = board?.items_page?.items || [];
  const groups = board?.groups || [];

  const filteredItems = allItems.filter(
    (item) =>
      !search || item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNewBoardOrder = useCallback(() => setOpenWorkOrderDrawer(true), []);

  useBoardHeader({
    title: "Work Orders",
    count: filteredItems.length,
    buttonLabel: "New work order",
    onButtonClick: handleNewBoardOrder,
  });

  const itemsByGroup = filteredItems.reduce((acc, item) => {
    const groupId = item.group?.id || "default";
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(item);
    return acc;
  }, {});

  const WO_COLUMNS = [
    { label: "WO-ID", width: 100 },
    { label: "Work order", width: 240 },
    { label: "Customer", width: 200 },
    { label: "Location", width: 200 },
    { label: "Progress Status", width: 340 },
    { label: "Technician", width: 160 },
    { label: "Multi-Day", width: 110 },
    { label: "Billing Stage", width: 200 },
    { label: "Service History", width: 250 },
    { label: "Work Performed", width: 250 },
    { label: "Photos / Docs", width: 140 },
    { label: "Invoice Items", width: 180 },
    { label: "Parts Ordered", width: 150 },
    { label: "Scheduling Status", width: 240 },
    { label: "Scheduled Date", width: 140 },
    { label: "Equipments", width: 160 },
    { label: "Time Entries", width: 160 },
    { label: "Expenses", width: 160 },
    { label: "Mirror", width: 140 },
  ];

  const renderWORow = (item) => (
    <TableRow
      key={item.id}
      hover
      sx={{ cursor: "pointer" }}
      onClick={() => handleSelectWorkOrder(item)}
    >
      <TableCell sx={{ ...DATA_CELL_SX, fontFamily: "monospace" }}>
        {getColumnDisplayValue(item, WO_COL.WORKORDER_ID) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
          {item.name}
        </Typography>
      </TableCell>
      <TableCell
        sx={{ ...DATA_CELL_SX, overflow: "visible", py: "5px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <RelationCell
          value={getColumnDisplayValue(item, WO_COL.CUSTOMER)}
          options={customers}
          placeholder="— add customer"
          chipBgColor="#e6f4ff"
          chipTextColor="#0958d9"
          chipBorderColor="#91caae"
          createLabel="Customer"
          onSelectExisting={(id, name) => handleLinkCustomer(item, id, name)}
          onCreateNew={(name) =>
            setPendingNewCustomer({ name, workOrderId: item.id })
          }
        />
      </TableCell>
      <TableCell
        sx={{ ...DATA_CELL_SX, overflow: "visible", py: "5px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <RelationCell
          value={getColumnDisplayValue(item, WO_COL.LOCATION)}
          options={locations}
          placeholder="— add location"
          chipBgColor="rgba(168,85,247,0.1)"
          chipTextColor="#a855f7"
          chipBorderColor="rgba(168,85,247,0.2)"
          createLabel="Location"
          onSelectExisting={(id, name) => handleLinkLocation(item, id, name)}
          onCreateNew={(name) =>
            setPendingNewLocation({ name, workOrderId: item.id })
          }
        />
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible" }}>
        {(() => {
          const s = getColumnDisplayValue(item, WO_COL.EXECUTION_STATUS);
          return s ? <StatusChip status={s} colorMap={statusColors} /> : "—";
        })()}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.TECHNICIAN) || "—"}
      </TableCell>
      <TableCell sx={{ textAlign: "center" }}>
        {(() => {
          const val = getColumnDisplayValue(item, WO_COL.MULTI_DAY);
          return val === "Yes" ? (
            <CheckIcon sx={{ fontSize: 18, color: "#4caf50", display: "block", mx: "auto" }} />
          ) : "—";
        })()}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible" }}>
        {(() => {
          const s = getColumnDisplayValue(item, WO_COL.BILLING_STAGE);
          return s ? <StatusChip status={s} colorMap={statusColors} /> : "—";
        })()}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.SERVICE_HISTORY) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.WORK_PERFORMED) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        <FileCell item={item} columnId={WO_COL.PHOTOS_DOCUMENTS} />
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.INVOICE_ITEMS_REL) || "—"}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible" }}>
        {(() => {
          const s = getColumnDisplayValue(item, WO_COL.PARTS_ORDERED);
          return s ? <StatusChip status={s} colorMap={statusColors} /> : "—";
        })()}
      </TableCell>
      <TableCell sx={{ ...DATA_CELL_SX, overflow: "visible" }}>
        {(() => {
          const s = getColumnDisplayValue(item, WO_COL.STATUS);
          return s ? <StatusChip status={s} colorMap={statusColors} /> : "—";
        })()}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.SCHEDULED_DATE) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.EQUIPMENTS_REL) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.TIME_ENTRIES_REL) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.EXPENSES_REL) || "—"}
      </TableCell>
      <TableCell sx={DATA_CELL_SX}>
        {getColumnDisplayValue(item, WO_COL.MIRROR) || "—"}
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }
  if (error) return <div>Error: {error}</div>;
  if (!board) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1.5, sm: 2 },
        }}
      >
        {groups.map((group) => {
          const rows = itemsByGroup[group.id] || [];
          return (
            <BoardGroup
              key={group.id}
              label={group.title}
              color={group.color || "#6b7280"}
              count={rows.length}
            >
              <BoardTable
                columns={WO_COLUMNS}
                rows={rows}
                renderRow={renderWORow}
                emptyMessage="No work orders in this group"
                minWidth={2790}
              />
            </BoardGroup>
          );
        })}
      </Box>

      <CustomerDrawer
        open={!!pendingNewCustomer}
        customer={
          pendingNewCustomer
            ? { id: "__new__", name: pendingNewCustomer.name, column_values: [] }
            : { id: "__new__", name: "", column_values: [] }
        }
        onClose={() => setPendingNewCustomer(null)}
        onSaveNew={async (form) => {
          await dispatch(
            createCustomerAndLink({
              form,
              workOrderId: pendingNewCustomer.workOrderId,
            }),
          );
          setPendingNewCustomer(null);
        }}
      />

      <LocationDrawer
        open={!!pendingNewLocation}
        location={
          pendingNewLocation
            ? { id: "__new__", name: pendingNewLocation.name, column_values: [] }
            : { id: "__new__", name: "", column_values: [] }
        }
        onClose={() => setPendingNewLocation(null)}
        onSaveNew={async (form) => {
          await dispatch(
            createLocationAndLink({
              form,
              workOrderId: pendingNewLocation.workOrderId,
            }),
          );
          setPendingNewLocation(null);
        }}
      />
      <WorkOrderDrawer
        open={openWorkOrderDrawer}
        onClose={() => setOpenWorkOrderDrawer(false)}
        defaultGroupId={
          groups.find((g) => g.title.toLowerCase().includes("active"))?.id ||
          groups[0]?.id
        }
      />

      <WorkOrderDetailDrawer
        key={selectedWorkOrder?.id}
        open={!!selectedWorkOrder}
        workOrder={selectedWorkOrder}
        onClose={handleCloseDetail}
      />
    </Box>
  );
}
