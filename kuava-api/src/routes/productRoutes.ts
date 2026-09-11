import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireActiveSubscription } from '../middlewares/subscriptionMiddleware';
import {
  createProduct,
  deleteProduct,
  getProductByBarcode,
  getProductById,
  listProducts,
  updateProduct,
} from '../controllers/productController';
import {
  createProductLot,
  deleteProductLot,
  listProductLots,
} from '../controllers/productLotController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireActiveSubscription);

// Leitura disponível a qualquer perfil autenticado (o caixa precisa de ver
// os produtos no POS); gerir o catálogo fica reservado a ADMIN/MANAGER.
router.get('/', listProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.MANAGER), createProduct);
router.put('/:id', requireRole(UserRole.ADMIN, UserRole.MANAGER), updateProduct);
router.delete('/:id', requireRole(UserRole.ADMIN, UserRole.MANAGER), deleteProduct);

// Controle por lotes (só produtos com tracks_batches = true, ver
// productLotService.ts), reservado a ADMIN/MANAGER como o resto da gestão
// de catálogo.
router.get('/:id/lots', requireRole(UserRole.ADMIN, UserRole.MANAGER), listProductLots);
router.post('/:id/lots', requireRole(UserRole.ADMIN, UserRole.MANAGER), createProductLot);
router.delete('/:id/lots/:lotId', requireRole(UserRole.ADMIN, UserRole.MANAGER), deleteProductLot);

export default router;
