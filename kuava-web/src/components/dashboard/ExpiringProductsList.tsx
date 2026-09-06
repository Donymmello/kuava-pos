import { Chip, Paper, Stack, Typography } from '@mui/material';
import { ExpiringProduct } from '../../types';

interface ExpiringProductsListProps {
  data: ExpiringProduct[];
}

/** Rótulo curto e cor do chip conforme a urgência, expirado, esta semana, ou dentro da janela de 30 dias. */
function urgency(daysUntilExpiry: number): { label: string; color: 'error' | 'warning' | 'default' } {
  if (daysUntilExpiry < 0) {
    return { label: 'Expirado', color: 'error' };
  }
  if (daysUntilExpiry === 0) {
    return { label: 'Expira hoje', color: 'error' };
  }
  if (daysUntilExpiry <= 7) {
    return { label: `${daysUntilExpiry} dia${daysUntilExpiry === 1 ? '' : 's'}`, color: 'warning' };
  }
  return { label: `${daysUntilExpiry} dias`, color: 'default' };
}

export default function ExpiringProductsList({ data }: ExpiringProductsListProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Validade a aproximar-se
      </Typography>

      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhum produto com validade nos próximos 30 dias.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {data.map((product) => {
            const { label, color } = urgency(product.daysUntilExpiry);
            return (
              <Stack
                key={product.productId}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
              >
                <Typography
                  variant="body2"
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {product.name}
                </Typography>
                <Chip size="small" label={label} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
