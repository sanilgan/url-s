import pool from '../config/database';

const addUrlCountColumns = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Adding url_count and last_clicked_at columns...');

    // Mevcut sütunları kontrol et
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'urls' AND table_schema = 'public'
    `);

    const existingColumns = columnsResult.rows.map(r => r.column_name);
    console.log('📋 Existing columns:', existingColumns);

    // url_count sütunu yoksa ekle
    if (!existingColumns.includes('url_count')) {
      console.log('➕ Adding url_count column...');
      await client.query(`
        ALTER TABLE urls ADD COLUMN url_count INTEGER DEFAULT 0
      `);
      console.log('✅ url_count column added');
    } else {
      console.log('✅ url_count column already exists');
    }

    // last_clicked_at sütunu yoksa ekle
    if (!existingColumns.includes('last_clicked_at')) {
      console.log('➕ Adding last_clicked_at column...');
      await client.query(`
        ALTER TABLE urls ADD COLUMN last_clicked_at TIMESTAMP
      `);
      console.log('✅ last_clicked_at column added');
    } else {
      console.log('✅ last_clicked_at column already exists');
    }

    // Mevcut verilerin url_count'unu sıfırla
    await client.query(`
      UPDATE urls SET url_count = 0 WHERE url_count IS NULL
    `);
    console.log('✅ Existing URLs url_count set to 0');

    console.log('🎉 URL count columns setup completed!');

  } catch (error) {
    console.error('❌ Error adding columns:', error);
    throw error;
  } finally {
    client.release();
  }
};

addUrlCountColumns().then(() => {
  console.log('✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
