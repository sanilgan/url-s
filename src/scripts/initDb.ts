import pool from '../config/database';

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔧 Initializing database...');

    // 1. Users tablosunu oluştur
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) DEFAULT 'User',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // 2. URLs tablosunu oluştur
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        original_url TEXT NOT NULL,
        short_code VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) DEFAULT 'Untitled',
        domain VARCHAR(255) DEFAULT 'x.ly',
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        last_clicked_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // 3. Eksik sütunları ekle (mevcut tablolar için)
    try {
      // name sütunu için users tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'name'
          ) THEN
            ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT 'User';
          END IF;
        END $$;
      `);

      // user_id sütunu için urls tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'user_id'
          ) THEN
            ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);

      // clicks sütunu için urls tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'clicks'
          ) THEN
            ALTER TABLE urls ADD COLUMN clicks INTEGER DEFAULT 0;
          END IF;
        END $$;
      `);

      // domain sütunu için urls tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'domain'
          ) THEN
            ALTER TABLE urls ADD COLUMN domain VARCHAR(255) DEFAULT 'x.ly';
          END IF;
        END $$;
      `);

      // last_clicked_at sütunu için urls tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'last_clicked_at'
          ) THEN
            ALTER TABLE urls ADD COLUMN last_clicked_at TIMESTAMP NULL;
          END IF;
        END $$;
      `);

      // is_active sütunu için urls tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'is_active'
          ) THEN
            ALTER TABLE urls ADD COLUMN is_active BOOLEAN DEFAULT true;
          END IF;
        END $$;
      `);

      // title sütunu için urls tablosu
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'title'
          ) THEN
            ALTER TABLE urls ADD COLUMN title VARCHAR(255) DEFAULT 'Untitled';
          END IF;
        END $$;
      `);

    } catch (alterError) {
      console.log('⚠️ Some columns might already exist, continuing...');
    }

    // 4. Eski sütun isimlerini güncelle
    try {
      // url_count -> clicks
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'url_count'
          ) THEN
            ALTER TABLE urls RENAME COLUMN url_count TO clicks;
          END IF;
        END $$;
      `);

      // click_count -> clicks
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'urls' AND column_name = 'click_count'
          ) THEN
            ALTER TABLE urls RENAME COLUMN click_count TO clicks;
          END IF;
        END $$;
      `);

    } catch (renameError) {
      console.log('⚠️ Column rename operations completed or not needed');
    }

    // 5. Index'leri oluştur
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_urls_is_active ON urls(is_active)');

    // 6. Tablo durumunu kontrol et
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const urlCount = await client.query('SELECT COUNT(*) FROM urls');

    console.log('✅ Database initialized successfully');
    console.log(`📊 Current data: ${userCount.rows[0].count} users, ${urlCount.rows[0].count} URLs`);

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
