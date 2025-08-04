import { Router } from 'express';
import { UrlController } from '../controllers/urlController';
import { authenticateOptional } from '../middleware/auth';

const router = Router();
const urlController = new UrlController();

// URL kısaltma - opsiyonel auth (hem giriş yapmış hem yapmamış kullanıcılar kullanabilir)
router.post('/shorten', authenticateOptional, (req, res) => {
  urlController.createShortUrl(req, res);
});

// URL'leri listeleme - opsiyonel auth (giriş yapmamışsa boş liste döner)
router.get('/list', authenticateOptional, (req, res) => {
  urlController.listUrls(req, res);
});

// URL istatistikleri - opsiyonel auth (sadece kendi linklerini görebilir)
router.get('/:shortCode/stats', authenticateOptional, (req, res) => {
  urlController.getUrlStats(req, res);
});

// Veritabanı test - auth gerektirmez
router.get('/test-db', (req, res) => {
  urlController.testDatabase(req, res);
});

// URL güncelleme - opsiyonel auth (sadece kendi linklerini güncelleyebilir)
router.put('/:id', authenticateOptional, (req, res) => {
  urlController.updateUrl(req, res);
});

export default router;
