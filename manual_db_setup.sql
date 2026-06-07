--gerekli tabloları ve yapıyı oluşturan manuel kurulum scriptidir
    --iki ana tablo oluşturur.
-- 1. Users tablosunu oluştur
CREATE TABLE IF NOT EXISTS users (  --kullanıcı bilgilerini tutar
    id SERIAL PRIMARY KEY,  -- benzersiz kullanıcı numarası
    email VARCHAR(255) UNIQUE NOT NULL,  -- benzersiz e-posta adresi
    name VARCHAR(255) DEFAULT 'Kullanıcı', -- kullanıcı adı, varsayılan 'Kullanıcı'
    password_hash VARCHAR(255) NOT NULL,  -- şifrelenmiş şifre
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  --kayıt tarihi
    is_active BOOLEAN DEFAULT true   -- kullanıcının aktif olup olmadığı
);

-- 2. URLs tablosunu oluşturur
CREATE TABLE IF NOT EXISTS urls (
    id SERIAL PRIMARY KEY, -- benzersiz URL numarası
    original_url TEXT NOT NULL,  -- asıl uzun link
    short_code VARCHAR(255) UNIQUE NOT NULL, --kısa link kodu
    title VARCHAR(255) DEFAULT 'Untitled', -- URL başlığı, varsayılan 'Untitled'
    domain VARCHAR(255) DEFAULT 'x.ly', -- URL'nin domaini, varsayılan 'x.ly'
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- kullanıcı ile ilişkilendirme, kullanıcı silindiğinde NULL olur
    clicks INTEGER DEFAULT 0, -- tıklama sayısı, varsayılan 0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- URL'nin oluşturulma tarihi
    expires_at TIMESTAMP NULL,  -- URL'nin geçerlilik süresi, NULL ise süresiz
    last_clicked_at TIMESTAMP NULL, -- son tıklanma tarihi, NULL ise hiç tıklanmamış
    is_active BOOLEAN DEFAULT true -- URL'nin aktif olup olmadığı, varsayılan true
);

-- 3. Eksik sütunları ekle (eğer yoksa)
DO $$  --Normal SQL'de IF-ELSE yapıları yoktur. DO $$ ile programlama mantığı yazabilirsiniz:
BEGIN
    -- name sütunu için users tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT 'Kullanıcı';
    END IF;

    -- user_id sütunu için urls tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE urls ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;

    -- clicks sütunu için urls tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'clicks'
    ) THEN
        ALTER TABLE urls ADD COLUMN clicks INTEGER DEFAULT 0;
    END IF;

    -- domain sütunu için urls tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'domain'
    ) THEN
        ALTER TABLE urls ADD COLUMN domain VARCHAR(255) DEFAULT 'x.ly';
    END IF;

    -- last_clicked_at sütunu için urls tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'last_clicked_at'
    ) THEN
        ALTER TABLE urls ADD COLUMN last_clicked_at TIMESTAMP NULL;
    END IF;

    -- is_active sütunu için urls tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE urls ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- title sütunu için urls tablosu
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'title'
    ) THEN
        ALTER TABLE urls ADD COLUMN title VARCHAR(255) DEFAULT 'Untitled';
    END IF;
END $$;

-- 4. Eski sütun isimlerini güncelle (eğer varsa)
DO $$
BEGIN
    -- url_count -> clicks
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'url_count'
    ) THEN
        ALTER TABLE urls RENAME COLUMN url_count TO clicks;
    END IF;

    -- click_count -> clicks
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'urls' AND column_name = 'click_count'
    ) THEN
        ALTER TABLE urls RENAME COLUMN click_count TO clicks;
    END IF;
END $$;

-- 5. Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);
CREATE INDEX IF NOT EXISTS idx_urls_is_active ON urls(is_active);

-- 6. Tabloları kontrol et
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'urls' as table_name, COUNT(*) as row_count FROM urls;

-- 7. Sütunları kontrol et
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('users', 'urls')
ORDER BY table_name, ordinal_position;
