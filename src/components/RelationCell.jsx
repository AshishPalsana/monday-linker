import { useState, useRef } from "react";
import { Box, Chip, Autocomplete, TextField } from "@mui/material";

export default function RelationCell({
  value,
  options,
  placeholder,
  chipBgColor,
  chipTextColor,
  chipBorderColor,
  createLabel,
  onSelectExisting,
  onCreateNew,
  readOnly = false,
}) {
  const [editing, setEditing] = useState(false);
  const mouseDownOnOption = useRef(false);

  if (!editing) {
    return (
      <Box
        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        onClick={(e) => e.stopPropagation()}
      >
        {value ? (
          <Chip
            label={value}
            size="small"
            onClick={readOnly ? undefined : () => setEditing(true)}
            sx={{
              maxWidth: 150,
              fontSize: "0.72rem",
              height: 22,
              bgcolor: chipBgColor,
              color: chipTextColor,
              border: `1px solid ${chipBorderColor}`,
              cursor: readOnly ? "default" : "pointer",
            }}
          />
        ) : (
          <Box
            onClick={readOnly ? undefined : () => setEditing(true)}
            sx={{
              color: "text.disabled",
              fontSize: "0.75rem",
              cursor: readOnly ? "default" : "pointer",
              px: 0.5,
              ...(!readOnly && { "&:hover": { color: "primary.main" } }),
            }}
          >
            {readOnly ? "—" : placeholder}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{ position: "relative", height: "22px" }}
    >
      <Box aria-hidden sx={{ height: "22px" }} />

      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: -4,
          transform: "translateY(-50%)",
          zIndex: 20,
        }}
      >
        <Autocomplete
          size="small"
          open
          autoFocus
          options={options}
          getOptionLabel={(o) => (typeof o === "string" ? o : o.name || "")}
          filterOptions={(opts, { inputValue }) => {
            const filtered = opts.filter((o) =>
              (o.name || "").toLowerCase().includes(inputValue.toLowerCase()),
            );
            if (
              inputValue &&
              !filtered.some(
                (o) =>
                  (o.name || "").toLowerCase() === inputValue.toLowerCase(),
              )
            ) {
              filtered.push({
                id: "__new__",
                name: `Add "${inputValue}" as new ${createLabel}`,
                inputValue,
              });
            }
            return filtered;
          }}
          onChange={(_, val) => {
            mouseDownOnOption.current = false;
            setEditing(false);
            if (!val) return;
            if (val.id === "__new__") {
              onCreateNew(val.inputValue);
            } else {
              onSelectExisting(val.id, val.name);
            }
          }}
          onBlur={() => {
            if (!mouseDownOnOption.current) setEditing(false);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              placeholder="Search or create…"
              sx={{
                minWidth: 180,
                "& .MuiOutlinedInput-root": {
                  height: 30,
                  fontSize: "0.8rem",
                  bgcolor: "background.paper",
                  borderRadius: "6px",
                },
              }}
            />
          )}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            return (
              <Box
                component="li"
                key={key}
                {...rest}
                onMouseDown={() => {
                  mouseDownOnOption.current = true;
                }}
                sx={{
                  fontSize: "0.8rem",
                  ...(option.id === "__new__"
                    ? { color: "primary.main", fontWeight: 600 }
                    : {}),
                }}
              >
                {option.id === "__new__" ? `+ ${option.name}` : option.name}
              </Box>
            );
          }}
          componentsProps={{
            popper: {
              placement: "bottom-start",
              modifiers: [
                {
                  name: "preventOverflow",
                  enabled: true,
                  options: { boundary: "viewport" },
                },
              ],
            },
          }}
          sx={{ width: 220 }}
        />
      </Box>
    </Box>
  );
}
