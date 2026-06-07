import { Router } from 'express';
import { UrlController } from '../controllers/urlController';
import { authenticateOptional, authenticateToken } from '../middleware/auth';

const router = Router();
const urlController = new UrlController();
//route ler
// URL kısaltma
router.post('/shorten', authenticateOptional, urlController.createShortUrl.bind(urlController));
//URL: POST /api/urls/shorten
// İşlev: Uzun URL'i kısa URL'e çevirir
// Gönderilen: { original_url: "https://example.com/very/long/url", title?: "My Link" }
// Dönen: { short_code: "abc123", short_url: "https://yourdomain.com/abc123" }

// URL listesi
router.get('/list', authenticateOptional, urlController.getUserUrls.bind(urlController));

// URL güncelleme
router.put('/:id', authenticateToken, urlController.updateUrl.bind(urlController));

// URL silme
router.delete('/:id', authenticateToken, urlController.deleteUrl.bind(urlController));

// URL istatistikleri
router.get('/:id/stats', authenticateToken, urlController.getUrlStats.bind(urlController));

export default router;
