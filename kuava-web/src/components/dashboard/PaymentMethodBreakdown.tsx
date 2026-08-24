import { useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, useTheme } from '@mui/material';
import { PaymentMethodTotal, PAYMENT_METHOD_LABELS } from '../../types';
import { getPaymentMethodColor } from '../../theme/chartTokens';
import { formatMzn } from '../../utils/currency';

interface PaymentMethodBreakdownProps {
  data: PaymentMethodTotal[];
}

export default function PaymentMethodBreakdown({ data }: PaymentMethodBreakdownProps) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  const maxValue = useMemo(() => Math.max(1, ...data.map((d) => d.totalAmount)), [data]);
  const sorted = useMemo(() => [...data].sort((a, b) => b.totalAmount - a.totalAmount), [data]);
  const hasAnyValue = data.some((d) => d.totalAmount > 0);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Vendas por método de pagamento (este mês)
      </Typography>

      {!hasAnyValue ? (
        <Typography variant="body2" color="text.secondary">
          Ainda não há vendas registadas este mês.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {sorted.map((entry) => {
            const color = getPaymentMethodColor(entry.paymentMethod, mode);
            const widthPct = (entry.totalAmount / maxValue) * 100;
            const isHovered = hoveredMethod === entry.paymentMethod;

            return (
              <Box
                key={entry.paymentMethod}
                onMouseEnter={() => setHoveredMethod(entry.paymentMethod)}
                onMouseLeave={() => setHoveredMethod((current) => (current === entry.paymentMethod ? null : current))}
              >
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {PAYMENT_METHOD_LABELS[entry.paymentMethod]}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMzn(entry.totalAmount)} · {entry.count}{' '}
                    {entry.count === 1 ? 'venda' : 'vendas'}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    height: 14,
                    bgcolor: theme.palette.action.hover,
                    borderRadius: '0 4px 4px 0',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${Math.max(widthPct, entry.totalAmount > 0 ? 2 : 0)}%`,
                      bgcolor: color,
                      borderRadius: '0 4px 4px 0',
                      opacity: isHovered ? 1 : 0.9,
                      transition: 'opacity 0.1s ease, width 0.2s ease',
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
