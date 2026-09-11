import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { createSubscriptionRequestHandler, getSubscriptionStatusHandler } from '../controllers/subscriptionController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(authMiddleware, tenantMiddleware);

// Qualquer utilizador do tenant pode ver o estado (ex.: a caixa vê que a
// conta está bloqueada), só o ADMIN é que trata do pagamento/plano.
router.get('/status', getSubscriptionStatusHandler);
router.post('/requests', requireRole(UserRole.ADMIN), createSubscriptionRequestHandler);

export default router;
