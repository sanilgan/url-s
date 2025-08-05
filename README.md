# URL Shortener 

Modern ve kullanıcı dostu URL kısaltma uygulaması. Uzun bağlantıları kısa ve paylaşılabilir linklere dönüştürün, tıklama istatistiklerini takip edin.

## 🚀 Özellikler

- ✂️ Uzun URL'leri otomatik kısaltma (x.ly/xxx formatında)
- 👤 Kullanıcı hesabı sistemi (kayıt/giriş)
- 📊 Gerçek zamanlı tıklama istatistikleri
- ✏️ URL başlıklarını düzenleme
- 📋 Tek tıkla kopyalama
- 🔒 Güvenli kullanıcı kimlik doğrulama
- 📱 Responsive mobil tasarım
- ⚡ Hızlı yönlendirme

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js, TypeScript
- **Veritabanı:** PostgreSQL
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Güvenlik:** JWT, bcrypt
- **Diğer:** nanoid, validator

## 📋 Gereksinimler

- Node.js (v16+)
- PostgreSQL (v12+)
- npm

## 🔧 Kurulum

1. **Projeyi klonlayın:**
   ```bash
   git clone https://github.com/yourusername/url-shortener.git
   cd url-shortener
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Environment dosyasını ayarlayın:**
   `.env` dosyasını oluşturun ve aşağıdaki değerleri ekleyin:
   ```env
   DB_HOST=localhost
   DB_PORT=5433
   DB_NAME=url_kisaltici
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3002
   JWT_SECRET=your-secret-key
   BASE_URL=http://localhost:3002
   ```

4. **Veritabanını oluşturun:**
   ```sql
   CREATE DATABASE url_kisaltici;
   ```

5. **Tabloları oluşturun:**
   ```bash
   npm run init-db
   ```

6. **Uygulamayı başlatın:**
   ```bash
   npm run dev
   ```

## 📁 Proje Yapısı

```
src/
├── config/          # Veritabanı konfigürasyonu
├── controllers/     # API kontrolcüleri
├── middleware/      # Kimlik doğrulama middleware
├── routes/          # API rotaları
├── services/        # İş mantığı servisleri
├── scripts/         # Veritabanı yardımcı scriptleri
└── types/           # TypeScript tip tanımları

public/              # Frontend dosyları
├── index.html       # Ana sayfa
├── style.css        # Stil dosyası
└── app.js           # Frontend JavaScript
```

## 🚀 Kullanım

1. Tarayıcıda `http://localhost:3002` adresine gidin
2. Hesap oluşturun veya giriş yapın
3. Uzun URL'nizi girin ve "Shorten" butonuna tıklayın
4. Kısa linkinizi kopyalayın ve paylaşın
5. "Links" sekmesinden linklerinizi yönetin

## 📊 API Endpoints

- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş yapma
- `POST /api/urls/shorten` - URL kısaltma
- `GET /api/urls` - Kullanıcının URL'leri
- `PUT /api/urls/:id/title` - URL başlığını güncelleme
- `GET /:code` - Kısa URL yönlendirme

## 🤝 Katkıda Bulunma

1. Bu projeyi fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

Zeynep Anılgan - [GitHub](https://github.com/yourusername)
