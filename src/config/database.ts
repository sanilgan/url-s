import { Pool } from 'pg';
import dotenv from 'dotenv';

// veritabanı bağlantı merkezidir.
// Bu dosya PostgreSQL veritabanına bağlanmak ve connection yönetimini sağlamak için kullanılır.
//Connection pool sistemi ile birden fazla eş zamanlı veritabanı işlemini yönetir.
dotenv.config();
//.env dosyasından veritabanı bilgilerini okur
// Hassas bilgileri kod içinde yazmaktan kaçınır
// Farklı ortamlar (development, production) için farklı ayarlar

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = process.env.DB_SSL === 'true'
  || (Boolean(databaseUrl) && process.env.DB_SSL !== 'false');

const pool = new Pool({
  ...(databaseUrl
    ? { connectionString: databaseUrl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433', 10),
        database: process.env.DB_NAME || 'url_kisaltici',
        user: process.env.DB_USER || 'postgres',
        password: String(process.env.DB_PASSWORD || '')
      }),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false
});
//host: Veritabanı sunucusunun adresi (localhost = aynı bilgisayar)
// port: PostgreSQL'in çalıştığı port (5433)
// database: Bağlanılacak veritabanının adı (url_kisaltici)
// user: Veritabanı kullanıcı adı (postgres)
// password: Veritabanı şifresi
//max: 10: En fazla 10 eş zamanlı bağlantı açabilir
// idleTimeoutMillis: 30000: Boş bağlantı 30 saniye sonra kapanır
// connectionTimeoutMillis: 5000: Bağlantı kurarken 5 saniye bekler
// ssl: false: SSL şifreleme kapalı (local development için)

// Event Listeners - Olay Dinleyicileri
//connect: Her yeni bağlantıda success mesajı

pool.on('connect', () => {
  console.log('Database connection successful');
});
// error: Boştaki bağlantılarda oluşan hataları kaydeder
pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

export default pool;

//"Yüzme havuzu" (Connection Pool) kurur
// Yüzücülere (Uygulamanın farklı kısımları) havuz erişimi sağlar
// Su kalitesini (Bağlantı sağlığını) kontrol eder
// Havuz kapasitesini (Maksimum bağlantı) yönetir
// Temizlik (Connection cleanup) yapar
//-
//En fazla 10 kişi aynı anda yüzebilir (max: 10)
// 30 saniye hareketsiz kalırsan çıkarılırsın (idleTimeoutMillis)
// 5 saniye içinde girmezsen sıran iptal (connectionTimeoutMillis)
// Havuz bozulursa tüm sistem durur (process.exit(-1))

//Bu dosya olmadan hiçbir veritabanı işlemi çalışmaz çünkü uygulamanın PostgreSQL'e giden tek yoludur!
