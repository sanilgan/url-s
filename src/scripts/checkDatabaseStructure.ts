import pool from '../config/database';

const checkDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking database structure...');

    // URLs tablosunun kolonlarını detaylı olarak kontrol et
    const urlsColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'urls' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📋 URLs table structure:');
    urlsColumnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Test query - title sütunu ile
    try {
      const testResult = await client.query('SELECT id, title FROM urls LIMIT 1');
      console.log('✅ Title column is accessible');
      if (testResult.rows.length > 0) {
        console.log('📝 Sample title value:', testResult.rows[0].title);
      }
    } catch (error) {
      console.error('❌ Error accessing title column:', error);
    }

    // Test update query
    try {
      await client.query('BEGIN');
      const updateTest = await client.query(
        'UPDATE urls SET title = $1 WHERE id = -1 RETURNING *',
        ['Test Title']
      );
      await client.query('ROLLBACK');
      console.log('✅ Update query works fine');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Update query failed:', error);
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    client.release();
  }
};

checkDatabase().then(() => {
  console.log('🏁 Database check completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
