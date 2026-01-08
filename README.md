# Mapfy - Türkiye Haritası

Interactive Türkiye haritası uygulaması. Harita üzerinde şehirleri keşfedin, profilleri görüntüleyin ve sosyal medya hesaplarına ulaşın.

## 🚀 Özellikler

- 🇹🇷 İnteraktif Türkiye haritası (Pan & Zoom)
- 👤 Kullanıcı profilleri
- 🔍 Şehir bazlı filtreleme
- 📱 Mobil uyumlu tasarım
- 🔐 Supabase ile güvenli authentication

## 📦 Kurulum

### Yerel Geliştirme

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Veya production modunda
npm start
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🌐 Vercel Deployment

### 1. GitHub'a Push Edin

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI_ADI/mapfy.git
git push -u origin main
```

### 2. Vercel'e Deploy Edin

#### Yöntem 1: Vercel CLI ile

```bash
# Vercel CLI'ı yükleyin
npm i -g vercel

# Projeyi deploy edin
vercel

# Production'a deploy edin
vercel --prod
```

#### Yöntem 2: Vercel Dashboard ile

1. [Vercel](https://vercel.com) hesabınıza giriş yapın
2. "New Project" butonuna tıklayın
3. GitHub repository'nizi seçin veya import edin
4. Root Directory: `.` (boş bırakın)
5. Build Command: boş bırakın (gerekli değil)
6. Output Directory: boş bırakın
7. Install Command: `npm install`
8. "Deploy" butonuna tıklayın

### 3. Environment Variables Ayarlayın

Vercel Dashboard > Settings > Environment Variables:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Önemli:** `supabase-config.js` dosyasını GitHub'a commit etmeyin! Environment variables kullanın.

### 4. Supabase Config Güncellemesi

`public/supabase-config.js` dosyasını oluşturun (local için):

```javascript
export const supabaseConfig = {
    url: process.env.SUPABASE_URL || 'your_supabase_url',
    anonKey: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key'
};
```

Veya Vercel'de runtime'da environment variables kullanın.

## 📁 Proje Yapısı

```
mapfy/
├── api/                 # Vercel serverless functions
│   ├── cities.js
│   └── city/
│       └── [name].js
├── data/               # JSON verileri
│   └── cities.json
├── public/             # Static dosyalar
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── supabase-client.js
│   └── ...
├── server.js           # Express server (local dev)
├── vercel.json         # Vercel configuration
└── package.json
```

## 🔧 Yapılandırma

### Supabase Setup

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. Database schema'yı kurun (SQL dosyasını çalıştırın)
4. API keys'i alın ve environment variables'a ekleyin

Detaylı kurulum için `SUPABASE_INTEGRATION.md` dosyasına bakın.

## 📝 API Endpoints

### GET /api/cities
Tüm şehirleri döndürür.

### GET /api/city?name=İstanbul
Belirli bir şehir bilgisi döndürür.

## 🌍 Canlı Demo

🌐 **Canlı Site:** [https://mapfy.vercel.app](https://mapfy.vercel.app)

Deploy edildikten sonra otomatik olarak bu URL'de yayınlanır.

## 📄 Lisans

MIT
