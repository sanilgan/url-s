# LinkShort

Express, TypeScript ve Firebase Cloud Firestore ile geliştirilmiş URL kısaltma uygulaması.

## Özellikler

- Kullanıcı kaydı ve JWT ile giriş
- Oturum açmadan kısa link oluşturma
- Özel kısa kodlar
- Link düzenleme ve silme
- Tıklanma istatistikleri
- QR kod üretimi
- Vercel üzerinde Express dağıtımı

## Firebase Yapısı

Uygulama Firestore içinde iki koleksiyon kullanır:

- `users`: kullanıcı profili ve bcrypt parola özeti
- `urls`: kısa kod, hedef URL, sahiplik ve tıklanma verileri

Kısa kod aynı zamanda `urls` doküman kimliğidir. Firestore koleksiyonları ilk kayıt sırasında otomatik oluşur; SQL tablosu veya migration gerekmez.

Tarayıcıya ait Firebase `apiKey` değeri backend erişimi sağlamaz. Vercel’de çalışan Express sunucusu Firebase Admin SDK kullandığı için servis hesabı gereklidir.

## Firebase Hazırlığı

1. Firebase Console içinde `url-s-c6e4d` projesini açın.
2. **Build → Firestore Database → Create database** ile Firestore oluşturun.
3. **Project settings → Service accounts → Generate new private key** seçin.
4. İndirilen JSON dosyasının tamamını Vercel’de `FIREBASE_SERVICE_ACCOUNT_KEY` olarak ekleyin.
5. `firestore.rules` dosyasındaki kuralları Firebase’e deploy edin. Admin SDK bu kuralları IAM ile güvenli biçimde aşar; tarayıcıdan doğrudan erişim kapalı kalır.

## Vercel Değişkenleri

```env
NODE_ENV=production
FIREBASE_PROJECT_ID=url-s-c6e4d
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
JWT_SECRET=uzun-ve-rastgele-bir-deger
BASE_URL=https://proje-adiniz.vercel.app
```

`DATABASE_URL`, `POSTGRES_URL`, `DB_HOST` ve diğer PostgreSQL değişkenleri artık kullanılmaz; Vercel’den kaldırılabilir.

## Yerel Kullanım

```bash
npm install
cp .env.example .env
npm run check-firebase
npm run dev
```

Servis hesabı dosyasını ortam değişkeni yerine yerelde kullanmak için:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/tam/yol/service-account.json"
npm run dev
```

## Kontrol Adresleri

```text
GET /api/health
GET /api/health/firebase
```

İkinci adres `status: "connected"` döndürdüğünde Firestore bağlantısı hazırdır.

## Komutlar

```bash
npm run dev
npm run build
npm start
npm run check-firebase
```

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
