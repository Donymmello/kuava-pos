import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import { tenantMiddleware } from '../middlewares/tenantMiddleware';
import { requireActiveSubscription } from '../middlewares/subscriptionMiddleware';
import { createUserHandler, listUsersHandler, updateUserHandler } from '../controllers/userController';
import { UserRole } from '../types/enums';

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireActiveSubscription, requireRole(UserRole.ADMIN));

router.get('/', listUsersHandler);
router.post('/', createUserHandler);
router.put('/:id', updateUserHandler);

export default router;
