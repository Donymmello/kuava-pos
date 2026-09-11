import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireActiveSubscription } from '../middlewares/subscriptionMiddleware';
import { getDashboardSummaryHandler } from '../controllers/dashboardController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(
  authMiddleware,
  tenantMiddleware,
  requireActiveSubscription,
  requireRole(UserRole.ADMIN, UserRole.MANAGER),
);

router.get('/summary', getDashboardSummaryHandler);

export default router;
