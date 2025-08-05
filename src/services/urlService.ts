import pool from '../config/database';
import { nanoid } from 'nanoid';
import validator from 'validator';
import { Url, UrlClick, CreateUrlRequest, UrlStats } from '../types';

export class UrlService {

  // Veritabanı bağlantısını test et
  async testConnection(): Promise<boolean> {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  // Kısa kod var mı kontrol et
  private async checkShortCodeExists(shortCode: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM urls WHERE short_code = $1',
        [shortCode]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  // Yeni kısa URL oluştur
  async createShortUrl(data: CreateUrlRequest, userId?: number): Promise<Url> {
    const { original_url, custom_code, expires_at } = data;

    // URL validasyonu
    if (!validator.isURL(original_url)) {
      throw new Error('Geçersiz URL formatı');
    }

    const client = await pool.connect();

    try {
      // Kısa kod oluştur
      let shortCode = custom_code;
      if (!shortCode) {
        shortCode = nanoid(8);

        // Benzersizlik kontrolü
        while (await this.checkShortCodeExists(shortCode)) {
          shortCode = nanoid(8);
        }
      } else {
        // Özel kod kontrolü
        if (await this.checkShortCodeExists(shortCode)) {
          throw new Error('Bu kısa kod zaten kullanımda');
        }
      }

      const query = `
        INSERT INTO urls (original_url, short_code, expires_at, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, original_url, short_code, expires_at, created_at, clicks
      `;

      const values = [original_url, shortCode, expires_at || null, userId || null];
      const result = await client.query(query, values);

      console.log('✅ URL created successfully:', result.rows[0]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Kısa kod ile URL bul
  async getUrlByShortCode(shortCode: string): Promise<Url | null> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT * FROM urls 
        WHERE short_code = $1 
        AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const result = await client.query(query, [shortCode]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Tıklama kaydı oluştur - url_clicks tablosu yerine urls tablosundaki sayaçları güncelle
  async recordClick(urlId: number, ipAddress: string, userAgent?: string, referer?: string): Promise<void> {
    const client = await pool.connect();

    try {
      // URL'nin tıklama sayısını artır ve son tıklama zamanını güncelle
      await client.query(`
        UPDATE urls 
        SET url_count = COALESCE(url_count, 0) + 1,
            last_clicked_at = NOW()
        WHERE id = $1
      `, [urlId]);

      console.log('✅ Click recorded for URL ID:', urlId, 'IP:', ipAddress);
    } finally {
      client.release();
    }
  }

  // Kullanıcının URL'lerini getir
  async getUserUrls(userId: number, limit: number = 50, offset: number = 0): Promise<Url[]> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT id, original_url, short_code, title, created_at, expires_at, is_active,
               COALESCE(url_count, 0) as clicks, last_clicked_at
        FROM urls 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(query, [userId, limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Tüm URL'leri getir (giriş yapmamış kullanıcılar için)
  async getAllUrls(limit: number = 50, offset: number = 0): Promise<Url[]> {
    const client = await pool.connect();

    try {
      console.log('🔍 getAllUrls called - limit:', limit, 'offset:', offset);

      const query = `
        SELECT id, original_url, short_code, title, created_at, expires_at, is_active,
               COALESCE(url_count, 0) as clicks, last_clicked_at
        FROM urls 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `;

      console.log('📝 Executing query:', query);
      const result = await client.query(query, [limit, offset]);

      console.log('📊 Query result - row count:', result.rows.length);
      console.log('🔗 Sample row:', result.rows[0] || 'No rows found');

      return result.rows;
    } catch (error) {
      console.error('❌ Error in getAllUrls:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // URL istatistikleri - url_clicks tablosu yerine urls tablosundaki verilerden al
  async getUrlStats(shortCode: string, userId?: number): Promise<UrlStats | null> {
    const client = await pool.connect();

    try {
      // URL'yi bul ve yetki kontrolü yap
      let query = `
        SELECT id, original_url, short_code, title, created_at, expires_at, is_active,
               COALESCE(url_count, 0) as total_clicks, last_clicked_at
        FROM urls 
        WHERE short_code = $1
      `;
      const params = [shortCode];

      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      }

      const urlResult = await client.query(query, params);

      if (urlResult.rows.length === 0) {
        return null;
      }

      const url = urlResult.rows[0];

      // Basit istatistikler - url_clicks tablosu olmadığı için sadece toplam tıklama sayısı
      return {
        url: url,
        total_clicks: parseInt(url.total_clicks) || 0,
        today_clicks: 0, // url_clicks tablosu olmadığı için hesaplanamıyor
        week_clicks: 0   // url_clicks tablosu olmadığı için hesaplanamıyor
      };
    } finally {
      client.release();
    }
  }

  // URL güncelleme (başlık vs.)
  async updateUrl(urlId: number, updateData: { title?: string }, userId?: number): Promise<Url | null> {
    const client = await pool.connect();

    try {
      const { title } = updateData;

      // Önce URL'nin varlığını ve kullanıcı yetkisini kontrol et
      let checkQuery = 'SELECT id FROM urls WHERE id = $1';
      const checkParams = [urlId];

      if (userId) {
        checkQuery += ' AND user_id = $2';
        checkParams.push(userId);
      }

      const checkResult = await client.query(checkQuery, checkParams);

      if (checkResult.rows.length === 0) {
        return null; // URL bulunamadı veya yetki yok
      }

      // URL'yi güncelle - updated_at olmadan
      const updateQuery = `
        UPDATE urls 
        SET title = $1
        WHERE id = $2
        RETURNING *
      `;

      const result = await client.query(updateQuery, [title, urlId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error updating URL:', error);
      throw error;
    } finally {
      client.release();
    }
  }

}
