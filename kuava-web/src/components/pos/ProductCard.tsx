import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { Product } from '../../types';
import { formatMzn } from '../../utils/currency';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const outOfStock = product.stock_quantity <= 0;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea
        onClick={() => onSelect(product)}
        disabled={outOfStock}
        sx={{ height: '100%', p: 1.5 }}
      >
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          <Stack spacing={0.75}>
            <Box
              sx={{
                width: '100%',
                aspectRatio: '4 / 3',
                borderRadius: 1,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {product.image_url ? (
                <Box
                  component="img"
                  src={product.image_url}
                  alt={product.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Inventory2OutlinedIcon fontSize="large" color="disabled" />
              )}
            </Box>
            <Typography variant="subtitle2" noWrap title={product.name}>
              {product.name}
            </Typography>
            <Typography variant="h6" color="primary.main">
              {formatMzn(product.price)}
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {product.category ?? 'Sem categoria'}
              </Typography>
              <Chip
                size="small"
                label={outOfStock ? 'Sem stock' : `${product.stock_quantity} un.`}
                color={outOfStock ? 'error' : 'default'}
                variant={outOfStock ? 'filled' : 'outlined'}
              />
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
