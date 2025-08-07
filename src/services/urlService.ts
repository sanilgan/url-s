import pool from '../config/database';
import { nanoid } from 'nanoid';
import validator from 'validator';
import { Url, CreateUrlRequest, UrlStats } from '../types';

export class UrlService {

  private async isShortCodeTaken(shortCode: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id FROM urls WHERE short_code = $1', [shortCode]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async createShortUrl(data: CreateUrlRequest, userId?: number): Promise<Url> {
    if (!validator.isURL(data.original_url)) {
      throw new Error('Invalid URL format');
    }

    const client = await pool.connect();
    try {
      // Generate short code
      let shortCode = data.custom_code;
      if (!shortCode) {
        do {
          shortCode = nanoid(8);
        } while (await this.isShortCodeTaken(shortCode));
      } else if (await this.isShortCodeTaken(shortCode)) {
        throw new Error('This short code is already in use');
      }

      const result = await client.query(`
        INSERT INTO urls (original_url, short_code, expires_at, user_id, title)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, original_url, short_code, expires_at, created_at, title,
                  COALESCE(url_count, 0) as clicks
      `, [data.original_url, shortCode, data.expires_at || null, userId || null, data.title || 'Untitled']);

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUrlByShortCode(shortCode: string): Promise<Url | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM urls 
        WHERE short_code = $1 AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      `, [shortCode]);

      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async incrementClickCount(urlId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE urls 
        SET url_count = COALESCE(url_count, 0) + 1, last_clicked_at = NOW()
        WHERE id = $1
      `, [urlId]);
    } finally {
      client.release();
    }
  }

  async getUserUrls(userId: number): Promise<Url[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, original_url, short_code, title, created_at, expires_at,
               COALESCE(url_count, 0) as clicks, last_clicked_at
        FROM urls 
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllUrls(): Promise<Url[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, original_url, short_code, title, created_at, expires_at,
               COALESCE(url_count, 0) as clicks, last_clicked_at
        FROM urls 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 50
      `);

      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateUrl(id: number, data: { title?: string }, userId?: number): Promise<Url> {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE urls SET title = $1 
        WHERE id = $2 ${userId ? 'AND user_id = $3' : ''}
        RETURNING id, original_url, short_code, title, created_at, expires_at,
                  COALESCE(url_count, 0) as clicks, last_clicked_at
      `;

      const values = userId ? [data.title, id, userId] : [data.title, id];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('URL not found or could not be updated');
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteUrl(id: number, userId?: number): Promise<void> {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE urls SET is_active = false 
        WHERE id = $1 ${userId ? 'AND user_id = $2' : ''}
      `;

      const values = userId ? [id, userId] : [id];
      const result = await client.query(query, values);

      if (result.rowCount === 0) {
        throw new Error('URL not found or could not be deleted');
      }
    } finally {
      client.release();
    }
  }

  async getUrlStats(id: number, userId?: number): Promise<UrlStats> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT id, original_url, short_code, title, created_at, expires_at,
               COALESCE(url_count, 0) as total_clicks, last_clicked_at
        FROM urls 
        WHERE id = $1 AND is_active = true ${userId ? 'AND user_id = $2' : ''}
      `;

      const values = userId ? [id, userId] : [id];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('URL not found');
      }

      const url = result.rows[0];
      return {
        url,
        total_clicks: url.total_clicks,
        last_clicked: url.last_clicked_at
      };
    } finally {
      client.release();
    }
  }
}
