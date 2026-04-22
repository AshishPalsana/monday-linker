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
      acc[`${item.id}_display`] = woIdCol?.text || item.name;
      return acc;
    }, {});
  }, [woBoard]);

  const getColValue = (item, colId) => item.column_values?.find(c => c.id === colId)?.text || "";

  const filteredItems = items.filter(item => {
    const desc = getColValue(item, MC_COL.DESCRIPTION).toLowerCase();
    const type = getColValue(item, MC_COL.TYPE).toLowerCase();
    const wo = workOrderMap[getColValue(item, MC_COL.WORK_ORDERS_REL)]?.toLowerCase() || "";
    const s = search.toLowerCase();
    return desc.includes(s) || type.includes(s) || wo.includes(s);
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
    const groupId = itemGroupMap[item.id]?.id ?? "__ungrouped__";
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(item);
    return acc;
  }, {});

  const COLUMNS = [
    { label: "Date", width: 120 },
    { label: "Item Name", width: 200 },
    { label: "Type", width: 100 },
    { label: "Work Order", width: 220 },
    { label: "Description", width: 300 },
    { label: "Qty", width: 80 },
    { label: "Rate", width: 100 },
    { label: "Total Cost", width: 120 },
    { label: "Status", width: 120 },
  ];

  const renderRow = (item) => {
    const type = getColValue(item, MC_COL.TYPE);
    
    const relCol = item.column_values?.find(c => c.id === MC_COL.WORK_ORDERS_REL);
    let woId = null;
    if (Array.isArray(relCol?.linked_item_ids) && relCol.linked_item_ids.length > 0) {
      woId = String(relCol.linked_item_ids[0]);
    } else if (relCol?.value) {
      try {
        const parsed = JSON.parse(relCol.value);
        const linkedIds = parsed.linkedPulseIds || parsed.item_ids || [];
        woId = String(linkedIds[0]?.linkedPulseId || linkedIds[0]?.id || linkedIds[0] || "");
      } catch (_) {}
    }

    return (
      <TableRow key={item.id} hover onClick={() => { setSelectedItem(item); setDrawerOpen(true); }} sx={{ cursor: "pointer" }}>
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.DATE) || "—"}</TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 600 }}>{item.name || "—"}</TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <StatusChip status={type} colorMap={statusColors} />
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
            {workOrderMap[`${woId}_display`] || workOrderMap[woId] || woId || "—"}
          </Typography>
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.DESCRIPTION) || "—"}</TableCell>
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.QUANTITY)}</TableCell>
        <TableCell sx={DATA_CELL_SX}>${parseFloat(getColValue(item, MC_COL.RATE) || 0).toFixed(2)}</TableCell>
        <TableCell sx={{ ...DATA_CELL_SX, fontWeight: 700, color: "#22c55e" }}>
          ${parseFloat(getColValue(item, MC_COL.TOTAL_COST) || 0).toFixed(2)}
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
                minWidth={1300}
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
