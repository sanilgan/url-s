import { Router } from 'express';
import { UrlController } from '../controllers/urlController';
import { authenticateOptional } from '../middleware/auth';

const router = Router();
const urlController = new UrlController();

// URL kısaltma
router.post('/shorten', authenticateOptional, urlController.createShortUrl.bind(urlController));

// URL listesi
router.get('/list', authenticateOptional, urlController.getUserUrls.bind(urlController));

// URL güncelleme
router.put('/:id', authenticateOptional, urlController.updateUrl.bind(urlController));

// URL silme
router.delete('/:id', authenticateOptional, urlController.deleteUrl.bind(urlController));

// URL istatistikleri
router.get('/:id/stats', authenticateOptional, urlController.getUrlStats.bind(urlController));

export default router;
