import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CartItem } from '../../types';
import { formatMzn } from '../../utils/currency';

interface CartTableProps {
  items: CartItem[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
}

export default function CartTable({ items, onIncrement, onDecrement, onRemove }: CartTableProps) {
  if (items.length === 0) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Carrinho vazio. Leia um código de barras para começar.</Typography>
      </Box>
    );
  }

  return (
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell>Produto</TableCell>
          <TableCell align="center">Qtd.</TableCell>
          <TableCell align="right">Preço</TableCell>
          <TableCell align="right">Subtotal</TableCell>
          <TableCell align="right" />
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.productId} hover>
            <TableCell sx={{ maxWidth: 160 }}>
              <Typography variant="body2" noWrap title={item.name}>
                {item.name}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.25}>
                <IconButton size="small" onClick={() => onDecrement(item.productId)}>
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
                <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                  {item.quantity}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onIncrement(item.productId)}
                  disabled={item.quantity >= item.stockQuantity}
                >
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            </TableCell>
            <TableCell align="right">{formatMzn(item.unitPrice)}</TableCell>
            <TableCell align="right">{formatMzn(item.unitPrice * item.quantity)}</TableCell>
            <TableCell align="right">
              <IconButton size="small" color="error" onClick={() => onRemove(item.productId)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
