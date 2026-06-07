import pool from '../config/database';
import { nanoid } from 'nanoid';
import validator from 'validator';
import { Url, CreateUrlRequest, UrlStats } from '../types';
//URL kısaltma işlemlerinin beynirdir.
//Bu dosya, uzun linkleri kısa kodlara çeviren, saklayan ve yöneten tüm ana işlemleri yapar.
export class UrlService {
    //Kısa kodun veritabanında zaten var olup olmadığını kontrol eder.
    //Eğer varsa, yeni bir kısa kod oluşturur.
    //Eğer kullanıcı özel bir kod verdiyse, bu kodun kullanılabilirliğini kontrol eder.
    //Eğer özel kod zaten kullanılıyorsa, hata fırlatır.
//Çakışmayı engeller - aynı kod iki kez kullanılmaz
  private async isShortCodeTaken(shortCode: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id FROM urls WHERE short_code = $1', [shortCode]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking short code:', error);
      throw new Error('Database error: Unable to check short code');
    } finally {
      client.release();
    }
  }

  async createShortUrl(data: CreateUrlRequest, userId?: number): Promise<Url> {
    console.log('🔧 UrlService: Creating short URL with data:', data);

    if (!validator.isURL(data.original_url, { protocols: ['http', 'https'], require_protocol: true })) {
      throw new Error('URL must start with http:// or https://');
    }

    if (data.custom_code && !/^[a-zA-Z0-9_-]{3,20}$/.test(data.custom_code)) {
      throw new Error('Custom code must be 3-20 characters and contain only letters, numbers, - or _');
    }

    if (data.expires_at) {
      const expirationDate = new Date(data.expires_at);
      if (Number.isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        throw new Error('Expiration date must be a valid future date');
      }
    }

    const client = await pool.connect();
    try {
      // Generate short code with better collision handling
      let shortCode = data.custom_code?.trim();
      let attempts = 0;
      const maxAttempts = 10;

      if (!shortCode) {
        // Auto-generate unique short code
        do {
          shortCode = nanoid(8);
          attempts++;
          if (attempts > maxAttempts) {
            throw new Error('Unable to generate unique short code after multiple attempts');
          }
        } while (await this.isShortCodeTaken(shortCode));
      } else {
        // Check custom code availability
        if (await this.isShortCodeTaken(shortCode)) {
          throw new Error('This short code is already in use');
        }
      }

      console.log('📝 Generated short code:', shortCode, `(attempts: ${attempts})`);

      const result = await client.query(`
        INSERT INTO urls (original_url, short_code, expires_at, user_id, title, domain, clicks, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, 0, true)
        RETURNING id, original_url, short_code, expires_at, created_at, title, domain,
                  COALESCE(clicks, 0) as clicks
      `, [
        data.original_url,
        shortCode,
        data.expires_at || null,
        userId || null,
        data.title || 'Untitled',
        data.domain || 'x.ly'
      ]);

      console.log('✅ URL successfully inserted into database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Database error in createShortUrl:', error);

      // Re-throw the original error message, don't mask it
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Database operation failed');
    } finally {
      client.release();
    }
  }// URL'yi kısaltma işlemi başarılıysa, URL bilgilerini döndürür

  async getUrlByShortCode(shortCode: string): Promise<Url | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM urls
        WHERE short_code = $1 AND is_active = true
      `, [shortCode]);

      //link aktif mi
      //süresi dolmuş mu

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting URL by short code:', error);
      throw new Error('URL not found');
    } finally {
      client.release();
    }
  }

  //tıklama sayısını artırır ve son tıklanma zamanını günceller
  async incrementClickCount(urlId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        UPDATE urls
        SET clicks = COALESCE(clicks, 0) + 1, last_clicked_at = NOW()
        WHERE id = $1
      `, [urlId]);
    } catch (error) {
      console.error('Error incrementing click count:', error);
      // This error is not critical, continue silently
    } finally {
      client.release();
    }
  }

    //Kullanıcının tüm URL'lerini getirir
  //En yeniden eskiye sıralar
  //Sadece aktif linkleri gösterir
  async getUserUrls(userId: number): Promise<Url[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, original_url, short_code, title, created_at, expires_at,
               COALESCE(clicks, 0) as clicks, last_clicked_at, domain
        FROM urls
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting user URLs:', error);
      throw new Error('Unable to retrieve user URLs');
    } finally {
      client.release();
    }
  }


    //URL'yi ID ile günceller
  //Link başlığını değiştirme
  //Yetki kontrolü: Sadece link sahibi güncelleyebilir
  async updateUrl(id: number, data: { title?: string }, userId?: number): Promise<Url> {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE urls SET title = $1
        WHERE id = $2 ${userId ? 'AND user_id = $3' : ''}
        RETURNING id, original_url, short_code, title, created_at, expires_at,
                  COALESCE(clicks, 0) as clicks, last_clicked_at, domain
      `;

      const values = userId ? [data.title, id, userId] : [data.title, id];
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('URL not found or could not be updated');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating URL:', error);
      throw new Error('Unable to update URL');
    } finally {
      client.release();
    }
  }

  //URL'yi ID ile siler
  //Link'i soft delete yapar (is_active = false)
  // Gerçekten silmez, sadece gizler
  //Veri hala veritabanında
  // Admin geri getirebilir
  // İstatistikler korunur
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
    } catch (error) {
      console.error('Error deleting URL:', error);
      throw new Error('Unable to delete URL');
    } finally {
      client.release();
    }
  }

    //URL istatistiklerini getirir
  //Toplam tıklanma sayısı
  // Son tıklanma zamanı
  // Link bilgileri
  //bu tuşu daha sonra ekleyeceğim - istatistikler için
  async getUrlStats(id: number, userId?: number): Promise<UrlStats> {
    const client = await pool.connect();
    try {
      const query = `
        SELECT id, original_url, short_code, title, created_at, expires_at,
               COALESCE(clicks, 0) as total_clicks, last_clicked_at, domain
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
    } catch (error) {
      console.error('Error getting URL stats:', error);
      throw new Error('Unable to retrieve URL statistics');
    } finally {
      client.release();
    }
  }
}

//Connection pooling ile güvenli bağlantı
// SQL injection koruması ($1, $2 parametreler)
// Her işlemde bağlantı temizlem
//urlService.ts bir link dönüştürme fabrikası gibidir:
//"Bu URL geçerli mi?" (format kontrolü)
// "Hangi kısa kodu kullanayım?" (rastgele üret/özel kod)
// "Bu kod daha önce kullanılmış mı?" (çakışma kontrolü)
// "Tamam, kısa linki oluşturdum!"
//"abc123 koduna sahip link var mı?"
// "Aktif mi? Süresi dolmamış mı?"
// "Tamam, gerçek URL'yi buldum"
// "Tıklanma sayısını +1 artırdım
