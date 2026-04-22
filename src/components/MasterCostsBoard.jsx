import { useState, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMasterCosts, deleteMasterCost, fetchMasterCostsMetadata } from "../store/masterCostsSlice";
import { fetchWorkOrders } from "../store/workOrderSlice";
import {
  Box,
  Typography,
  TableCell,
  TableRow,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import { MONDAY_COLUMNS } from "../constants/index";
import { BoardGroup, BoardTable, DATA_CELL_SX } from "./BoardTable";
import MasterCostDrawer from "./MasterCostDrawer";
import StatusChip from "./StatusChip";
import { useAuth } from "../hooks/useAuth";

const MC_COL = MONDAY_COLUMNS.MASTER_COSTS;
const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;

export default function MasterCostsBoard() {
  const dispatch = useDispatch();
  const { auth } = useAuth();
  const { items, groups, itemGroupMap, loading, error, statusColors } = useSelector((s) => s.masterCosts);
  const { board: woBoard } = useSelector((s) => s.workOrders);
  const { search } = useBoardHeaderContext();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    dispatch(fetchMasterCosts({ token: auth?.token }));
    dispatch(fetchMasterCostsMetadata());
    dispatch(fetchWorkOrders());
  }, [dispatch, auth?.token]);

  const workOrderMap = useMemo(() => {
    if (!woBoard?.items_page?.items) return {};
    return woBoard.items_page.items.reduce((acc, item) => {
      acc[item.id] = item.name;
      const woIdCol = item.column_values.find(c => c.id === WO_COL.WORKORDER_ID);
      acc[`${item.id}_id`] = woIdCol?.text || "";
      return acc;
    }, {});
  }, [woBoard]);

  const getColValue = (item, colId) => item.column_values?.find(c => c.id === colId)?.text || "";

  const getLinkedId = (item, colId) => {
    const relCol = item.column_values?.find(c => c.id === colId);
    if (!relCol) return null;
    if (Array.isArray(relCol.linked_item_ids) && relCol.linked_item_ids.length > 0) {
      return String(relCol.linked_item_ids[0]);
    }
    if (relCol.value) {
      try {
        const parsed = JSON.parse(relCol.value);
        const linkedIds = parsed.linkedPulseIds || parsed.item_ids || [];
        const first = linkedIds[0];
        if (first) return String(first.linkedPulseId || first.id || first);
      } catch (_) {}
    }
    return null;
  };

  const getDisplayValue = (item, colId) => {
    const relCol = item.column_values?.find(c => c.id === colId);
    return relCol?.display_value || null;
  };

  const filteredItems = items.filter(item => {
    const desc = getColValue(item, MC_COL.DESCRIPTION).toLowerCase();
    const type = getColValue(item, MC_COL.TYPE).toLowerCase();
    const woId = getLinkedId(item, MC_COL.WORK_ORDERS_REL);
    const woName = (workOrderMap[woId] || "").toLowerCase();
    const s = search.toLowerCase();
    return desc.includes(s) || type.includes(s) || woName.includes(s);
  });

  const handleAddCost = useCallback(() => {
    setSelectedItem(null);
    setDrawerOpen(true);
  }, []);

  const isAdmin = auth?.technician?.isAdmin ?? false;

  useBoardHeader({
    title: 'Master Costs',
    count: filteredItems.length,
    countLabel: 'cost lines found',
    buttonLabel: isAdmin ? 'Add Cost Item' : undefined,
    onButtonClick: isAdmin ? handleAddCost : undefined,
  });

  const itemsByGroup = filteredItems.reduce((acc, item) => {
    const groupId = itemGroupMap[item.id]?.id ?? item.group?.id ?? "__ungrouped__";
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(item);
    return acc;
  }, {});

  const COLUMNS = [
    { label: "Date", width: 110 },
    { label: "Item Name", width: 180 },
    { label: "Type", width: 100 },
    { label: "Work Order", width: 200 },
    { label: "Description", width: 260 },
    { label: "Qty", width: 70 },
    { label: "Rate", width: 90 },
    { label: "Total Cost", width: 110 },
    { label: "Technician", width: 160 },
    { label: "Xero Sync ID", width: 140 },
    { label: "Invoice Status", width: 130 },
  ];

  const renderRow = (item) => {
    const type = getColValue(item, MC_COL.TYPE);
    const woId = getLinkedId(item, MC_COL.WORK_ORDERS_REL);
    const woName = workOrderMap[woId] || "—";
    const woIdText = workOrderMap[`${woId}_id`];
    const technicianText = getDisplayValue(item, MC_COL.TECHNICIANS_REL) || "—";
    const xeroSyncId = getColValue(item, MC_COL.XERO_SYNC_ID);

    return (
      <TableRow
        key={item.id}
        hover
        onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}
        sx={{ cursor: "pointer" }}
      >
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.DATE) || "—"}</TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 600 }}>{item.name || "—"}</TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <StatusChip status={type} colorMap={statusColors} />
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <Tooltip title={woIdText ? `ID: ${woIdText}` : ""} placement="top" disableHoverListener={!woIdText}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
              {woName}
            </Typography>
          </Tooltip>
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.DESCRIPTION) || "—"}</TableCell>
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.QUANTITY) || "—"}</TableCell>
        <TableCell sx={DATA_CELL_SX}>
          ${parseFloat(getColValue(item, MC_COL.RATE) || 0).toFixed(2)}
        </TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 700, color: "#22c55e" }}>
          ${parseFloat(getColValue(item, MC_COL.TOTAL_COST) || 0).toFixed(2)}
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: technicianText === "—" ? "#c1bfbc" : "#37352f" }}>
            {technicianText}
          </Typography>
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>
          {xeroSyncId ? (
            <Typography
              sx={{
                fontSize: "0.72rem",
                fontFamily: "monospace",
                color: "#139f77",
                bgcolor: "rgba(19,159,119,0.07)",
                px: 0.75,
                py: 0.25,
                borderRadius: "3px",
                display: "inline-block",
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={xeroSyncId}
            >
              {xeroSyncId}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: "0.8rem", color: "#c1bfbc" }}>—</Typography>
          )}
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <StatusChip
            status={getColValue(item, MC_COL.INVOICE_STATUS) || "Unbilled"}
            colorMap={statusColors}
          />
        </TableCell>
      </TableRow>
    );
  };

  if (loading && !items.length) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  const boardGroups = groups.length > 0
    ? groups
    : [{ id: "__ungrouped__", title: "Cost Items", color: "#6b7280" }];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {boardGroups.map(group => {
          const rows = itemsByGroup[group.id] || [];
          if (rows.length === 0 && search) return null;
          return (
            <BoardGroup key={group.id} label={group.title} color={group.color || "#6b7280"} count={rows.length}>
              <BoardTable
                columns={COLUMNS}
                rows={rows}
                renderRow={renderRow}
                emptyMessage={`No items in ${group.title}`}
                minWidth={1600}
              />
            </BoardGroup>
          );
        })}
      </Box>

      <MasterCostDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        costItem={selectedItem}
      />
    </Box>
  );
}
