import { Request, Response } from 'express';
import { authService } from '../services/authService';
import pool from '../config/database';

export class AuthController {

  /**
   * Kullanıcı kaydı
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email ve şifre gereklidir'
        });
        return;
      }

      const result = await authService.register(email, password, name);

      res.status(201).json({
        success: true,
        message: 'Hesabınız başarıyla oluşturuldu',
        data: {
          user: result.user,
          token: result.token
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Kayıt sırasında hata oluştu';

      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Kullanıcı girişi
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email ve şifre gereklidir'
        });
        return;
      }

      const result = await authService.login(email, password);

      res.json({
        success: true,
        message: 'Giriş başarılı',
        data: {
          user: result.user,
          token: result.token
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Giriş sırasında hata oluştu';

      res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Şifre sıfırlama token'ı oluştur
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email adresi gereklidir'
        });
        return;
      }

      const resetToken = await authService.generatePasswordResetToken(email);

      // Gerçek uygulamada bu token email ile gönderilir
      // Şimdilik response'da döndürüyoruz (güvenlik açısından sadece development için)
      res.json({
        success: true,
        message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi',
        // Production'da bu satırı kaldırın:
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Şifre sıfırlama hatası';

      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Şifre sıfırlama
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Token ve yeni şifre gereklidir'
        });
        return;
      }

      await authService.resetPassword(token, newPassword);

      res.json({
        success: true,
        message: 'Şifreniz başarıyla güncellendi'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Şifre sıfırlama hatası';

      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Token doğrulama
   */
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Token gereklidir'
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
      const errorMessage = error instanceof Error ? error.message : 'Token doğrulama hatası';

      res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
  }

  /**
   * Kullanıcı profil bilgilerini getir
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Token gereklidir'
        });
        return;
      }

      const token = authHeader.substring(7);
      const decoded = await authService.verifyToken(token);

      // Kullanıcı bilgilerini veritabanından al
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, name, created_at, is_active FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            error: 'Kullanıcı bulunamadı'
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
      const errorMessage = error instanceof Error ? error.message : 'Profil getirme hatası';

      res.status(401).json({
        success: false,
        error: errorMessage
      });
    }
  }
}

export const authController = new AuthController();
