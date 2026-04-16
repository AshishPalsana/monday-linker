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
  IconButton,
  Tooltip,
} from "@mui/material";
import { useBoardHeader, useBoardHeaderContext } from "../contexts/BoardHeaderContext";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { MONDAY_COLUMNS, COST_TYPE_HEX } from "../constants/index";
import { BoardGroup, BoardTable, DATA_CELL_SX } from "./BoardTable";
import MasterCostDrawer from "./MasterCostDrawer";
import StatusChip from "./StatusChip";
import { useAuth } from "../hooks/useAuth";

const MC_COL = MONDAY_COLUMNS.MASTER_COSTS;
const WO_COL = MONDAY_COLUMNS.WORK_ORDERS;

export default function MasterCostsBoard() {
  const dispatch = useDispatch();
  const { auth } = useAuth();
  const { items, loading, error, statusColors } = useSelector((s) => s.masterCosts);
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

  useBoardHeader({
    title: 'Master Costs',
    count: filteredItems.length,
    countLabel: 'cost lines found',
    buttonLabel: 'Add Cost Item',
    onButtonClick: handleAddCost,
  });

  const itemsByType = filteredItems.reduce((acc, item) => {
    const type = getColValue(item, MC_COL.TYPE) || "Other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const COLUMNS = [
    { label: "Date", width: 120 },
    { label: "Type", width: 100 },
    { label: "Work Order", width: 220 },
    { label: "Description", width: 300 },
    { label: "Qty", width: 80 },
    { label: "Rate", width: 100 },
    { label: "Total Cost", width: 120 },
    { label: "Status", width: 120 },
    { label: "Actions", width: 100 },
  ];

  const renderRow = (item) => {
    const type = getColValue(item, MC_COL.TYPE);
    const woId = getColValue(item, MC_COL.WORK_ORDERS_REL);
    
    return (
      <TableRow key={item.id} hover>
        <TableCell sx={DATA_CELL_SX}>{getColValue(item, MC_COL.DATE) || "—"}</TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <StatusChip status={type} colorMap={statusColors} />
        </TableCell>
        <TableCell sx={DATA_CELL_SX}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
            {workOrderMap[`${woId}_display`] || woId || "—"}
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
        <TableCell sx={DATA_CELL_SX}>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => { setSelectedItem(item); setDrawerOpen(true); }}>
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton 
                size="small" 
                color="error" 
                onClick={() => {
                  if (window.confirm("Delete this cost item?")) {
                    dispatch(deleteMasterCost({ mondayItemId: item.id, token: auth?.token }));
                  }
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
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

  const types = ["Labor", "Parts", "Expense"];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
        {types.map(type => {
          const rows = itemsByType[type] || [];
          if (rows.length === 0 && search) return null;
          return (
            <BoardGroup key={type} label={type} color={COST_TYPE_HEX[type]} count={rows.length}>
              <BoardTable
                columns={COLUMNS}
                rows={rows}
                renderRow={renderRow}
                emptyMessage={`No ${type} costs recorded`}
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
