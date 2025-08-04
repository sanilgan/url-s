import pool from '../config/database';

const createTables = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Creating database tables...');

    // Users tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `);
    console.log('✅ Users table created/verified');

    // URLs tablosu - clicks kolonu eklendi
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        original_url TEXT NOT NULL,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        clicks INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );
    `);
    console.log('✅ URLs table created/verified');

    // URL clicks tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS url_clicks (
        id SERIAL PRIMARY KEY,
        url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
        ip_address INET NOT NULL,
        user_agent TEXT,
        referer TEXT,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ URL clicks table created/verified');

    // Index'ler
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_url_clicks_url_id ON url_clicks(url_id);
    `);
    console.log('✅ Indexes created/verified');

    console.log('🎉 Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

const initDatabase = async () => {
  try {
    await createTables();
    console.log('✅ Database ready!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Script olarak çalıştırıldığında
if (require.main === module) {
  initDatabase();
}

export { createTables };
