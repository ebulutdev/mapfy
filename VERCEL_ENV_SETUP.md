# 🔐 Vercel Environment Variables Kurulum Rehberi

Bu rehber, MapHypee projesi için Vercel Environment Variables'ın nasıl kurulacağını açıklar.

## ⚠️ Güvenlik Uyarısı

**ÖNEMLİ:** Tüm API anahtarları ve secret key'ler artık Vercel Environment Variables'da saklanmalıdır. Frontend kodunda hardcoded key'ler **ASLA** olmamalıdır!

## 📋 Vercel'de Environment Variables Ekleme

### Adım 1: Vercel Dashboard'a Giriş

1. [Vercel Dashboard](https://vercel.com/dashboard) adresine gidin
2. Projenizi seçin (maphypee veya mapfy)

### Adım 2: Environment Variables Ekleme

1. Proje sayfasında **Settings** sekmesine tıklayın
2. Sol menüden **Environment Variables** seçeneğine tıklayın
3. **Add New** butonuna tıklayın

### Adım 3: Gerekli Environment Variables

Aşağıdaki environment variables'ları ekleyin:

#### 1. SUPABASE_URL
- **Key:** `SUPABASE_URL`
- **Value:** Supabase projenizin URL'si (örn: `https://xxxxx.supabase.co`)
- **Environments:** ☑️ Production, ☑️ Preview, ☑️ Development

**Nasıl Bulunur:**
1. [Supabase Dashboard](https://supabase.com/dashboard) → Projenizi seçin
2. **Settings** → **API**
3. **Project URL** değerini kopyalayın

#### 2. SUPABASE_ANON_KEY
- **Key:** `SUPABASE_ANON_KEY`
- **Value:** Supabase anon public key
- **Environments:** ☑️ Production, ☑️ Preview, ☑️ Development

**Nasıl Bulunur:**
1. [Supabase Dashboard](https://supabase.com/dashboard) → Projenizi seçin
2. **Settings** → **API**
3. **anon public** key'i kopyalayın (çok uzun bir JWT token)

## 🔄 Deployment Sonrası

Environment variables eklendikten sonra:

1. **Yeni bir deployment yapın:**
   ```bash
   git commit --allow-empty -m "Trigger deployment for environment variables"
   git push
   ```

   Veya Vercel Dashboard'da **Deployments** → **Redeploy** butonuna tıklayın

2. **Environment variables'ın yüklendiğini kontrol edin:**
   - Tarayıcı console'u açın (F12)
   - Console'da şu mesajı görmelisiniz: `✅ Environment variables yüklendi`
   - Şu mesajı görmelisiniz: `✅ Supabase client initialized`

## 🧪 Test Etme

Environment variables'ın doğru çalıştığını test etmek için:

1. Tarayıcıda `https://maphypee.com/api/env` adresine gidin
2. JSON response'da `SUPABASE_URL` ve `SUPABASE_ANON_KEY` değerlerini görmelisiniz
3. ⚠️ **DİKKAT:** Bu endpoint sadece production'da çalışır, localhost'ta çalışmaz

## 📝 Kod Yapısı

### Environment Variables Akışı

1. **Vercel Environment Variables** → `api/env.js` endpoint'i
2. **`api/env.js`** → Frontend'e JSON olarak döndürür
3. **HTML Script** → `window.ENV` objesini set eder
4. **`supabase-client.js`** → `window.ENV`'den okur ve Supabase client'ı oluşturur

### Dosya Yapısı

```
├── api/
│   └── env.js                    # Environment variables API endpoint
├── public/
│   ├── index.html                # Environment variables loader script
│   └── supabase-client.js        # Supabase client (environment variables kullanır)
└── vercel.json                   # Vercel configuration
```

## 🔒 Güvenlik Notları

### ✅ Yapılması Gerekenler

- ✅ Tüm API key'leri Vercel Environment Variables'da saklayın
- ✅ `.env` dosyalarını `.gitignore`'a ekleyin (zaten ekli)
- ✅ `supabase-config.js` dosyasını GitHub'a commit etmeyin (gitignore'da)
- ✅ Production'da hardcoded key'ler kullanmayın

### ❌ Yapılmaması Gerekenler

- ❌ API key'leri kod içine yazmayın
- ❌ API key'leri GitHub'a commit etmeyin
- ❌ API key'leri console.log ile yazdırmayın
- ❌ Service Role Key'i frontend'de kullanmayın (sadece backend/serverless functions)

## 🐛 Sorun Giderme

### Sorun: "SUPABASE_ANON_KEY environment variable bulunamadı" hatası

**Çözüm:**
1. Vercel Dashboard > Settings > Environment Variables bölümüne gidin
2. `SUPABASE_URL` ve `SUPABASE_ANON_KEY` değişkenlerinin ekli olduğundan emin olun
3. Tüm environment'lar için seçili olduğundan emin olun (Production, Preview, Development)
4. Yeni bir deployment yapın

### Sorun: Local development'ta çalışmıyor

**Çözüm:**
Local development için `.env.local` dosyası oluşturun (opsiyonel):

```bash
# .env.local (sadece local development için)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

**Not:** `.env.local` dosyası zaten `.gitignore`'da, GitHub'a commit edilmeyecek.

## 📞 Destek

Sorun yaşarsanız:
- **📧 E-posta:** destek@maphypee.com
- **📚 Vercel Dokümantasyon:** [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
