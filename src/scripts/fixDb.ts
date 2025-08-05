import pool from '../config/database';

const fixDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Fixing database schema...');

    // Önce mevcut tabloları kontrol edelim
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    console.log('📋 Existing tables:', tablesResult.rows.map(r => r.table_name));

    // URLs tablosunun kolonlarını kontrol et
    const urlsColumnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'urls' AND table_schema = 'public'
    `);

    const existingColumns = urlsColumnsResult.rows.map(r => r.column_name);
    console.log('📋 URLs table columns:', existingColumns);

    // Users tablosu yoksa oluştur (user_id eklemeden önce)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log('✅ Users table verified');

    // user_id kolonu yoksa ekle
    if (!existingColumns.includes('user_id')) {
      console.log('➕ Adding user_id column to urls table...');
      await client.query(`
        ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ user_id column added');
    }

    // title kolonu yoksa ekle
    if (!existingColumns.includes('title')) {
      console.log('➕ Adding title column to urls table...');
      await client.query(`
        ALTER TABLE urls ADD COLUMN title VARCHAR(255) DEFAULT 'Untitled'
      `);
      console.log('✅ title column added');
    }

    // click_count kolonu varsa ve clicks yoksa, rename et
    if (existingColumns.includes('click_count') && !existingColumns.includes('clicks')) {
      console.log('🔄 Renaming click_count to clicks...');
      await client.query(`
        ALTER TABLE urls RENAME COLUMN click_count TO clicks
      `);
      console.log('✅ Column renamed');
    }
    // clicks kolonu yoksa ve click_count da yoksa, yeni clicks kolonu ekle
    else if (!existingColumns.includes('clicks')) {
      console.log('➕ Adding clicks column to urls table...');
      await client.query(`
        ALTER TABLE urls ADD COLUMN clicks INTEGER DEFAULT 0
      `);
      console.log('✅ clicks column added');
    }

    // URL clicks tablosu yoksa oluştur
    await client.query(`
      CREATE TABLE IF NOT EXISTS url_clicks (
        id SERIAL PRIMARY KEY,
        url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
        ip_address INET NOT NULL,
        user_agent TEXT,
        referer TEXT,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ URL clicks table verified');

    // Index'leri oluştur
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
      CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
      CREATE INDEX IF NOT EXISTS idx_url_clicks_url_id ON url_clicks(url_id);
    `);
    console.log('✅ Indexes created');

    console.log('🎉 Database schema fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

const runFix = async () => {
  try {
    await fixDatabase();
    console.log('✅ Database fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
};

// Script olarak çalıştırıldığında
if (require.main === module) {
  runFix();
}

export { fixDatabase };
