import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import productRoutes from './productRoutes';
import saleRoutes from './saleRoutes';
import superadminRoutes from './superadminRoutes';
import tenantRoutes from './tenantRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/sales', saleRoutes);
router.use('/users', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/tenants', tenantRoutes);
router.use('/superadmin', superadminRoutes);

export default router;
