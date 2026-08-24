import { Router } from 'express';
import { loginHandler, register } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', loginHandler);

export default router;
