# 🔐 API Keys ve Secret Keys Özeti

Bu dokümantasyon, projede kullanılan tüm API anahtarları ve secret key'lerin nerede saklanması gerektiğini özetler.

## ✅ Yapılan Değişiklikler

### 1. Frontend Kodunda Hardcoded Key'ler Kaldırıldı

- ❌ `public/supabase-client.js` - Hardcoded Supabase URL ve anon key kaldırıldı
- ❌ `public/supabase-config.js` - Dosya silindi (hardcoded key'ler içeriyordu)
- ✅ Environment variables kullanımına geçildi

### 2. Environment Variables Sistemi Kuruldu

- ✅ `api/env.js` - Environment variables API endpoint'i oluşturuldu
- ✅ `public/index.html` - Environment variables loader script eklendi
- ✅ `public/supabase-client.js` - Environment variables'dan okuma sistemi kuruldu

### 3. Güvenlik İyileştirmeleri

- ✅ `.gitignore` güncellendi (`.supabase-credentials` eklendi)
- ✅ `DEPLOY.md` - Gerçek API key'ler placeholder'a çevrildi
- ✅ Dokümantasyon oluşturuldu

## 📋 Vercel Environment Variables Listesi

Vercel Dashboard'da aşağıdaki environment variables'ları eklemeniz gerekiyor:

### Zorunlu Environment Variables

| Key | Açıklama | Nereden Alınır |
|-----|----------|----------------|
| `SUPABASE_URL` | Supabase proje URL'si | Supabase Dashboard > Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key | Supabase Dashboard > Settings > API > anon public key |

### Opsiyonel Environment Variables

Şu anda kullanılmıyor, ileride gerekirse eklenebilir:

- `SUPABASE_SERVICE_ROLE_KEY` - ⚠️ Sadece backend/serverless functions için, frontend'de ASLA kullanmayın!

## 🔒 Güvenlik Kuralları

### ✅ Yapılması Gerekenler

1. ✅ Tüm API key'leri Vercel Environment Variables'da saklayın
2. ✅ Environment variables'ı tüm environment'lar için ekleyin (Production, Preview, Development)
3. ✅ `.env.local` dosyasını local development için kullanabilirsiniz (opsiyonel)
4. ✅ `supabase-config.example.js` dosyasını örnek olarak saklayın (hardcoded key içermemeli)

### ❌ Yapılmaması Gerekenler

1. ❌ API key'leri kod içine yazmayın
2. ❌ API key'leri GitHub'a commit etmeyin
3. ❌ API key'leri console.log ile yazdırmayın
4. ❌ Service Role Key'i frontend'de kullanmayın
5. ❌ Hardcoded key'leri production kodunda bırakmayın

## 📁 Dosya Durumu

### ✅ Temiz Dosyalar (Hardcoded Key Yok)

- ✅ `public/supabase-client.js` - Environment variables kullanıyor
- ✅ `api/env.js` - Environment variables API endpoint'i
- ✅ `public/index.html` - Environment variables loader
- ✅ `DEPLOY.md` - Placeholder key'ler kullanıyor

### ⚠️ Dikkat Edilmesi Gereken Dosyalar

- ⚠️ `.supabase-credentials` - Local development için, `.gitignore`'da (GitHub'a commit edilmemeli)
- ⚠️ `supabase-setup.md` - Dokümantasyon dosyası, örnek URL'ler içeriyor (kabul edilebilir)
- ⚠️ `SITE_URL.md` - Dokümantasyon dosyası, örnek URL'ler içeriyor (kabul edilebilir)
- ⚠️ `SUPABASE_INTEGRATION.md` - Dokümantasyon dosyası, örnek URL'ler içeriyor (kabul edilebilir)

### ✅ Örnek Dosyalar

- ✅ `supabase-config.example.js` - Örnek dosya, placeholder key'ler içeriyor

## 🚀 Deployment Checklist

Production'a deploy etmeden önce kontrol edin:

- [ ] Vercel Dashboard'da `SUPABASE_URL` environment variable eklendi
- [ ] Vercel Dashboard'da `SUPABASE_ANON_KEY` environment variable eklendi
- [ ] Environment variables tüm environment'lar için seçildi (Production, Preview, Development)
- [ ] Kod içinde hardcoded key yok
- [ ] `.env.local` dosyası varsa `.gitignore`'da
- [ ] `supabase-config.js` dosyası silindi veya `.gitignore`'da
- [ ] Deployment sonrası console'da `✅ Environment variables yüklendi` mesajı görünüyor

## 📞 Sorun Giderme

Eğer environment variables çalışmıyorsa:

1. Vercel Dashboard > Settings > Environment Variables bölümünü kontrol edin
2. Yeni bir deployment yapın (environment variables değişiklikleri için gerekli)
3. Browser console'u kontrol edin (`✅ Environment variables yüklendi` mesajını görmelisiniz)
4. `https://maphypee.com/api/env` endpoint'ini test edin (JSON response görmelisiniz)

Daha fazla bilgi için `VERCEL_ENV_SETUP.md` dosyasına bakın.

## 📧 Destek

Sorun yaşarsanız: **destek@maphypee.com**
