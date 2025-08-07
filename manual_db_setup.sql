-- Manuel olarak users tablosunu oluşturmak için bu SQL'i DBeaver'da çalıştırın:

-- 1. Users tablosunu oluştur
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) DEFAULT 'Kullanıcı',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- 2. Mevcut users tablosuna name kolonu ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT 'Kullanıcı';
    END IF;
END $$;

-- 3. Users tablosu için index oluştur
CREATE INDEX idx_users_email ON users(email);

-- 4. URLs tablosuna user_id kolonu ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. clicks kolonu için (click_count varsa rename et, yoksa yeni ekle)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'click_count'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'clicks'
    ) THEN
        ALTER TABLE urls RENAME COLUMN click_count TO clicks;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'clicks'
    ) THEN
        ALTER TABLE urls ADD COLUMN clicks INTEGER DEFAULT 0;
    END IF;
END $$;

-- 6. Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);

-- 7. Tabloları kontrol et
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'urls' as table_name, COUNT(*) as row_count FROM urls
UNION ALL
SELECT 'url_clicks' as table_name, COUNT(*) as row_count FROM url_clicks;
