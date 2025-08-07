-- URL tablosuna domain sütunu ekle
ALTER TABLE urls ADD COLUMN IF NOT EXISTS domain VARCHAR(50) DEFAULT 'x.ly';

-- Mevcut kayıtları güncelle
UPDATE urls SET domain = 'x.ly' WHERE domain IS NULL;
