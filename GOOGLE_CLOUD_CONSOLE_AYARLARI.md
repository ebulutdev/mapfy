# 🔧 Google Cloud Console - Authorized JavaScript Origins Ayarları

Domain değişikliği sonrası Gmail girişi çalışmıyorsa, Google Cloud Console'da **Authorized JavaScript origins** ayarlarını yapmanız gerekiyor.

## ⚠️ Kritik Hata

**Sorun:** "Authorized JavaScript origins" bölümü boşsa, Google OAuth girişi çalışmaz.

**Hata Mesajı:** `redirect_uri_mismatch` veya `origin_mismatch`

## ✅ Çözüm Adımları

### 1. Google Cloud Console'a Giriş

1. [Google Cloud Console](https://console.cloud.google.com) → Projenizi seçin
2. **APIs & Services** → **Credentials** menüsüne gidin
3. OAuth 2.0 Client ID'nizi bulun ve **düzenleyin** (kalem ikonu)

### 2. Authorized JavaScript Origins Ekle

**Adımlar:**

1. **Authorized JavaScript origins** bölümünü bulun
2. **+ Add URI** butonuna tıklayın
3. Şu URL'leri **ayrı ayrı** ekleyin:

```
https://maphypee.com
https://www.maphypee.com
```

**ÖNEMLİ:**
- `http://` değil, mutlaka `https://` kullanın
- Sonunda `/` (slash) olmamalı
- Her URL'yi ayrı satırda ekleyin

### 3. Authorized redirect URIs Kontrolü

**Mevcut olması gereken:**
```
https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback
```

Bu URL **değişmez** - Supabase'in callback URL'i her zaman aynı kalır.

### 4. Kaydet ve Bekle

1. **SAVE** (Kaydet) butonuna tıklayın
2. **5-10 dakika bekleyin** (Google'ın değişiklikleri yayınlaması için)
3. Tarayıcıyı **tamamen kapat** ve tekrar aç
4. **Gizli modda** test edin

## 📸 Görsel Kontrol

**Doğru Görünüm:**
```
Authorized JavaScript origins
+ Add URI

https://maphypee.com
https://www.maphypee.com
```

**Yanlış Görünüm:**
```
Authorized JavaScript origins
+ Add URI

(boş - hiçbir URL yok)
```

## 🔍 Test

1. Gizli modda siteyi açın
2. "Google ile Giriş Yap" butonuna tıklayın
3. Google hesabınızı seçin
4. İzinleri onaylayın
5. Başarıyla giriş yapıldıysa ✅

## ❌ Hala Çalışmıyorsa

### Kontrol Listesi:

- [ ] Authorized JavaScript origins'e `https://maphypee.com` eklendi mi?
- [ ] `https://` kullanıldı mı? (http değil)
- [ ] Sonunda `/` yok mu?
- [ ] 5-10 dakika beklendi mi?
- [ ] Tarayıcı cache temizlendi mi?
- [ ] Gizli modda test edildi mi?

### Debug İçin:

Browser Console'da şu hataları kontrol edin:
- `redirect_uri_mismatch`
- `origin_mismatch`
- `access_denied`

## 🎯 Hızlı Çözüm

1. Google Cloud Console → Credentials → OAuth Client ID
2. Authorized JavaScript origins → + Add URI
3. `https://maphypee.com` ekle
4. SAVE
5. 5 dakika bekle
6. Gizli modda test et

Bu genellikle sorunu çözer!
