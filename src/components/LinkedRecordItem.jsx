import { Box, Typography, Stack, Chip, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  'In Progress': { bg: '#dbeafe', color: '#1d4ed8' },
  'Completed':   { bg: '#d3f8e2', color: '#0d6e48' },
  'Cancelled':   { bg: '#fde8e8', color: '#b91c1c' },
  'On Hold':     { bg: '#fef3c7', color: '#92400e' },
  'Unscheduled': { bg: '#f1f1ef', color: '#787774' },
};

export function StatusBadge({ label }) {
  const colors = STATUS_COLORS[label] || { bg: '#f1f1ef', color: '#787774' };
  return (
    <Box component="span" sx={{ 
      ml: 0.75, 
      px: 0.75, 
      py: '1px', 
      borderRadius: '3px', 
      bgcolor: colors.bg, 
      color: colors.color, 
      fontSize: '0.65rem', 
      fontWeight: 600, 
      whiteSpace: 'nowrap', 
      flexShrink: 0 
    }}>
      {label}
    </Box>
  );
}

export function RecordPill({ name, statusLabel, bgColor, textColor, borderColor, type, id }) {
  const navigate = useNavigate();
  
  const handleNavigate = (e) => {
    e.stopPropagation();
    if (!type || !id) return;
    
    let path = '';
    switch (type.toLowerCase()) {
      case 'workorder': path = `/workorders/${id}`; break;
      case 'customer':  path = `/customers/${id}`; break;
      case 'location':  path = `/locations/${id}`; break;
      case 'equipment': path = `/equipment/${id}`; break;
      default: break;
    }
    
    if (path) navigate(path);
  };

  return (
    <Box 
      onClick={handleNavigate}
      sx={{
        display: 'inline-flex', 
        alignItems: 'center',
        px: 1.25, 
        py: '4px',
        bgcolor: bgColor, 
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '5px', 
        fontSize: '0.775rem', 
        fontWeight: 500,
        maxWidth: 240,
        cursor: type && id ? 'pointer' : 'default',
        '&:hover': (type && id) ? {
          filter: 'brightness(0.96)',
          borderColor: textColor + '44',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        } : {},
        transition: 'all 0.1s ease-in-out'
      }}
    >
      <Typography component="span" sx={{ 
        fontSize: 'inherit', 
        fontWeight: 'inherit', 
        overflow: 'hidden',
        textOverflow: 'ellipsis', 
        whiteSpace: 'nowrap', 
        color: textColor 
      }}>
        {name}
      </Typography>
      {statusLabel && <StatusBadge label={statusLabel} />}
    </Box>
  );
}

export function LinkedGroup({ icon: Icon, label, iconColor, items, renderItem }) {
  if (!items.length) return null;
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.75 }}>
        <Icon sx={{ fontSize: 13, color: iconColor || '#9b9a97' }} />
        <Typography sx={{ fontSize: '0.73rem', color: '#9b9a97', fontWeight: 500 }}>
          {label} <Box component="span" sx={{ color: '#c1bfbc' }}>({items.length})</Box>
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
        {items.map(renderItem)}
      </Box>
    </Box>
  );
}

/**
 * A more detailed record view (table-like) for linked items.
 */
export function LinkedTable({ icon: Icon, label, iconColor, items, columns, onNavigate }) {
  const navigate = useNavigate();
  if (!items || !items.length) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1, px: 1 }}>
        <Icon sx={{ fontSize: 13, color: iconColor || '#9b9a97' }} />
        <Typography sx={{ fontSize: '0.73rem', color: '#9b9a97', fontWeight: 600, letterSpacing: '0.02em' }}>
          {label.toUpperCase()} <Box component="span" sx={{ color: '#c1bfbc', fontWeight: 500 }}>({items.length})</Box>
        </Typography>
      </Box>
      
      <Box sx={{ 
        border: '1px solid #e8e6e1', 
        borderRadius: '6px', 
        bgcolor: '#fff',
        overflow: 'hidden'
      }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: '420px' }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
              bgcolor: '#fafafa',
              borderBottom: '1px solid #e8e6e1',
              px: 1.5,
              py: 0.75
            }}>
              {columns.map((col, i) => (
                <Typography key={i} sx={{ fontSize: '0.65rem', color: '#9b9a97', fontWeight: 700, textTransform: 'uppercase' }}>
                  {col.label}
                </Typography>
              ))}
            </Box>

            <Stack divider={<Divider />}>
              {items.map((item) => (
                <Box 
                  key={item.id}
                  onClick={() => onNavigate(item)}
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f7f6f3' },
                    transition: 'background 0.1s'
                  }}
                >
                  {columns.map((col, i) => {
                    const value = col.getValue ? col.getValue(item) : (item[col.key] || '');
                    return (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', pr: 1, overflow: 'hidden' }}>
                        {col.isStatus ? (
                          value ? <StatusBadge label={value} /> : <Typography sx={{ color: '#c1bfbc', fontSize: '0.75rem' }}>—</Typography>
                        ) : (
                          <Typography sx={{ 
                            fontSize: '0.75rem', 
                            color: '#37352f',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {value || '—'}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
