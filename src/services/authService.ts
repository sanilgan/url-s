import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { User } from '../types';
import validator from 'validator';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export class AuthService {

  /**
   * Bcryptjs ile şifre hashleme - güvenli ayarlarla
   */
  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, 12); // 12 rounds - çok güvenli
    } catch (error) {
      throw new Error('Şifre hashleme hatası');
    }
  }

  /**
   * Bcryptjs ile şifre doğrulama
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Şifre güvenlik kontrolleri
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Şifre en az 8 karakter olmalıdır');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Şifre en az bir küçük harf içermelidir');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Şifre en az bir büyük harf içermelidir');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Şifre en az bir rakam içermelidir');
    }
  }

  /**
   * Email format kontrolleri
   */
  private validateEmail(email: string): void {
    if (!email || !validator.isEmail(email)) {
      throw new Error('Geçerli bir email adresi giriniz');
    }

    if (email.length > 320) { // RFC 5321 limiti
      throw new Error('Email adresi çok uzun');
    }
  }

  /**
   * Kullanıcı kaydı - güvenli argon2 ile
   */
  async register(email: string, password: string, name?: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const client = await pool.connect();

    try {
      // Input validasyon
      this.validateEmail(email);
      this.validatePassword(password);

      // Email normalize et
      const normalizedEmail = validator.normalizeEmail(email) || email.toLowerCase().trim();

      // Mevcut kullanıcı kontrolü
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Bu email adresi zaten kayıtlı');
      }

      // Güvenli şifre hashleme
      const hashedPassword = await this.hashPassword(password);

      // Kullanıcı oluştur
      const result = await client.query(`
        INSERT INTO users (email, password_hash, name, created_at, is_active)
        VALUES ($1, $2, $3, NOW(), true)
        RETURNING id, email, name, created_at, is_active
      `, [normalizedEmail, hashedPassword, name || 'Kullanıcı']);

      const user = result.rows[0];

      // JWT token oluştur
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        {
          expiresIn: '7d',
          algorithm: 'HS256'
        }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          is_active: user.is_active
        },
        token
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Kullanıcı kaydı sırasında hata oluştu');
    } finally {
      client.release();
    }
  }

  /**
   * Kullanıcı girişi - güvenli argon2 doğrulama
   */
  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const client = await pool.connect();

    try {
      // Input validasyon
      this.validateEmail(email);

      if (!password) {
        throw new Error('Şifre gereklidir');
      }

      // Email normalize et
      const normalizedEmail = validator.normalizeEmail(email) || email.toLowerCase().trim();

      // Kullanıcı sorgula
      const result = await client.query(
        `SELECT id, email, name, password_hash, created_at, is_active 
         FROM users 
         WHERE email = $1 AND is_active = true`,
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        throw new Error('Geçersiz email veya şifre');
      }

      const user = result.rows[0];

      // Şifre doğrulama
      const isValidPassword = await this.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        throw new Error('Geçersiz email veya şifre');
      }

      // JWT token oluştur
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        {
          expiresIn: '7d',
          algorithm: 'HS256'
        }
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          is_active: user.is_active
        },
        token
      };

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Giriş sırasında hata oluştu');
    } finally {
      client.release();
    }
  }

  /**
   * Token doğrulama
   */
  async verifyToken(token: string): Promise<{ userId: number; email: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;

      if (!decoded.userId || !decoded.email) {
        throw new Error('Geçersiz token yapısı');
      }

      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      throw new Error('Geçersiz veya süresi dolmuş token');
    }
  }

  /**
   * Şifre sıfırlama token'ı oluştur
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const client = await pool.connect();

    try {
      this.validateEmail(email);
      const normalizedEmail = validator.normalizeEmail(email) || email.toLowerCase().trim();

      // Kullanıcı var mı kontrol et
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1 AND is_active = true',
        [normalizedEmail]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Bu email adresi ile kayıtlı kullanıcı bulunamadı');
      }

      // Reset token oluştur (15 dakika geçerli)
      const resetToken = jwt.sign(
        {
          email: normalizedEmail,
          purpose: 'password_reset',
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        {
          expiresIn: '15m',
          algorithm: 'HS256'
        }
      );

      return resetToken;

    } finally {
      client.release();
    }
  }

  /**
   * Şifre sıfırlama
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await pool.connect();

    try {
      // Token doğrula
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;

      if (decoded.purpose !== 'password_reset') {
        throw new Error('Geçersiz reset token');
      }

      // Yeni şifre validasyonu
      this.validatePassword(newPassword);

      // Yeni şifre hashleme
      const hashedPassword = await this.hashPassword(newPassword);

      // Şifreyi güncelle
      const result = await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 AND is_active = true',
        [hashedPassword, decoded.email]
      );

      if (result.rowCount === 0) {
        throw new Error('Kullanıcı bulunamadı veya şifre güncellenemedi');
      }

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Şifre sıfırlama hatası');
    } finally {
      client.release();
    }
  }
}

export const authService = new AuthService();
