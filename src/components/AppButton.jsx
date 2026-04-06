import { Button } from "@mui/material";

/**
 * AppButton — shared action button used across the platform.
 * Matches the Clock In / Clock Out style: flat contained button,
 * no box-shadow, bold label, tight vertical padding.
 *
 * Props (all MUI Button props are forwarded):
 *   variant   – "contained" | "outlined" | "text"  (default: "contained")
 *   color     – MUI palette key                     (default: "primary")
 *   size      – "small" | "medium" | "large"       (default: "medium")
 *   fullWidth – boolean
 *   startIcon – React node
 *   endIcon   – React node
 *   onClick   – handler
 *   sx        – extra sx overrides
 */
export default function AppButton({
  children,
  variant = "contained",
  color = "primary",
  size = "medium",
  fullWidth,
  startIcon,
  endIcon,
  onClick,
  disabled,
  type,
  sx,
  ...rest
}) {
  return (
    <Button
      variant={variant}
      color={color}
      size={size}
      fullWidth={fullWidth}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      disabled={disabled}
      type={type}
      sx={{
        textTransform: "none",
        fontWeight: 700,
        borderRadius: 1,
        py: 1.1,
        fontSize: 13,
        boxShadow: "none",
        "&:hover": { boxShadow: "none" },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
