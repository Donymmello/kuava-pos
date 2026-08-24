import { useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, useTheme } from '@mui/material';
import { TopProduct } from '../../types';

interface TopProductsListProps {
  data: TopProduct[];
}

export default function TopProductsList({ data }: TopProductsListProps) {
  const theme = useTheme();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const maxValue = useMemo(() => Math.max(1, ...data.map((d) => d.quantitySold)), [data]);
  const barColor = theme.palette.primary.main;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Produtos mais vendidos (este mês)
      </Typography>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Ainda não há produtos vendidos este mês.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {data.map((product, index) => {
            const widthPct = (product.quantitySold / maxValue) * 100;
            const isHovered = hoveredId === product.productId;

            return (
              <Box
                key={product.productId}
                onMouseEnter={() => setHoveredId(product.productId)}
                onMouseLeave={() => setHoveredId((current) => (current === product.productId ? null : current))}
              >
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {index + 1}. {product.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, pl: 1 }}
                  >
                    {product.quantitySold} un.
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
                      width: `${Math.max(widthPct, 2)}%`,
                      bgcolor: barColor,
                      borderRadius: '0 4px 4px 0',
                      opacity: isHovered ? 1 : 0.85,
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
