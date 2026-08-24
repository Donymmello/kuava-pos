import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { getTenantHandler, updateTenantHandler } from '../controllers/tenantController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Leitura disponível a qualquer utilizador autenticado do estabelecimento
// (ex.: nome/NUIT usados em recibos); só ADMIN pode alterar os dados.
router.get('/me', getTenantHandler);
router.put('/me', requireRole(UserRole.ADMIN), updateTenantHandler);

export default router;
