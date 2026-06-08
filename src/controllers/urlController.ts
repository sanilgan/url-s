import { Request, Response } from 'express';
import { UrlService } from '../services/urlService';
import { AuthenticatedRequest } from '../middleware/auth';

const urlService = new UrlService();
//URL kısaltma işlemlerinin beynini oluşturan controller (kontrolcü) dosyasıdır.
//Route'lardan gelen istekleri alıp iş logic'ini çalıştırır ve sonuçları geri döndürür.
//Bu dosya route'lar ile service'ler arasında köprü görevi yapar.
// HTTP isteklerini alır, UrlService'e yönlendirir ve sonuçları JSON format'ında kullanıcıya döndürür.
export class UrlController {

  //Uzun URL'i alır, kısa URL'e çevirir
  // Özel kod, başlık, domain, süre bilgilerini işler
  // Giriş yapmış/yapmamış kullanıcı ayrımı yapar
  // Dynamic base URL oluşturur (https://yourdomain.com/abc123)
  // Input/Output:
  async createShortUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { original_url, custom_code, expires_at, title, domain } = req.body;

      console.log('📝 URL creation request:', {
        original_url,
        custom_code,
        expires_at,
        title,
        domain,
        userId: req.user?.userId
      });

      if (!original_url) {
        res.status(400).json({ success: false, error: 'URL is required' });
        return;
      }

      const userId = req.user?.userId;

      // URL validation
      console.log('🔍 Validating URL format...');

      const url = await urlService.createShortUrl({
        original_url,
        custom_code,
        expires_at,
        title: title || 'Untitled',
        domain: domain || 'x.ly'
      }, userId);

      // Create dynamic base URL
      const baseUrl = this.getBaseUrl(req);
      const shortUrl = `${baseUrl}/${url.short_code}`;

      console.log('✅ URL created successfully:', {
        id: url.id,
        short_code: url.short_code,
        short_url: shortUrl
      });

      res.status(201).json({
        success: true,
        data: {
          ...url,
          short_url: shortUrl,
          display_url: `${domain || 'x.ly'}/${url.short_code}`
        }
      });
    } catch (error) {
      console.error('❌ URL creation error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown error type'
      });

      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error occurred while shortening URL'
      });
    }
  }

//Kısa kod'u alır (/abc123)
// Original URL'i bulur
// Süre kontrolü yapar (expired mı?)
// Tıklanma sayısını artırır
// 302 redirect ile asıl URL'e yönlendirir
  //404 Error Page: Link bulunamadı
  // 410 Error Page: Link süresi dolmuş
  async redirectToOriginal(req: Request, res: Response): Promise<void> {
    try {
      const { shortCode } = req.params;
      const url = await urlService.getUrlByShortCode(shortCode);

      if (!url) {
        res.status(404).send(this.getErrorPage(404, 'Link Not Found', 'This short link does not exist or has been removed.'));
        return;
      }

      if (url.expires_at && new Date() > new Date(url.expires_at)) {
        res.status(410).send(this.getErrorPage(410, 'Link Expired', 'This link is no longer active.'));
        return;
      }

      await urlService.incrementClickCount(url.id);
      res.redirect(302, url.original_url);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Redirect error' });
    }
  }

  //Giriş yapmış kullanıcının tüm URL'lerini listeler
  // Giriş yapmamış kullanıcılara boş liste döndürür
  // short_url ve display_url ekler
  async getUserUrls(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      let urls: any[] = [];

      // Sadece giriş yapan kullanıcılar kendi linklerini görebilir
      if (userId) {
        urls = await urlService.getUserUrls(userId);
      }
      // Giriş yapmayan kullanıcılar boş liste görür

      const baseUrl = this.getBaseUrl(req);

      const urlsWithShortUrl = urls.map(url => ({
        ...url,
        short_url: `${baseUrl}/${url.short_code}`,
        display_url: `${url.domain || 'x.ly'}/${url.short_code}`
      }));

      res.json({ success: true, data: urlsWithShortUrl });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Unable to retrieve URL list' });
    }
  }

  //URL başlığını günceller
  // Sadece URL sahibi güncelleyebilir
  // Authorization kontrolü yapar
  async updateUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(id)) {
        res.status(400).json({ success: false, error: 'Invalid URL id' });
        return;
      }

      if (typeof title !== 'string' || !title.trim()) {
        res.status(400).json({ success: false, error: 'Title is required' });
        return;
      }

      const updatedUrl = await urlService.updateUrl(id, { title: title.trim().slice(0, 255) }, userId);
      res.json({ success: true, data: updatedUrl });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to update URL'
      });
    }
  }
//URL başlığını günceller
// Sadece URL sahibi güncelleyebilir
// Authorization kontrolü yapar
  async deleteUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params; // URL'den ID'yi çıkarır (/api/urls/123 → id=123)
      const userId = req.user?.userId;
      // JWT token'dan kullanıcı ID'sini alır

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(id)) {
        res.status(400).json({ success: false, error: 'Invalid URL id' });
        return;
      }

      await urlService.deleteUrl(id, userId);
      // UrlService'deki deleteUrl metodunu çağırır
      res.json({ success: true, message: 'URL deleted' });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to delete URL'
      });
    }
  }

  //Detaylı istatistikleri getirir
  // Tıklanma sayısı, son tıklanma tarihi vb.
  // Sadece URL sahibi görebilir
  async getUrlStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: 'Authentication required' });
        return;
      }

      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(id)) {
        res.status(400).json({ success: false, error: 'Invalid URL id' });
        return;
      }

      const stats = await urlService.getUrlStats(id, userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to retrieve URL statistics'
      });
    }
  }

  // Helper functions
  //Request'ten protocol (http/https) algılar
  // Host bilgisini alır (localhost:3000, yourdomain.com)
  // Complete base URL oluşturur
  private getBaseUrl(req: Request): string {
    if (process.env.BASE_URL) {
      return process.env.BASE_URL.replace(/\/+$/, '');
    }

    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    return `${protocol}://${host}`;
  }

  //HTML error page oluşturur
  // 4oo - Bad Request
  // 404 - Not Found
  // 410 - Gone
  // Güzel görünümlü hata sayfası döndürür
  private getErrorPage(errorCode: number, title: string, message: string): string {
    const gradients = {
      404: 'linear-gradient(135deg,#667eea,#764ba2)',
      410: 'linear-gradient(135deg,#f093fb,#f5576c)'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            background: ${gradients[errorCode as keyof typeof gradients] || gradients[404]};
            color: white;
            padding: 50px;
          }
          .container { max-width: 600px; margin: 0 auto; }
          h1 { font-size: 4em; margin: 0; }
          p { font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${errorCode}</h1>
          <h2>${title}</h2>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;
  }
}

//"URL kısaltmak istiyorum" → "Tamam, işlem yapıyorum, işte kısa linkiniz"
// "abc123 linkine tıkladım" → "Asıl adrese yönlendiriyorum"
// "Linklerimi görmek istiyorum" → "İşte listeniz"
// "Bu linki güncellemek istiyorum" → "Güncellendi"
// "Bu linki silmek istiyorum" → "Silindi"

//Route'dan gelen isteği alır
// Service'e iş yaptırır
// Sonucu güzel format'ta döndürür
// Hata kontrolü yapar
// Authorization kontrol eder
