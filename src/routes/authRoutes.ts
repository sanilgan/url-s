import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Auth routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.get('/verify-token', authController.verifyToken.bind(authController));
router.get('/profile', authController.getProfile.bind(authController));

export default router;
