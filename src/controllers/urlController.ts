import { Request, Response } from 'express';
import { UrlService } from '../services/urlService';
import { AuthenticatedRequest } from '../middleware/auth';

const urlService = new UrlService();

export class UrlController {
  
  // Yeni kısa URL oluştur
  async createShortUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('Received request body:', req.body);
      const { original_url, custom_code, expires_at } = req.body;
      
      if (!original_url) {
        console.log('Missing original_url in request');
        res.status(400).json({
          success: false,
          error: 'Original URL gerekli'
        });
        return;
      }

      console.log('Creating short URL for:', original_url);
      // Kullanıcı giriş yapmışsa user_id'yi al
      const userId = req.user?.userId;
      
      const url = await urlService.createShortUrl({
        original_url,
        custom_code,
        expires_at
      }, userId);

      const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
      const shortUrl = `${baseUrl}/${url.short_code}`;

      console.log('Short URL created successfully:', shortUrl);
      res.status(201).json({
        success: true,
        data: {
          ...url,
          short_url: shortUrl
        }
      });
    } catch (error) {
      console.error('Error in createShortUrl:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  // URL'yi kısa kod ile açma (redirect)
  async redirectToOriginal(req: Request, res: Response): Promise<void> {
    try {
      const { shortCode } = req.params;
      console.log('Redirecting shortCode:', shortCode);

      const url = await urlService.getUrlByShortCode(shortCode);
      console.log('Found URL:', url);

      if (!url) {
        console.log('URL not found for shortCode:', shortCode);
        // HTML error page döndür, JSON değil
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Link Bulunamadı - x.ly</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                text-align: center; 
                padding: 50px 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              }
              .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              }
              .error-code { font-size: 72px; font-weight: bold; margin-bottom: 20px; }
              h1 { margin: 20px 0; font-size: 24px; }
              p { margin: 20px 0; font-size: 16px; opacity: 0.9; }
              a { 
                color: white; 
                text-decoration: none; 
                background: rgba(255, 255, 255, 0.2);
                padding: 12px 24px;
                border-radius: 25px;
                display: inline-block;
                margin-top: 20px;
                transition: all 0.3s ease;
              }
              a:hover { background: rgba(255, 255, 255, 0.3); transform: translateY(-2px); }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-code">404</div>
              <h1>Link Bulunamadı</h1>
              <p>Bu kısa link mevcut değil, süresi dolmuş veya kaldırılmış olabilir.</p>
              <a href="/">🏠 Ana Sayfaya Dön</a>
            </div>
          </body>
          </html>
        `);
        return;
      }

      // Süre kontrolü
      if (url.expires_at && new Date() > new Date(url.expires_at)) {
        res.status(410).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Link Süresi Dolmuş - x.ly</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                text-align: center; 
                padding: 50px 20px; 
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              }
              .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              }
              .error-code { font-size: 72px; font-weight: bold; margin-bottom: 20px; }
              h1 { margin: 20px 0; font-size: 24px; }
              p { margin: 20px 0; font-size: 16px; opacity: 0.9; }
              a { 
                color: white; 
                text-decoration: none; 
                background: rgba(255, 255, 255, 0.2);
                padding: 12px 24px;
                border-radius: 25px;
                display: inline-block;
                margin-top: 20px;
                transition: all 0.3s ease;
              }
              a:hover { background: rgba(255, 255, 255, 0.3); transform: translateY(-2px); }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-code">⏰</div>
              <h1>Link Süresi Dolmuş</h1>
              <p>Bu kısa linkin kullanım süresi dolmuş. Lütfen yeni bir link oluşturun.</p>
              <a href="/">🏠 Ana Sayfaya Dön</a>
            </div>
          </body>
          </html>
        `);
        return;
      }

      // Aktif olmayan linkler için kontrol
      if (!url.is_active) {
        res.status(410).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Link Devre Dışı - x.ly</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                text-align: center; 
                padding: 50px 20px; 
                background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                color: #333;
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
              }
              .container {
                background: rgba(255, 255, 255, 0.8);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 500px;
                box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
              }
              .error-code { font-size: 72px; font-weight: bold; margin-bottom: 20px; }
              h1 { margin: 20px 0; font-size: 24px; }
              p { margin: 20px 0; font-size: 16px; opacity: 0.8; }
              a { 
                color: #333; 
                text-decoration: none; 
                background: rgba(0, 0, 0, 0.1);
                padding: 12px 24px;
                border-radius: 25px;
                display: inline-block;
                margin-top: 20px;
                transition: all 0.3s ease;
              }
              a:hover { background: rgba(0, 0, 0, 0.2); transform: translateY(-2px); }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-code">🚫</div>
              <h1>Link Devre Dı��ı</h1>
              <p>Bu link şu anda kullanıma kapalı.</p>
              <a href="/">🏠 Ana Sayfaya Dön</a>
            </div>
          </body>
          </html>
        `);
        return;
      }

      // Tıklama kaydı oluştur (opsiyonel - hata olursa yönlendirmeye devam et)
      try {
        const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
        const userAgent = req.get('User-Agent') || 'Unknown';
        const referer = req.get('Referer');

        console.log('Recording click for URL ID:', url.id, 'IP:', ipAddress);
        await urlService.recordClick(url.id, ipAddress, userAgent, referer);
      } catch (clickError) {
        console.error('Error recording click (continuing with redirect):', clickError);
      }

      console.log('Redirecting to:', url.original_url);

      // URL'nin http/https ile başladığından emin ol
      let redirectUrl = url.original_url;
      if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
        redirectUrl = 'https://' + redirectUrl;
      }

      // 302 Temporary Redirect - URL kısaltıcılar için daha uygun
      // Bu sayede:
      // - Kısa URL'ler geçici kabul edilir
      // - İstatistik takibi yapılabilir
      // - Spam koruması sağlanır
      // - Kısa URL'in kendisi arama motorlarında indekslenmez
      res.redirect(302, redirectUrl);
    } catch (error) {
      console.error('Error in redirectToOriginal:', error);
      // HTML error page döndür, JSON değil
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sunucu Hatası - x.ly</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              text-align: center; 
              padding: 50px 20px; 
              background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
              color: #333;
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
            }
            .container {
              background: rgba(255, 255, 255, 0.9);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 40px;
              max-width: 500px;
              box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            }
            .error-code { font-size: 72px; font-weight: bold; margin-bottom: 20px; }
            h1 { margin: 20px 0; font-size: 24px; }
            p { margin: 20px 0; font-size: 16px; opacity: 0.8; }
            a { 
              color: #333; 
              text-decoration: none; 
              background: rgba(0, 0, 0, 0.1);
              padding: 12px 24px;
              border-radius: 25px;
              display: inline-block;
              margin-top: 20px;
              transition: all 0.3s ease;
            }
            a:hover { background: rgba(0, 0, 0, 0.2); transform: translateY(-2px); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error-code">⚠️</div>
            <h1>Sunucu Hatası</h1>
            <p>Link yönlendirmesi sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
            <a href="/">🏠 Ana Sayfaya Dön</a>
          </div>
        </body>
        </html>
      `);
    }
  }

  // URL istatistikleri - Sadece kendi linklerini görebilsin
  async getUrlStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { shortCode } = req.params;
      const userId = req.user?.userId;

      const stats = await urlService.getUrlStats(shortCode, userId);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'URL bulunamadı veya erişim izniniz yok'
        });
        return;
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'İstatistik alınırken hata oluştu'
      });
    }
  }

  // URL'lerin listesini getir
  async listUrls(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('📋 List URLs request received');
      console.log('🔐 User ID:', req.user?.userId);
      console.log('📝 Request headers:', req.headers.authorization ? 'Has auth header' : 'No auth header');

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Kullanıcı giriş yapmış olmalı - yoksa boş array döndür
      const userId = req.user?.userId;

      if (!userId) {
        console.log('🚫 No user logged in - returning empty array');
        res.json({
          success: true,
          data: []
        });
        return;
      }

      // Giriş yapmış kullanıcı - sadece kendi linklerini göster
      console.log('👤 Fetching URLs for logged in user:', userId);
      const urls = await urlService.getUserUrls(userId, limit, offset);
      console.log('📊 User URLs found:', urls.length);

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const urlsWithShortUrl = urls.map(url => ({
        ...url,
        short_url: `${baseUrl}/${url.short_code}`
      }));

      console.log('✅ Sending response with', urlsWithShortUrl.length, 'URLs');
      console.log('🔗 Sample URL:', urlsWithShortUrl[0] ? {
        id: urlsWithShortUrl[0].id,
        title: urlsWithShortUrl[0].title,
        short_url: urlsWithShortUrl[0].short_url,
        clicks: urlsWithShortUrl[0].clicks
      } : 'No URLs');

      res.json({
        success: true,
        data: urlsWithShortUrl
      });
    } catch (error) {
      console.error('❌ Error in listUrls:', error);
      res.status(500).json({
        success: false,
        error: 'URLler alınırken hata oluştu'
      });
    }
  }

  // Veritabanı bağlantı testi
  async testDatabase(req: Request, res: Response): Promise<void> {
    try {
      const result = await urlService.testConnection();
      res.json({
        success: true,
        message: 'Veritabanı bağlantısı başarılı',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Veritabanı bağlantı hatası'
      });
    }
  }

  // URL güncelleme (başlık vs.)
  async updateUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('🔄 UpdateUrl called with:', {
        params: req.params,
        body: req.body,
        userId: req.user?.userId
      });

      const { id } = req.params;
      const { title } = req.body;
      const userId = req.user?.userId;

      if (!title) {
        console.log('❌ Missing title in request body');
        res.status(400).json({
          success: false,
          error: 'Başlık gerekli'
        });
        return;
      }

      console.log('🔍 Attempting to update URL:', { id, title, userId });
      const updatedUrl = await urlService.updateUrl(parseInt(id), { title }, userId);

      if (!updatedUrl) {
        console.log('❌ URL not found or no permission');
        res.status(404).json({
          success: false,
          error: 'URL bulunamadı veya güncelleme izniniz yok'
        });
        return;
      }

      console.log('✅ URL updated successfully:', updatedUrl);
      res.json({
        success: true,
        data: updatedUrl
      });
    } catch (error) {
      console.error('❌ Error in updateUrl:', error);
      res.status(500).json({
        success: false,
        error: 'URL güncellenirken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata')
      });
    }
  }
}
