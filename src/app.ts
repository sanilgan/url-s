import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import urlRoutes from './routes/urlRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Trust proxy for getting real IP addresses
app.set('trust proxy', true);

// Database configuration logging
console.log('Database configuration:');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('Password exists:', !!process.env.DB_PASSWORD);

// Debug middleware - tüm istekleri logla
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Short URL redirect route - MUTLAKA API route'larından ÖNCE!
app.get('/:shortCode([a-zA-Z0-9_-]+)', async (req, res) => {
  try {
    const { shortCode } = req.params;
    console.log(`🔄 Redirect request for: ${shortCode}`);

    const { UrlController } = await import('./controllers/urlController');
    const urlController = new UrlController();
    await urlController.redirectToOriginal(req, res);
  } catch (error) {
    console.error('❌ Redirect error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirect Error - x.ly</title>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>Redirect Error</h1>
        <p>Something went wrong while redirecting.</p>
        <a href="/">← Back to Home</a>
      </body>
      </html>
    `);
  }
});

// API Routes - redirect route'undan SONRA
app.use('/api/urls', urlRoutes);
app.use('/api/auth', authRoutes);

// Ana sayfa için catch-all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;
