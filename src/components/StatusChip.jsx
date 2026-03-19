import { Chip } from '@mui/material'
import { STATUS_HEX } from '../constants'

export default function StatusChip({ status, size = 'small', onClick }) {
  const color = STATUS_HEX[status] || '#6b7280'
  return (
    <Chip
      label={status}
      size={size}
      onClick={onClick}
      sx={{
        bgcolor: color + '22',
        color: color,
        border: `1px solid ${color}44`,
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 22,
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: color + '33' } : {},
      }}
    />
  )
}