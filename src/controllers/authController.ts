import { Request, Response } from 'express';
import { authService } from '../services/authService';

//kimlik doğrulama işlemlerinin kalbidir.
// HTTP isteklerini alıp kimlik doğrulama business logic'ini çalıştıran controller (kontrolcü) dosyasıdır.
//Bu dosya route'lardan gelen kimlik doğrulama isteklerini alır,
// authService'e yönlendirir ve sonuçları JSON format'ında kullanıcıya döndürür.
export class AuthController {
//methodlar, HTTP isteklerini işleyen ve authService'i çağıran fonksiyonlardır.
  //Yeni kullanıcı kaydı oluşturur
  // Email, password, name doğrulaması yapar
  // AuthService'e kayıt işlemini yaptırır
  // JWT token ile birlikte kullanıcı döndürür
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
//Email/password ile giriş yapar
// Kimlik bilgilerini doğrular
// JWT token oluşturur
// Kullanıcı bilgileri ile token döndürür
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
//"Şifremi unuttum" işlemi
// Email adresine reset token gönderir
// Development mode'da token'ı response'da gösterir
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
//Reset token ile yeni şifre belirler
// Token geçerliliğini kontrol eder
// Şifreyi günceller
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
//JWT token'ı doğrular
// Authorization header'dan token alır
// Token geçerliliğini kontrol eder
// Decoded user bilgilerini döndürür
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
//Giriş yapmış kullanıcının profil bilgilerini getirir
// Token doğrulaması yapar
// Database'den güncel kullanıcı bilgilerini alır
// Aktif kullanıcı kontrolü yapar
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

      const user = await authService.getProfile(decoded.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      res.json({ success: true, data: user });

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

//400 Bad Request - Validation hataları
// 401 Unauthorized - Authentication hataları ,Token/kimlik hataları
// 404 Not Found - Kullanıcı bulunamadı
//201 - Created        // register() - Kayıt başarılı
// 200 - OK            // login(), forgotPassword(), resetPassword(), verifyToken(), getProfile()



//Hesap açmak istiyorum" → register()
// "Hesabıma girmek istiyorum" → login()
// "Şifremi unuttum" → forgotPassword()
// "Yeni şifre koymak istiyorum" → resetPassword()
// "Kimliğimi doğrula" → verifyToken()
// "Hesap bilgilerimi göster" → getProfile()
