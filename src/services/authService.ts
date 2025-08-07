import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { User } from '../types';
import validator from 'validator';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export class AuthService {

  private async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, 12);
    } catch (error) {
      throw new Error('Password hashing error');
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }

  private validateEmail(email: string): void {
    if (!email || !validator.isEmail(email)) {
      throw new Error('Please enter a valid email address');
    }

    if (email.length > 320) {
      throw new Error('Email address is too long');
    }
  }

  private createToken(userId: number, email: string): string {
    return jwt.sign(
      {
        userId,
        email,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
        algorithm: 'HS256'
      }
    );
  }

  async register(email: string, password: string, name?: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const client = await pool.connect();

    try {
      this.validateEmail(email);
      this.validatePassword(password);

      const normalizedEmail = validator.normalizeEmail(email) || email.toLowerCase().trim();

      // Mevcut kullanıcı kontrolü
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [normalizedEmail]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('This email address is already registered');
      }

      const hashedPassword = await this.hashPassword(password);

      const result = await client.query(`
        INSERT INTO users (email, password_hash, name, created_at, is_active)
        VALUES ($1, $2, $3, NOW(), true)
        RETURNING id, email, name, created_at, is_active
      `, [normalizedEmail, hashedPassword, name || 'Kullanıcı']);

      const user = result.rows[0];
      const token = this.createToken(user.id, user.email);

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

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const client = await pool.connect();

    try {
      this.validateEmail(email);

      if (!password) {
        throw new Error('Password is required');
      }

      const normalizedEmail = validator.normalizeEmail(email) || email.toLowerCase().trim();
      console.log('Login attempt for email:', normalizedEmail);

      const result = await client.query(
        `SELECT id, email, name, password_hash, created_at, is_active 
         FROM users 
         WHERE email = $1 AND is_active = true`,
        [normalizedEmail]
      );

      console.log('User found in database:', result.rows.length > 0);

      if (result.rows.length === 0) {
        console.log('No user found with email:', normalizedEmail);
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];
      console.log('User data:', {
        id: user.id,
        email: user.email,
        hasPasswordHash: !!user.password_hash,
        passwordHashLength: user.password_hash ? user.password_hash.length : 0
      });

      // Şifre doğrulama öncesi debug
      console.log('Password verification - Input password length:', password.length);
      console.log('Stored hash starts with:', user.password_hash ? user.password_hash.substring(0, 10) : 'null');

      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      console.log('Password verification result:', isValidPassword);

      if (!isValidPassword) {
        console.log('Password verification failed for user:', user.email);
        throw new Error('Invalid email or password');
      }

      const token = this.createToken(user.id, user.email);

      console.log('Login successful for user:', user.email);

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
      console.error('Login error details:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error occurred during login');
    } finally {
      client.release();
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const client = await pool.connect();

    try {
      this.validateEmail(email);
      const normalizedEmail = validator.normalizeEmail(email) || email.toLowerCase().trim();

      const result = await client.query(
        'SELECT id FROM users WHERE email = $1 AND is_active = true',
        [normalizedEmail]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return jwt.sign(
        { userId: result.rows[0].id, email: normalizedEmail, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Error generating password reset token');
    } finally {
      client.release();
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const client = await pool.connect();

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      this.validatePassword(newPassword);

      const hashedPassword = await this.hashPassword(newPassword);

      const result = await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2 AND is_active = true',
        [hashedPassword, decoded.userId]
      );

      if (result.rowCount === 0) {
        throw new Error('User not found or inactive');
      }

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Password reset error');
    } finally {
      client.release();
    }
  }
}

export const authService = new AuthService();
