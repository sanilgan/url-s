import pool from '../config/database';

async function addNameColumn() {
  const client = await pool.connect();

  try {
    console.log('🔍 Users tablosunu kontrol ediliyor...');

    // Users tablosunun sütunlarını listele
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Users tablosu mevcut sütunları:');
    columnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (null: ${row.is_nullable})`);
    });

    // Name sütunu var mı kontrol et
    const nameColumn = columnsResult.rows.find(row => row.column_name === 'name');

    if (!nameColumn) {
      console.log('➕ Name sütunu bulunamadı, ekleniyor...');
      await client.query('ALTER TABLE users ADD COLUMN name VARCHAR(255)');
      console.log('✅ Name sütunu başarıyla eklendi');

      // Mevcut kullanıcılara varsayılan name değeri ata
      await client.query(`
        UPDATE users 
        SET name = split_part(email, '@', 1) 
        WHERE name IS NULL
      `);
      console.log('✅ Mevcut kullanıcılara varsayılan name değerleri atandı');

    } else {
      console.log('✅ Name sütunu zaten mevcut');
    }

    // Son durumu kontrol et
    const finalResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Users tablosu güncel yapısı:');
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

addNameColumn().catch(console.error);
