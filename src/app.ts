import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import urlRoutes from './routes/urlRoutes';
import authRoutes from './routes/authRoutes';
import { UrlController } from './controllers/urlController';
import { firebaseConfigurationError, getFirestoreDb } from './config/firebase';
// ana sunucu dosyasıdır. Express.js web sunucusunu kuran ve yapılandıran merkezi dosyadır.
dotenv.config();

const app = express();
const urlController = new UrlController();
//Express.js framework'ünü başlatır
//HTTP isteklerini dinleyecek sunucuyu oluşturur

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
})); //güvenlik başlıklarını ekler
//Helmet, Express.js uygulamalarında güvenliği artırmak için kullanılan bir middleware'dir.
app.use(cors()); // farklı kaynaklardan gelen istekleri kabul eder
app.use(express.json()); //JSON verilerini parse eder
//Helmet: Güvenlik açıklarını kapatır
// CORS: Frontend'in backend'e erişmesini sağlar
// JSON Parser: Gelen verileri JavaScript objesine çevirir
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.set('trust proxy', true);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'url-shortener',
    database: 'firestore',
    database_configured: !firebaseConfigurationError,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/firebase', async (req, res) => {
  try {
    await getFirestoreDb().collection('_health').limit(1).get();
    res.json({ success: true, database: 'firestore', status: 'connected' });
  } catch (error) {
    res.status(503).json({
      success: false,
      database: 'firestore',
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Firebase connection failed'
    });
  }
});

// Ana Redirect Fonksiyonu
app.get('/:shortCode([a-zA-Z0-9_-]+)', async (req, res) => {
  //localhost:3000/abc123 gibi istekleri yakalar
  // Veritabanından gerçek URL'yi bulup yönlendirir
  // Bu URL kısaltıcının ana özelliği
  try {
    await urlController.redirectToOriginal(req, res);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error - x.ly</title><meta charset="UTF-8"></head>
      <body style="font-family:Arial;text-align:center;padding:50px;">
        <h1>Redirect Error</h1>
        <p>Something went wrong while redirecting.</p>
        <a href="/">← Back to Home</a>
      </body>
      </html>
    `);
  }
});

// Tüm Route'ları Bağlar
app.use('/api/urls', urlRoutes); // URL kısaltma işlemleri için API rotaları
app.use('/api/auth', authRoutes); // Kullanıcı kimlik doğrulama işlemleri için API rotaları

// Error handling -Beklenmeyen hatalar olduğunda kullanıcıya düzgün mesaj gösterir
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

export default app;
