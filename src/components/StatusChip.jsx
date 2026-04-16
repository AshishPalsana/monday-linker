import { Chip } from '@mui/material'
import { STATUS_HEX } from '../constants/index'

export default function StatusChip({ status, colorMap, size = 'small', onClick }) {
  if (!status) return null;

  const map = colorMap || STATUS_HEX;

  // Handle case-insensitive matching if needed, though constants are usually specific
  const color = map[status] || map[status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()] || '#94a3b8';

  return (
    <Chip
      label={status}
      size={size}
      onClick={onClick}
      sx={{
        bgcolor: color,
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.725rem',
        height: 24,
        borderRadius: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
        '& .MuiChip-label': {
          px: 1.5,
        },
        '&:hover': onClick ? { 
          opacity: 0.9,
          transform: 'translateY(-1px)',
        } : {
          bgcolor: color,
        },
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}