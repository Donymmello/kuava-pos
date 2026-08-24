import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import { Product } from '../../types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onSelect: (product: Product) => void;
}

export default function ProductGrid({ products, loading, onSelect }: ProductGridProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (products.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Nenhum produto encontrado.</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={1.5}>
      {products.map((product) => (
        <Grid item xs={6} sm={4} md={3} key={product.id}>
          <ProductCard product={product} onSelect={onSelect} />
        </Grid>
      ))}
    </Grid>
  );
}
