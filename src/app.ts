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

// Routes
app.use('/api/urls', urlRoutes);
app.use('/api/auth', authRoutes);

// Short URL redirect route - API route'larından sonra ama catch-all'dan önce
app.get('/:shortCode', async (req, res) => {
  // Bu kısa URL yönlendirme route'u
  const { UrlController } = await import('./controllers/urlController');
  const urlController = new UrlController();
  urlController.redirectToOriginal(req, res);
});

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
