import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TableRow,
  TableCell,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function AddItemRow({ onAdd, placeholder = 'Add Item', colSpan = 5, bgcolor = 'rgba(79, 142, 247, 0.08)', hoverColor = 'rgba(79, 142, 247, 0.04)' }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setEditing(false);
    }
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  if (!editing) {
    return (
      <TableRow
        onClick={() => setEditing(true)}
        sx={{
          cursor: 'pointer',
          '&:hover': { bgcolor: hoverColor },
          transition: 'background-color 0.2s',
        }}
      >
        <TableCell colSpan={colSpan} sx={{ py: 1, borderBottom: 'none' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled', pl: 1 }}>
            <AddIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
              {placeholder}
            </Typography>
          </Box>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow sx={{ bgcolor }}>
      <TableCell colSpan={colSpan} sx={{ py: 0.5, borderBottom: 'none' }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 1 }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            variant="standard"
            placeholder="Item name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (!value.trim()) setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditing(false);
                setValue('');
              }
            }}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '0.8rem',
                fontWeight: 600,
                px: 1,
                py: 0.5,
                bgcolor: 'background.paper',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: 'primary.main',
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={!value.trim()}
            sx={{
              minWidth: 60,
              height: 28,
              fontSize: '0.7rem',
              textTransform: 'none',
              borderRadius: '4px',
            }}
          >
            Add
          </Button>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(false);
              setValue('');
            }}
            sx={{
              minWidth: 60,
              height: 28,
              fontSize: '0.7rem',
              textTransform: 'none',
              color: 'text.secondary',
            }}
          >
            Cancel
          </Button>
        </Box>
      </TableCell>
    </TableRow>
  );
}
