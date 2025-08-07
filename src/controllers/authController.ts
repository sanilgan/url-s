import { Request, Response } from 'express';
import { authService } from '../services/authService';
import pool from '../config/database';

export class AuthController {

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Email, password and name are required'
        });
        return;
      }

      const result = await authService.register(email, password, name);

      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: result.user,
          token: result.token
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error occurred during registration';

      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error occurred during login';

      res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email address is required'
        });
        return;
      }

      const resetToken = await authService.generatePasswordResetToken(email);

      res.json({
        success: true,
        message: 'Password reset link has been sent to your email address',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset error';

      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Token and new password are required'
        });
        return;
      }

      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Your password has been updated successfully'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset error';

      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Token is required'
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = await authService.verifyToken(token);

      res.json({
        success: true,
        data: decoded
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification error';

      res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Token is required'
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = await authService.verifyToken(token);

      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, name, created_at, is_active FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: 'User not found'
          });
          return;
        }

        const user = result.rows[0];
        res.json({
          success: true,
          data: {
            id: user.id,
            email: user.email,
            name: user.name,
            created_at: user.created_at,
            is_active: user.is_active
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error fetching profile';

      res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
  }
}

export const authController = new AuthController();
