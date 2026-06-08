import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';
import validator from 'validator';
import { getFirestoreDb } from '../config/firebase';
import { CreateUrlRequest, Url, UrlStats } from '../types';

interface UrlDocument {
  original_url: string;
  short_code: string;
  title: string;
  domain: string;
  user_id: string | null;
  clicks: number;
  created_at: Timestamp;
  expires_at: Timestamp | null;
  last_clicked_at: Timestamp | null;
  is_active: boolean;
}

function toDate(value: Timestamp | null): Date | undefined {
  return value ? value.toDate() : undefined;
}

function toUrl(id: string, data: UrlDocument): Url {
  return {
    id,
    user_id: data.user_id || undefined,
    original_url: data.original_url,
    short_code: data.short_code,
    title: data.title,
    domain: data.domain,
    created_at: data.created_at.toDate(),
    expires_at: toDate(data.expires_at),
    clicks: data.clicks || 0,
    last_clicked_at: toDate(data.last_clicked_at),
    is_active: data.is_active
  };
}

function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = 'code' in error ? String(error.code) : '';
  return code === '6' || code === 'already-exists';
}

export class UrlService {
  async createShortUrl(data: CreateUrlRequest, userId?: string): Promise<Url> {
    if (!validator.isURL(data.original_url, { protocols: ['http', 'https'], require_protocol: true })) {
      throw new Error('URL must start with http:// or https://');
    }

    if (data.custom_code && !/^[a-zA-Z0-9_-]{3,20}$/.test(data.custom_code)) {
      throw new Error('Custom code must be 3-20 characters and contain only letters, numbers, - or _');
    }

    let expiresAt: Timestamp | null = null;
    if (data.expires_at) {
      const expirationDate = new Date(data.expires_at);
      if (Number.isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        throw new Error('Expiration date must be a valid future date');
      }
      expiresAt = Timestamp.fromDate(expirationDate);
    }

    const customCode = data.custom_code?.trim();
    const attempts = customCode ? 1 : 10;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const shortCode = customCode || nanoid(8);
      const document: UrlDocument = {
        original_url: data.original_url,
        short_code: shortCode,
        title: data.title || 'Untitled',
        domain: data.domain || 'x.ly',
        user_id: userId || null,
        clicks: 0,
        created_at: Timestamp.now(),
        expires_at: expiresAt,
        last_clicked_at: null,
        is_active: true
      };

      try {
        await getFirestoreDb().collection('urls').doc(shortCode).create(document);
        return toUrl(shortCode, document);
      } catch (error) {
        if (!isAlreadyExistsError(error)) {
          throw error;
        }
        if (customCode) {
          throw new Error('This short code is already in use');
        }
      }
    }

    throw new Error('Unable to generate a unique short code');
  }

  async getUrlByShortCode(shortCode: string): Promise<Url | null> {
    const snapshot = await getFirestoreDb().collection('urls').doc(shortCode).get();
    if (!snapshot.exists) {
      return null;
    }

    const url = snapshot.data() as UrlDocument;
    return url.is_active ? toUrl(snapshot.id, url) : null;
  }

  async incrementClickCount(urlId: string): Promise<void> {
    try {
      await getFirestoreDb().collection('urls').doc(urlId).update({
        clicks: FieldValue.increment(1),
        last_clicked_at: FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error incrementing click count:', error);
    }
  }

  async getUserUrls(userId: string): Promise<Url[]> {
    const snapshot = await getFirestoreDb()
      .collection('urls')
      .where('user_id', '==', userId)
      .get();

    return snapshot.docs
      .map(document => toUrl(document.id, document.data() as UrlDocument))
      .filter(url => url.is_active)
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }

  async updateUrl(id: string, data: { title?: string }, userId: string): Promise<Url> {
    const urlRef = getFirestoreDb().collection('urls').doc(id);

    return getFirestoreDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(urlRef);
      if (!snapshot.exists) {
        throw new Error('URL not found');
      }

      const url = snapshot.data() as UrlDocument;
      if (!url.is_active || url.user_id !== userId) {
        throw new Error('URL not found or could not be updated');
      }

      const updated = { ...url, title: data.title || 'Untitled' };
      transaction.update(urlRef, { title: updated.title });
      return toUrl(snapshot.id, updated);
    });
  }

  async deleteUrl(id: string, userId: string): Promise<void> {
    const urlRef = getFirestoreDb().collection('urls').doc(id);

    await getFirestoreDb().runTransaction(async transaction => {
      const snapshot = await transaction.get(urlRef);
      if (!snapshot.exists) {
        throw new Error('URL not found');
      }

      const url = snapshot.data() as UrlDocument;
      if (!url.is_active || url.user_id !== userId) {
        throw new Error('URL not found or could not be deleted');
      }

      transaction.update(urlRef, { is_active: false });
    });
  }

  async getUrlStats(id: string, userId: string): Promise<UrlStats> {
    const snapshot = await getFirestoreDb().collection('urls').doc(id).get();
    if (!snapshot.exists) {
      throw new Error('URL not found');
    }

    const document = snapshot.data() as UrlDocument;
    if (!document.is_active || document.user_id !== userId) {
      throw new Error('URL not found');
    }

    const url = toUrl(snapshot.id, document);
    return {
      url,
      total_clicks: url.clicks || 0,
      last_clicked: url.last_clicked_at
    };
  }
}
