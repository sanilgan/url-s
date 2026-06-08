import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { Timestamp } from 'firebase-admin/firestore';
import { getJwtSecret } from '../config/auth';
import { getFirestoreDb } from '../config/firebase';
import { User } from '../types';

interface UserDocument {
  email: string;
  name: string;
  password_hash: string;
  created_at: Timestamp;
  is_active: boolean;
}

interface DecodedToken {
  userId: string;
  email: string;
  type?: string;
}

type PublicUser = Omit<User, 'password_hash'>;

function userIdForEmail(email: string): string {
  return createHash('sha256').update(email).digest('hex');
}

function toPublicUser(id: string, data: UserDocument): PublicUser {
  return {
    id,
    email: data.email,
    name: data.name,
    created_at: data.created_at.toDate(),
    is_active: data.is_active
  };
}

export class AuthService {
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
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

  private normalizeEmail(email: string): string {
    return validator.normalizeEmail(email) || email.toLowerCase().trim();
  }

  private createToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      getJwtSecret(),
      { expiresIn: '7d', algorithm: 'HS256' }
    );
  }

  async register(email: string, password: string, name?: string): Promise<{ user: PublicUser; token: string }> {
    this.validateEmail(email);
    this.validatePassword(password);

    const normalizedEmail = this.normalizeEmail(email);
    const userId = userIdForEmail(normalizedEmail);
    const userRef = getFirestoreDb().collection('users').doc(userId);
    const hashedPassword = await this.hashPassword(password);
    const userData: UserDocument = {
      email: normalizedEmail,
      name: name?.trim() || 'User',
      password_hash: hashedPassword,
      created_at: Timestamp.now(),
      is_active: true
    };

    await getFirestoreDb().runTransaction(async transaction => {
      const existingUser = await transaction.get(userRef);
      if (existingUser.exists) {
        throw new Error('This email address is already registered');
      }
      transaction.create(userRef, userData);
    });

    return {
      user: toPublicUser(userId, userData),
      token: this.createToken(userId, normalizedEmail)
    };
  }

  async login(email: string, password: string): Promise<{ user: PublicUser; token: string }> {
    this.validateEmail(email);
    if (!password) {
      throw new Error('Password is required');
    }

    const normalizedEmail = this.normalizeEmail(email);
    const userId = userIdForEmail(normalizedEmail);
    const snapshot = await getFirestoreDb().collection('users').doc(userId).get();

    if (!snapshot.exists) {
      throw new Error('Invalid email or password');
    }

    const user = snapshot.data() as UserDocument;
    if (!user.is_active || !await this.verifyPassword(password, user.password_hash)) {
      throw new Error('Invalid email or password');
    }

    return {
      user: toPublicUser(snapshot.id, user),
      token: this.createToken(snapshot.id, user.email)
    };
  }

  async verifyToken(token: string): Promise<DecodedToken> {
    try {
      return jwt.verify(token, getJwtSecret()) as DecodedToken;
    } catch {
      throw new Error('Invalid or expired token');
    }
  }

  async getProfile(userId: string): Promise<PublicUser | null> {
    const snapshot = await getFirestoreDb().collection('users').doc(userId).get();
    if (!snapshot.exists) {
      return null;
    }

    const user = snapshot.data() as UserDocument;
    return user.is_active ? toPublicUser(snapshot.id, user) : null;
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    this.validateEmail(email);
    const normalizedEmail = this.normalizeEmail(email);
    const userId = userIdForEmail(normalizedEmail);
    const snapshot = await getFirestoreDb().collection('users').doc(userId).get();

    if (!snapshot.exists || !(snapshot.data() as UserDocument).is_active) {
      throw new Error('User not found');
    }

    return jwt.sign(
      { userId, email: normalizedEmail, type: 'password_reset' },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }

    this.validatePassword(newPassword);
    const userRef = getFirestoreDb().collection('users').doc(decoded.userId);
    const snapshot = await userRef.get();

    if (!snapshot.exists || !(snapshot.data() as UserDocument).is_active) {
      throw new Error('User not found or inactive');
    }

    await userRef.update({ password_hash: await this.hashPassword(newPassword) });
  }

  async updatePasswordByEmail(email: string, newPassword: string): Promise<void> {
    this.validateEmail(email);
    this.validatePassword(newPassword);
    const normalizedEmail = this.normalizeEmail(email);
    const userRef = getFirestoreDb().collection('users').doc(userIdForEmail(normalizedEmail));
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new Error('User not found');
    }

    await userRef.update({ password_hash: await this.hashPassword(newPassword) });
  }
}

export const authService = new AuthService();
