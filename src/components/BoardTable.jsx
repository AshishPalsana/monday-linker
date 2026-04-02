
import { useState } from 'react';
import {
  Box, Chip, Collapse, IconButton, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export const HEAD_CELL_SX = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  color: 'text.secondary',
  bgcolor: 'background.paper',
  borderBottom: '1px solid',
  borderColor: 'divider',
  py: 1,
  px: 1.5,
};

export const DATA_CELL_SX = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '0.75rem',
  color: 'text.secondary',
  py: '7px',
  px: 1.5,
  maxWidth: 0,
};

export const DASH = <span style={{ color: '#9ba6b4' }}>—</span>;

export function TruncCell({ value, sx }) {
  if (!value) return <TableCell sx={{ ...DATA_CELL_SX, ...sx }}>{DASH}</TableCell>;
  return (
    <Tooltip title={value} placement="top" enterDelay={600} arrow>
      <TableCell sx={{ ...DATA_CELL_SX, ...sx }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </span>
      </TableCell>
    </Tooltip>
  );
}

export function BoardTable({
  columns,
  rows,
  renderRow,
  emptyMessage = 'No items',
  minWidth = 800,
  maxHeight = 500,
}) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
    >
      <TableContainer sx={{ overflowX: 'auto', maxHeight, overflowY: 'auto' }}>
        <Table
          size="small"
          stickyHeader
          sx={{ borderCollapse: 'separate', tableLayout: 'fixed', minWidth }}
        >
          <colgroup>
            {columns.map((col, i) => (
              <col key={i} style={{ width: col.width }} />
            ))}
          </colgroup>

          <TableHead>
            <TableRow>
              {columns.map((col, i) => (
                <TableCell key={i} sx={{ ...HEAD_CELL_SX, ...(col.headSx || {}) }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  sx={{ textAlign: 'center', py: 4, color: 'text.disabled', fontSize: '0.8rem' }}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => renderRow(item))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export function BoardGroup({ label, color, count, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ mb: 4 }}>
      {/* Group header */}
      <Box
        onClick={() => setCollapsed((prev) => !prev)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, mb: 1,
          cursor: 'pointer', '&:hover': { opacity: 0.8 },
        }}
      >
        <IconButton size="small" sx={{ p: 0, color }}>
          {collapsed
            ? <ChevronRightIcon fontSize="small" />
            : <KeyboardArrowDownIcon fontSize="small" />}
        </IconButton>
        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color }} />
        <Typography variant="subtitle2" sx={{ color, fontSize: '0.8rem', fontWeight: 700 }}>
          {label}
        </Typography>
        <Chip
          label={count}
          size="small"
          sx={{
            height: 18, fontSize: '0.65rem', fontWeight: 700,
            bgcolor: color + '22', color, border: `1px solid ${color}44`,
          }}
        />
      </Box>

      <Collapse in={!collapsed} timeout={200}>
        {children}
      </Collapse>
    </Box>
  );
}
