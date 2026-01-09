# 🚀 Vercel Deployment Rehberi

Bu rehber, Mapfy projesini Vercel'e deploy etmek için adım adım talimatlar içerir.

## 📋 Ön Gereksinimler

1. [GitHub](https://github.com) hesabı
2. [Vercel](https://vercel.com) hesabı (ücretsiz)
3. [Supabase](https://supabase.com) hesabı (ücretsiz)

## 🎯 Adım 1: GitHub Repository Oluşturma

### 1.1. Projeyi Git Repository'ye Dönüştürün

```bash
# Proje klasörüne gidin
cd /Users/kubra/Documents/GitHub/mapfy

# Git başlatın
git init

# .gitignore zaten var, dosyaları ekleyin
git add .

# İlk commit
git commit -m "Initial commit - Mapfy project"
```

### 1.2. GitHub'da Repository Oluşturun

1. [GitHub](https://github.com/new) adresine gidin
2. Repository adı: `mapfy` (veya istediğiniz isim)
3. Public veya Private seçin
4. "Create repository" butonuna tıklayın

### 1.3. Kodu GitHub'a Push Edin

```bash
# GitHub repository URL'inizi ekleyin
git remote add origin https://github.com/KULLANICI_ADI/mapfy.git

# Kodu push edin
git branch -M main
git push -u origin main
```

**ÖNEMLİ:** `supabase-config.js` dosyasını commit etmeyin! Environment variables kullanacağız.

## 🚀 Adım 2: Vercel Deployment

### 2.1. Vercel CLI ile (Önerilen)

```bash
# Vercel CLI yükleyin
npm install -g vercel

# Proje klasöründe
cd /Users/kubra/Documents/GitHub/mapfy

# Vercel'e giriş yapın
vercel login

# Projeyi deploy edin
vercel

# Sorular:
# ? Set up and deploy? Yes
# ? Which scope? (seçin)
# ? Link to existing project? No
# ? What's your project's name? mapfy
# ? In which directory is your code located? ./
# ? Want to override the settings? No

# Production deploy
vercel --prod
```

### 2.2. Vercel Dashboard ile (Alternatif)

1. [Vercel Dashboard](https://vercel.com/dashboard) açın
2. "Add New Project" butonuna tıklayın
3. "Import Git Repository" seçin
4. GitHub repository'nizi seçin
5. Configure Project:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (boş bırakın)
   - **Build Command:** (boş bırakın)
   - **Output Directory:** `public`
   - **Install Command:** `npm install`
6. "Deploy" butonuna tıklayın

## 🔐 Adım 3: Environment Variables Ayarlama

### 3.1. Vercel Dashboard'da

1. Projenizi açın
2. **Settings** > **Environment Variables** sekmesine gidin
3. Aşağıdaki değişkenleri ekleyin:

```
SUPABASE_URL = your_supabase_project_url
SUPABASE_ANON_KEY = your_supabase_anon_key
```

**⚠️ ÖNEMLİ:** Yukarıdaki değerleri Supabase Dashboard'dan alın:
1. [Supabase Dashboard](https://supabase.com/dashboard) → Projenizi seçin
2. Settings → API → Project URL ve anon public key'i kopyalayın
3. Bu değerleri Vercel Environment Variables'a ekleyin

4. Her bir environment için seçin:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development

5. **Save** butonuna tıklayın

### 3.2. Environment Variables Kullanımı

✅ **Artık kod otomatik olarak Vercel Environment Variables'ı kullanıyor!**

- `api/env.js` endpoint'i environment variables'ı frontend'e güvenli şekilde iletir
- `public/supabase-client.js` otomatik olarak environment variables'dan okur
- Production'da hardcoded key'ler kullanılmaz
- Local development için `.env.local` dosyası oluşturabilirsiniz (opsiyonel)

## ✅ Adım 4: Deployment Sonrası Kontroller

### 4.1. Site URL'ini Kontrol Edin

Deploy tamamlandıktan sonra:
- **Production URL:** [https://maphypee.com](https://maphypee.com)
- Özel domain ayarları: Vercel Dashboard > Settings > Domains

### 4.2. Test Edin

1. ✅ Ana sayfa yükleniyor mu?
2. ✅ Harita görüntüleniyor mu?
3. ✅ API endpoints çalışıyor mu? (`/api/cities`)
4. ✅ Supabase bağlantısı çalışıyor mu?

## 🔄 Adım 5: Otomatik Deployment

GitHub'a push yaptığınızda otomatik olarak deploy olur:

```bash
# Değişiklik yaptınız
git add .
git commit -m "Update features"
git push
# Vercel otomatik deploy edecek!
```

## 📝 Yaygın Sorunlar ve Çözümleri

### Sorun: API endpoints 404 döndürüyor

**Çözüm:** `vercel.json` dosyasının doğru olduğundan emin olun ve `api/` klasörünün root'ta olduğunu kontrol edin.

### Sorun: Supabase bağlantı hatası

**Çözüm:** Environment variables'ın doğru ayarlandığından emin olun. Vercel Dashboard > Settings > Environment Variables.

### Sorun: Static dosyalar yüklenmiyor

**Çözüm:** `vercel.json` dosyasında `outputDirectory: "public"` olduğundan emin olun.

### Sorun: Build hatası

**Çözüm:** `package.json` dosyasında tüm dependencies'in doğru olduğundan emin olun.

## 🎉 Başarılı Deployment!

Artık siteniz canlıda! 🚀

- **🌐 Canlı URL:** [https://maphypee.com](https://maphypee.com)
- **📦 GitHub:** Otomatik sync
- **🚀 Deploy:** Her push'ta otomatik

## 📞 Destek

Sorun yaşarsanız:
- **📧 E-posta:** destek@maphypee.com
- Vercel [Dokümantasyon](https://vercel.com/docs)
- Vercel [Discord](https://vercel.com/discord)

