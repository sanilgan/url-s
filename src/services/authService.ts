import jwt from 'jsonwebtoken';
import pool from '../config/database';
// import bcrypt from 'bcrypt'; // Henüz bcrypt yok
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export class AuthService {

  // Geçici basit şifre kontrolü (üretimde kullanmayın!)
  private simpleHash(password: string): string {
    return Buffer.from(password).toString('base64');
  }

  private comparePasswords(plainPassword: string, hashedPassword: string): boolean {
    return this.simpleHash(plainPassword) === hashedPassword;
  }

  // Kullanıcı kaydı - VERİTABANI VERSİYONU
  async register(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const client = await pool.connect();

    try {
      // Email zaten kayıtlı mı kontrol et
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Bu email adresi zaten kayıtlı');
      }

      // Şifreyi hashle (basit versiyon)
      const hashedPassword = this.simpleHash(password);

      // Kullanıcıyı veritabanına kaydet
      const result = await client.query(`
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email, created_at, is_active
      `, [email, hashedPassword]);

      const user = result.rows[0];

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ User registered in database:', { email, id: user.id });

      return { user, token };
    } finally {
      client.release();
    }
  }

  // Kullanıcı girişi - VERİTABANI VERSİYONU
  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const client = await pool.connect();

    try {
      console.log('🔍 Login attempt for email:', email);
      
      // Kullanıcıyı veritabanından bul
      const result = await client.query(
        'SELECT id, email, password_hash, created_at, is_active FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      console.log('📊 Database query result:', {
        rowCount: result.rows.length,
        found: result.rows.length > 0
      });

      if (result.rows.length === 0) {
        console.log('❌ User not found in database:', email);
        throw new Error('Geçersiz email veya şifre');
      }

      const user = result.rows[0];
      console.log('👤 User found:', { id: user.id, email: user.email, hasPassword: !!user.password_hash });

      // Şifreyi kontrol et
      const hashedInputPassword = this.simpleHash(password);
      console.log('🔐 Password comparison:', {
        inputHash: hashedInputPassword,
        storedHash: user.password_hash,
        match: hashedInputPassword === user.password_hash
      });

      const isPasswordValid = this.comparePasswords(password, user.password_hash);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', email);
        throw new Error('Geçersiz email veya şifre');
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ User logged in from database:', { email, id: user.id });

      // Password hash'i çıkar
      const { password_hash, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, token };
    } finally {
      client.release();
    }
  }

  // Kullanıcıyı ID ile bul
  async getUserById(userId: number): Promise<Omit<User, 'password_hash'>> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        'SELECT id, email, created_at, is_active FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Token doğrulama
  verifyToken(token: string): { userId: number; email: string } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
