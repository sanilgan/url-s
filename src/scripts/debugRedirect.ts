import pool from '../config/database';

const debugRedirect = async () => {
  const client = await pool.connect();

  try {
    console.log('🔍 Debug redirect system...');

    // Mevcut URL'leri listele
    const urlsResult = await client.query(`
      SELECT id, original_url, short_code, expires_at, is_active, clicks
      FROM urls 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('📋 Recent URLs in database:');
    urlsResult.rows.forEach(url => {
      console.log(`  - ID: ${url.id}`);
      console.log(`    Short Code: ${url.short_code}`);
      console.log(`    Original URL: ${url.original_url}`);
      console.log(`    Expires: ${url.expires_at || 'Never'}`);
      console.log(`    Active: ${url.is_active}`);
      console.log(`    Clicks: ${url.clicks || 0}`);
      console.log(`    Full short URL: http://localhost:3002/${url.short_code}`);
      console.log('    ---');
    });

    // Test bir URL'i kontrol et
    if (urlsResult.rows.length > 0) {
      const testUrl = urlsResult.rows[0];
      console.log(`🧪 Testing redirect for: ${testUrl.short_code}`);

      // URL formatını kontrol et
      let originalUrl = testUrl.original_url;
      if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
        console.log(`⚠️  Original URL missing protocol: ${originalUrl}`);
        console.log(`🔧 Would redirect to: https://${originalUrl}`);
      } else {
        console.log(`✅ Original URL has protocol: ${originalUrl}`);
      }
    }

    // Aktif olmayan URL'leri kontrol et
    const inactiveResult = await client.query(`
      SELECT COUNT(*) as count FROM urls WHERE is_active = false
    `);
    console.log(`📊 Inactive URLs: ${inactiveResult.rows[0].count}`);

    // Süresi dolmuş URL'leri kontrol et
    const expiredResult = await client.query(`
      SELECT COUNT(*) as count FROM urls WHERE expires_at < NOW()
    `);
    console.log(`⏰ Expired URLs: ${expiredResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    client.release();
  }
};

debugRedirect().then(() => {
  console.log('🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});
