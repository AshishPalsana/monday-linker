import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2', light: '#63a4ff', dark: '#004ba0' },
    secondary: { main: '#9c27b0' },
    success: { main: '#388e3c' },
    warning: { main: '#fbc02d' },
    error: { main: '#d32f2f' },
    background: { default: '#f5f5f5', paper: '#fff' },
    divider: '#e0e0e0',
    text: { primary: '#212121', secondary: '#757575', disabled: '#bdbdbd' },
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.3px' },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem' },
  },
  shape: { borderRadius: 5 },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { backgroundColor: '#f5f5f5' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', border: '1px solid #e0e0e0' } } },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 6, fontSize: '0.8125rem' },
        containedPrimary: { boxShadow: '0 0 0 1px rgba(25,118,210,0.15), 0 4px 12px rgba(25,118,210,0.10)' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 6,
            backgroundColor: '#fff',
            '& fieldset': { borderColor: '#e0e0e0' },
            '&:hover fieldset': { borderColor: '#bdbdbd' },
            '&.Mui-focused fieldset': { borderColor: '#1976d2' },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#fff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e0e0' },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 600, fontSize: '0.7rem' } } },
    MuiDialog: { styleOverrides: { paper: { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 16 } } },
    MuiDialogTitle: { styleOverrides: { root: { paddingBottom: 8 } } },
    MuiTableHead: { styleOverrides: { root: { '& .MuiTableCell-head': { backgroundColor: '#f5f5f5', fontWeight: 600, fontSize: '0.75rem', color: '#757575', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e0e0e0' } } } },
    MuiTableCell: { styleOverrides: { root: { borderBottom: '1px solid #e0e0e0', fontSize: '0.8125rem', padding: '10px 14px' } } },
    MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: '#eeeeee' }, transition: 'background 0.1s' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', minHeight: 44 } } },
    MuiAutocomplete: {
      styleOverrides: {
        paper: { background: '#fff', border: '1px solid #e0e0e0' },
        option: { fontSize: '0.8125rem', '&:hover': { backgroundColor: '#e3f2fd' } },
      },
    },
    MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.75rem', borderRadius: 6 } } },
  },
});

export default theme;