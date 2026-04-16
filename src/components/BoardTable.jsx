import { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// ─── Style tokens ──────────────────────────────────────────────────────────────

export const HEAD_CELL_SX = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '0.68rem',
  fontWeight: 500,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  bgcolor: 'background.default',
  borderBottom: '1px solid',
  borderColor: 'divider',
  py: '9px',
  px: '14px',
};

export const DATA_CELL_SX = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: '0.8rem',
  color: 'text.primary',
  py: '9px',
  px: '14px',
  maxWidth: 0,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

export const ROW_SX = {
  '&:last-child td, &:last-child th': { borderBottom: 0 },
  transition: 'background 0.1s',
  '&:hover': { bgcolor: 'action.hover' },
};

export const DASH = <span style={{ color: '#9ba6b4' }}>—</span>;

// ─── TruncCell ─────────────────────────────────────────────────────────────────

export function TruncCell({ value, sx }) {
  if (!value) {
    return (
      <TableCell sx={{ ...DATA_CELL_SX, ...sx }}>
        {DASH}
      </TableCell>
    );
  }

  return (
    <Tooltip title={value} placement="top" enterDelay={600} arrow>
      <TableCell sx={{ ...DATA_CELL_SX, ...sx }}>
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </span>
      </TableCell>
    </Tooltip>
  );
}

// ─── BoardTable ────────────────────────────────────────────────────────────────

export function BoardTable({
  columns,
  rows,
  renderRow,
  emptyMessage = 'No items',
  minWidth = 800,
  maxHeight = 480,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TableContainer sx={{ overflowX: 'auto', maxHeight, overflowY: 'auto' }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            minWidth,
          }}
        >
          <colgroup>
            {columns.map((col, i) => (
              <col key={i} style={{ width: col.width }} />
            ))}
          </colgroup>

          <TableHead>
            <TableRow>
              {columns.map((col, i) => (
                <TableCell
                  key={i}
                  sx={{ ...HEAD_CELL_SX, ...(col.headSx ?? {}) }}
                >
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
                  sx={{
                    textAlign: 'center',
                    py: 5,
                    color: 'text.disabled',
                    fontSize: '0.8rem',
                    border: 0,
                  }}
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

// ─── BoardGroup ────────────────────────────────────────────────────────────────

export function BoardGroup({ label, color, count, children }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={{ mb: 3.5 }}>
      <Box
        onClick={() => setCollapsed((prev) => !prev)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
          cursor: 'pointer',
          userSelect: 'none',
          width: 'fit-content',
          '&:hover': { opacity: 0.75 },
          transition: 'opacity 0.15s',
        }}
      >
        <IconButton
          size="small"
          disableRipple
          sx={{ p: 0, color, '&:hover': { bgcolor: 'transparent' } }}
        >
          {collapsed
            ? <ChevronRightIcon sx={{ fontSize: 16 }} />
            : <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
        </IconButton>

        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '3px',
            bgcolor: color,
            flexShrink: 0,
          }}
        />

        <Typography
          variant="subtitle2"
          sx={{ color, fontSize: '0.75rem', fontWeight: 600, lineHeight: 1 }}
        >
          {label}
        </Typography>

        <Chip
          label={count}
          size="small"
          sx={{
            height: 17,
            fontSize: '0.62rem',
            fontWeight: 600,
            bgcolor: `${color}1a`,
            color,
            border: `1px solid ${color}33`,
            borderRadius: '4px',
            '& .MuiChip-label': { px: '6px' },
          }}
        />
      </Box>

      <Collapse in={!collapsed} timeout={180}>
        {children}
      </Collapse>
    </Box>
  );
}