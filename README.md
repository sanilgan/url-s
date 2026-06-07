# LinkShort

TypeScript, Express ve PostgreSQL ile geliştirilmiş URL kısaltma uygulaması.

## Özellikler

- Kullanıcı kaydı ve JWT ile giriş
- Oturum açmadan veya kullanıcı hesabıyla kısa link oluşturma
- Özel kısa kod desteği
- Link başlığı düzenleme ve link silme
- Tıklanma sayısı ve son tıklanma zamanı
- QR kod üretimi
- Vercel üzerinde sıfır-konfigürasyon Express dağıtımı

## Teknolojiler

- Node.js 22
- Express.js ve TypeScript
- PostgreSQL
- Argon2 ve JWT
- HTML, CSS ve Vanilla JavaScript

## Yerel Kurulum

```bash
npm install
cp .env.example .env
```

`.env` dosyasındaki PostgreSQL ve `JWT_SECRET` değerlerini doldurun. Ardından:

```bash
npm run init-db
npm run dev
```

Varsayılan adres: `http://localhost:3005`

## Komutlar

```bash
npm run dev       # Geliştirme sunucusu
npm run build     # TypeScript derlemesi
npm start         # Derlenmiş uygulamayı çalıştırır
npm run init-db   # PostgreSQL tablolarını oluşturur/günceller
```

## Vercel Dağıtımı

Vercel, `src/app.ts` içindeki varsayılan Express export'unu algılar. `vercel.json` framework seçimini Express olarak sabitler. `public/` klasörü Vercel CDN üzerinden statik olarak sunulur.

Vercel proje ayarlarında şu ortam değişkenlerini tanımlayın:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=uzun-ve-rastgele-bir-deger
BASE_URL=https://proje-adiniz.vercel.app
```

Veritabanı sağlayıcınız SSL istemiyorsa ayrıca `DB_SSL=false` ekleyin. İlk dağıtımdan önce tabloları üretim veritabanında oluşturun:

```bash
DATABASE_URL="postgresql://..." DB_SSL=true npm run init-db
```

`BASE_URL` özel alan adı kullanıldığında o alan adına güncellenmelidir.

Dağıtımdan sonra backend kontrolü:

```text
https://proje-adiniz.vercel.app/api/health
```

Bu adres veritabanına bağlanmadan `success: true` döndürmelidir. Ana sayfa açılıyor ama kayıt veya URL kısaltma çalışmıyorsa sorun deployment değil, `DATABASE_URL` veya veritabanı tablolarıdır.

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `POST /api/urls/shorten`
- `GET /api/urls/list`
- `PUT /api/urls/:id`
- `DELETE /api/urls/:id`
- `GET /api/urls/:id/stats`
- `GET /:shortCode`

Link güncelleme, silme ve istatistik uçları geçerli bir `Bearer` token gerektirir.
