import { ReactNode } from 'react';
import { Paper, Stack, Typography } from '@mui/material';

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: 'default' | 'warning';
  icon?: ReactNode;
}

export default function StatTile({ label, value, sublabel, accent = 'default', icon }: StatTileProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        height: '100%',
        borderColor: accent === 'warning' ? 'warning.main' : 'divider',
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {icon}
        </Stack>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: accent === 'warning' ? 'warning.main' : 'text.primary',
          }}
        >
          {value}
        </Typography>
        {sublabel && (
          <Typography variant="caption" color="text.secondary">
            {sublabel}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
