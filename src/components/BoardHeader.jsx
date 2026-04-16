import { Box, Typography, InputBase, useMediaQuery, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import AppButton from './AppButton';
import { useBoardHeaderContext } from '../contexts/BoardHeaderContext';

export default function BoardHeader() {
  const context = useBoardHeaderContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (!context?.title) return null;

  const {
    title,
    count,
    countLabel,
    search,
    setSearch,
    buttonLabel,
    onButtonClick,
    extra,
  } = context;

  const showSearch = search !== undefined && setSearch != null;

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
        zIndex: 10,
      }}
    >
      {/* Top row: title + actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          minHeight: { xs: 52, sm: 58 },
        }}
      >
        {/* Title block */}
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25 }}>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.1rem' },
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
                color: 'text.primary',
              }}
            >
              {title}
            </Typography>
            {count != null && (
              <Typography
                component="span"
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: 'text.disabled',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '4px',
                  px: '6px',
                  py: '1px',
                  lineHeight: 1.6,
                  flexShrink: 0,
                }}
              >
                {count}
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          {showSearch && !isMobile && (
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder={`Search ${title.toLowerCase()}…`}
            />
          )}

          {extra}

          {buttonLabel && (
            <AppButton
              startIcon={<AddIcon sx={{ fontSize: '16px !important' }} />}
              onClick={onButtonClick}
              size="small"
              sx={{ flexShrink: 0, height: 34 }}
            >
              {!isMobile ? buttonLabel : null}
            </AppButton>
          )}
        </Box>
      </Box>

      {/* Mobile search bar — full width below title row */}
      {showSearch && isMobile && (
        <Box sx={{ pb: 1.5 }}>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={`Search ${title.toLowerCase()}…`}
            fullWidth
          />
        </Box>
      )}
    </Box>
  );
}

function SearchBox({ value, onChange, placeholder, fullWidth = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        height: 34,
        px: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '6px',
        bgcolor: 'background.default',
        width: fullWidth ? '100%' : 240,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: '0 0 0 3px rgba(79,142,247,0.12)',
          bgcolor: 'background.paper',
        },
      }}
    >
      <SearchIcon sx={{ fontSize: 15, color: 'text.disabled', flexShrink: 0 }} />
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{
          flex: 1,
          fontSize: '0.8rem',
          color: 'text.primary',
          '& input': {
            p: 0,
            '&::placeholder': { color: 'text.disabled', opacity: 1 },
          },
        }}
      />
    </Box>
  );
}