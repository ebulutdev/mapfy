# 🔧 Domain Değişikliği Sonrası Gmail Giriş Sorunu Çözümü

Domain değişikliği yaptıktan sonra Gmail ile giriş yapıldığında profil yüklenmiyor ve "tekrar giriş yap" seçeneği çıkıyorsa, aşağıdaki adımları kontrol edin.

## 🔍 Sorunun Nedenleri

1. **Supabase Redirect URL'leri güncellenmemiş**
2. **Supabase Allowed Origins güncellenmemiş**
3. **Google OAuth Redirect URI güncellenmemiş**
4. **Cookie/Storage domain ayarları eski domain'e bağlı**
5. **OAuth callback sonrası session kontrolü çalışmıyor**

## ✅ Çözüm Adımları

### 1. Supabase Dashboard - Redirect URL'leri Güncelle

**Adımlar:**
1. [Supabase Dashboard](https://supabase.com/dashboard) → Projenizi seçin
2. **Authentication** → **URL Configuration** menüsüne gidin
3. **Redirect URLs** bölümüne yeni domain'i ekleyin:

```
https://yeni-domain.com
https://yeni-domain.com/
https://yeni-domain.com/?u=*
https://yeni-domain.com/?id=*
```

**ÖNEMLİ:** Eski domain'i kaldırmayın, sadece yenisini ekleyin. Her iki domain de çalışabilir.

### 2. Supabase Dashboard - Allowed Origins Güncelle

**Adımlar:**
1. **Authentication** → **URL Configuration** menüsünde
2. **Site URL** bölümünü yeni domain'e güncelleyin:
   ```
   https://yeni-domain.com
   ```
3. **Additional Allowed Origins** bölümüne yeni domain'i ekleyin:
   ```
   https://yeni-domain.com
   https://www.yeni-domain.com (eğer www kullanıyorsanız)
   ```

### 3. Google Cloud Console - OAuth Redirect URI Güncelle

**Adımlar:**
1. [Google Cloud Console](https://console.cloud.google.com) → Projenizi seçin
2. **APIs & Services** → **Credentials** menüsüne gidin
3. OAuth 2.0 Client ID'nizi bulun ve **düzenleyin** (kalem ikonu)
4. **Authorized redirect URIs** bölümüne şunu ekleyin:
   ```
   https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback
   ```
   (Bu Supabase'in callback URL'i, domain değişikliğinden etkilenmez)

**NOT:** Google OAuth için Supabase callback URL'i değişmez. Sadece Supabase'in kendi redirect URL'lerini güncellemeniz yeterli.

### 4. Tarayıcı Cache ve Cookie'leri Temizle

**Adımlar:**
1. Tarayıcıyı tamamen kapatın
2. Tarayıcıyı tekrar açın
3. **Gizli/Özel mod** (Incognito/Private) kullanarak test edin
4. Veya **Developer Tools** → **Application** → **Clear Storage** → **Clear site data**

**Neden:** Eski domain'e ait cookie'ler ve localStorage verileri yeni domain'de çalışmaz.

### 5. Vercel Environment Variables Kontrolü

**Adımlar:**
1. [Vercel Dashboard](https://vercel.com/dashboard) → Projenizi seçin
2. **Settings** → **Environment Variables** menüsüne gidin
3. `SUPABASE_URL` ve `SUPABASE_ANON_KEY` değerlerinin doğru olduğundan emin olun
4. Eğer değişiklik yaptıysanız, **Redeploy** yapın

### 6. Kod Kontrolü - redirectTo URL'i

**Dosya:** `public/app.js` (satır 4083)

**Kontrol:**
```javascript
redirectTo: window.location.origin + window.location.pathname,
```

Bu kod otomatik olarak mevcut domain'i kullanır, bu yüzden genellikle sorun olmaz. Ancak yine de kontrol edin.

### 7. Session Kontrolü - onAuthStateChange

**Dosya:** `public/app.js` (satır 157)

**Kontrol:** `onAuthStateChange` event listener'ının çalıştığından emin olun:

```javascript
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    // Session kontrolü burada yapılıyor
});
```

**Test:** Browser Console'da bu log'ları görmelisiniz.

## 🧪 Test Adımları

1. **Gizli modda** (Incognito) siteyi açın
2. **Google ile Giriş Yap** butonuna tıklayın
3. Google hesabınızı seçin
4. İzinleri onaylayın
5. **Yönlendirme sonrası** Browser Console'u açın
6. Şu log'ları kontrol edin:
   - `✅ Supabase client initialized`
   - `Auth state changed: SIGNED_IN`
   - `Session: { user: {...}, access_token: "..." }`

## ❌ Hala Çalışmıyorsa

### Kontrol Listesi:

- [ ] Supabase Redirect URL'leri güncellendi mi?
- [ ] Supabase Allowed Origins güncellendi mi?
- [ ] Google OAuth Redirect URI doğru mu? (Supabase callback URL'i)
- [ ] Tarayıcı cache temizlendi mi?
- [ ] Vercel Environment Variables doğru mu?
- [ ] Vercel'de redeploy yapıldı mı?
- [ ] Browser Console'da hata var mı?

### Debug İçin Kod Ekleme

`public/app.js` dosyasına şu kodları ekleyin (geçici olarak):

```javascript
// Session kontrolü - Debug için
supabase.auth.getSession().then(({ data: { session }, error }) => {
    console.log('🔍 Current Session:', session);
    console.log('🔍 Session Error:', error);
    if (session) {
        console.log('✅ User logged in:', session.user.email);
    } else {
        console.log('❌ No session found');
    }
});

// OAuth callback kontrolü
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('code') || urlParams.get('access_token')) {
    console.log('🔍 OAuth callback detected');
    console.log('🔍 URL params:', Object.fromEntries(urlParams));
}
```

## 📝 Önemli Notlar

1. **Supabase callback URL değişmez:** `https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback` her zaman aynı kalır
2. **Domain değişikliği sonrası:** Sadece Supabase'in redirect URL'lerini güncellemeniz yeterli
3. **Cookie'ler:** Yeni domain'de eski cookie'ler çalışmaz, kullanıcılar tekrar giriş yapmalı
4. **Değişikliklerin yayınlanması:** Supabase ve Google değişiklikleri 5-10 dakika içinde aktif olur

## 🎯 Hızlı Çözüm

Eğer acil çözüm istiyorsanız:

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Yeni domain'i **Redirect URLs** ve **Allowed Origins**'e ekleyin
3. **Save** butonuna tıklayın
4. **5-10 dakika bekleyin**
5. **Gizli modda** test edin

Bu genellikle sorunu çözer!
