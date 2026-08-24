import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { cancelSaleHandler, getSaleById, listSales, registerSale } from '../controllers/saleController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/', listSales);
router.get('/:id', getSaleById);
router.post('/', registerSale);
// Cancelar uma venda repõe stock e reverte receita — reservado a
// ADMIN/MANAGER para evitar que um caixa desfaça vendas sem supervisão.
router.post('/:id/cancel', requireRole(UserRole.ADMIN, UserRole.MANAGER), cancelSaleHandler);

export default router;
