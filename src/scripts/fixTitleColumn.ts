import pool from '../config/database';

async function fixTitleColumn() {
  console.log('🔧 Checking and fixing title column...');

  const client = await pool.connect();

  try {
    // Tabloların listesini al
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log('📋 Existing tables:', tablesResult.rows.map(row => row.table_name));

    // URLs tablosundaki kolonları kontrol et
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'urls'
    `);

    const columns = columnsResult.rows.map(row => row.column_name);
    console.log('📋 URLs table columns:', columns);

    // Title kolonu yoksa ekle
    if (!columns.includes('title')) {
      console.log('➕ Adding title column to urls table...');
      await client.query(`
        ALTER TABLE urls 
        ADD COLUMN title VARCHAR(255) DEFAULT 'Untitled'
      `);
      console.log('✅ Title column added successfully');
    } else {
      console.log('✅ Title column already exists');
    }

    // Test sorgusu çalıştır
    console.log('🧪 Testing URLs table query...');
    const testResult = await client.query('SELECT * FROM urls LIMIT 1');
    console.log('✅ Test query successful, sample data:', testResult.rows[0] || 'No data');

  } catch (error) {
    console.error('❌ Error fixing title column:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function runFix() {
  try {
    await fixTitleColumn();
    console.log('✅ Title column fix completed successfully');
  } catch (error) {
    console.error('❌ Title column fix failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runFix();
