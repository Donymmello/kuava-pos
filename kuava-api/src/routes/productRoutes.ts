import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import {
  createProduct,
  deleteProduct,
  getProductByBarcode,
  getProductById,
  listProducts,
  updateProduct,
} from '../controllers/productController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Leitura disponível a qualquer perfil autenticado (o caixa precisa de ver
// os produtos no POS); gerir o catálogo fica reservado a ADMIN/MANAGER.
router.get('/', listProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.MANAGER), createProduct);
router.put('/:id', requireRole(UserRole.ADMIN, UserRole.MANAGER), updateProduct);
router.delete('/:id', requireRole(UserRole.ADMIN, UserRole.MANAGER), deleteProduct);

export default router;
