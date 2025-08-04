import pool from '../config/database';

async function addTitleColumn() {
  const client = await pool.connect();

  try {
    console.log('🔍 URLs tablosunu kontrol ediliyor...');

    // URLs tablosunun sütunlarını listele
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'urls' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('📋 URLs tablosu mevcut sütunları:');
    columnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (null: ${row.is_nullable})`);
    });

    // Title sütunu var mı kontrol et
    const titleColumn = columnsResult.rows.find(row => row.column_name === 'title');
    const updatedAtColumn = columnsResult.rows.find(row => row.column_name === 'updated_at');

    if (!titleColumn) {
      console.log('➕ Title sütunu bulunamadı, ekleniyor...');
      await client.query('ALTER TABLE urls ADD COLUMN title VARCHAR(255) DEFAULT \'Untitled Link\'');
      console.log('✅ Title sütunu başarıyla eklendi');
    } else {
      console.log('✅ Title sütunu zaten mevcut');
    }

    if (!updatedAtColumn) {
      console.log('➕ Updated_at sütunu bulunamadı, ekleniyor...');
      await client.query('ALTER TABLE urls ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      console.log('✅ Updated_at sütunu başarıyla eklendi');
    } else {
      console.log('✅ Updated_at sütunu zaten mevcut');
    }

    // Son durumu kontrol et
    const finalResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'urls' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 URLs tablosu güncel yapısı:');
    finalResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (null: ${row.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addTitleColumn().catch(console.error);
