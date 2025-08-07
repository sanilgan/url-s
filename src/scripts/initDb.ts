import pool from '../config/database';

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔧 Initializing database...');

    // Users tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      )
    `);

    // URLs tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        original_url TEXT NOT NULL,
        short_code VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) DEFAULT 'Untitled',
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        url_count INTEGER DEFAULT 0,
        last_clicked_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export default initDatabase;
