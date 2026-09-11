import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import {
  cancelSubscriptionRequestHandler,
  confirmSubscriptionRequestHandler,
  listPendingSubscriptionRequestsHandler,
  listTenantsHandler,
  resetTenantAdminPasswordHandler,
  setTenantActiveHandler,
} from '../controllers/superadminController';
import { UserRole } from '../types/enums';

const router = Router();

// Sem tenantMiddleware de propósito: o superadmin não pertence a nenhum
// estabelecimento, estas rotas atravessam todos os tenants.
router.use(authMiddleware, requireRole(UserRole.SUPERADMIN));

router.get('/tenants', listTenantsHandler);
router.put('/tenants/:id', setTenantActiveHandler);
router.post('/tenants/:id/reset-admin-password', resetTenantAdminPasswordHandler);

router.get('/subscription-requests', listPendingSubscriptionRequestsHandler);
router.post('/subscription-requests/:id/confirm', confirmSubscriptionRequestHandler);
router.post('/subscription-requests/:id/cancel', cancelSubscriptionRequestHandler);

export default router;
