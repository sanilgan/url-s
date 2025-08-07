import { Request, Response } from 'express';
import { UrlService } from '../services/urlService';
import { AuthenticatedRequest } from '../middleware/auth';

const urlService = new UrlService();

export class UrlController {

  async createShortUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { original_url, custom_code, expires_at, title, domain } = req.body;

      if (!original_url) {
        res.status(400).json({ success: false, error: 'URL gerekli' });
        return;
      }

      const userId = req.user?.userId;
      const url = await urlService.createShortUrl({
        original_url,
        custom_code,
        expires_at,
        title: title || 'Untitled',
        domain: domain || 'x.ly'
      }, userId);

      // Dinamik base URL oluştur
      const baseUrl = this.getBaseUrl(req);
      const shortUrl = `${baseUrl}/${url.short_code}`;

      res.status(201).json({
        success: true,
        data: {
          ...url,
          short_url: shortUrl,
          display_url: `${domain || 'x.ly'}/${url.short_code}`
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'URL kısaltılırken hata oluştu'
      });
    }
  }

  async redirectToOriginal(req: Request, res: Response): Promise<void> {
    try {
      const { shortCode } = req.params;
      const url = await urlService.getUrlByShortCode(shortCode);

      if (!url) {
        return res.status(404).send(this.getErrorPage(404, 'Link Bulunamadı', 'Bu kısa link mevcut değil veya kaldırılmış.'));
      }

      if (url.expires_at && new Date() > new Date(url.expires_at)) {
        return res.status(410).send(this.getErrorPage(410, 'Link Süresi Dolmuş', 'Bu link artık aktif değil.'));
      }

      await urlService.incrementClickCount(url.id);
      res.redirect(302, url.original_url);
    } catch (error) {
      res.status(500).json({ success: false, error: 'Yönlendirme hatası' });
    }
  }

  async getUserUrls(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const urls = userId ? await urlService.getUserUrls(userId) : await urlService.getAllUrls();

      const baseUrl = this.getBaseUrl(req);

      const urlsWithShortUrl = urls.map(url => ({
        ...url,
        short_url: `${baseUrl}/${url.short_code}`,
        display_url: `${url.domain || 'x.ly'}/${url.short_code}`
      }));

      res.json({ success: true, data: urlsWithShortUrl });
    } catch (error) {
      res.status(500).json({ success: false, error: 'URL listesi alınamadı' });
    }
  }

  async updateUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = req.user?.userId;

      if (!title) {
        res.status(400).json({ success: false, error: 'Başlık gerekli' });
        return;
      }

      const updatedUrl = await urlService.updateUrl(parseInt(id), { title }, userId);
      res.json({ success: true, data: updatedUrl });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'URL güncellenemedi'
      });
    }
  }

  async deleteUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      await urlService.deleteUrl(parseInt(id), userId);
      res.json({ success: true, message: 'URL silindi' });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'URL silinemedi'
      });
    }
  }

  async getUrlStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const stats = await urlService.getUrlStats(parseInt(id), userId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'URL istatistikleri alınamadı'
      });
    }
  }

  // Yardımcı fonksiyonlar
  private getBaseUrl(req: Request): string {
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host');
    return `${protocol}://${host}`;
  }

  private getErrorPage(errorCode: number, title: string, message: string): string {
    const gradients = {
      404: 'linear-gradient(135deg,#667eea,#764ba2)',
      410: 'linear-gradient(135deg,#f093fb,#f5576c)'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head><title>${title} - x.ly</title><meta charset="UTF-8"></head>
      <body style="font-family:Arial;text-align:center;padding:50px;background:${gradients[errorCode] || gradients[404]};color:white;">
        <div style="background:rgba(255,255,255,0.1);border-radius:20px;padding:40px;max-width:500px;margin:0 auto;">
          <div style="font-size:72px;">${errorCode}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="/" style="color:white;text-decoration:none;background:rgba(255,255,255,0.2);padding:12px 24px;border-radius:25px;">🏠 Ana Sayfa</a>
        </div>
      </body>
      </html>
    `;
  }
}
