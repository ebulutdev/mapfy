# Supabase Entegrasyonu - Adım Adım Rehber

## 1. Supabase Hesabı Oluşturma

1. https://supabase.com adresine git
2. "Start your project" butonuna tıkla
3. GitHub ile giriş yap (veya email ile kayıt ol)
4. Yeni bir proje oluştur:
   - Project Name: `mapfy`
   - Database Password: `DYr90EHjc1x0E05Z` ✅
   - Region: Avrupa'ya yakın seç (örn: `West EU`)

## 2. Supabase Proje Ayarları

### API Keys Alma:
1. Proje oluşturulduktan sonra sol menüden **Settings** → **API** seç
2. Şu bilgileri kopyala:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (uzun bir key)
   - Bu bilgileri güvenli bir yere kaydet!

## 3. Database Schema Oluşturma

1. Sol menüden **SQL Editor** seç
2. Aşağıdaki SQL kodunu çalıştır:

⚠️ **Not**: Eğer "relation already exists" hatası alırsanız, tablo zaten var demektir. Bu normaldir, devam edebilirsiniz.

```sql
-- Profiles tablosu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  city_id VARCHAR(100) NOT NULL,
  city_name VARCHAR(100) NOT NULL,
  position_x DECIMAL(10, 2) NOT NULL,
  position_y DECIMAL(10, 2) NOT NULL,
  snapchat_username VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Eğer tablo zaten varsa, yeni sütunları ekle
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS snapchat_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS facebook_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pinterest_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- user_id için unique constraint ekle (bir kullanıcı sadece bir profil)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id) WHERE user_id IS NOT NULL;

-- Index ekle (performans için) - eğer yoksa
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Row Level Security (RLS) ayarla
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Herkesin okuyabildiği policy (public read)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Herkesin ekleyebildiği policy (public insert)
CREATE POLICY "Anyone can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Herkesin silebildiği policy (public delete)
CREATE POLICY "Anyone can delete profiles"
  ON profiles FOR DELETE
  USING (true);
```

## 4. Storage Bucket Oluşturma

1. Sol menüden **Storage** seç
2. **New bucket** butonuna tıkla
3. Ayarlar:
   - **Name**: `profile-images`
   - **Public bucket**: ✅ (işaretle - herkes görselleri görebilir)
4. **Create bucket** butonuna tıkla

### Storage Policies:
1. Storage → **Policies** → **profile-images** bucket'ını seç
2. Template modal'ını kapatın (X butonuna tıklayın)
3. SQL Editor'de aşağıdaki SQL kodlarını çalıştırın:

**TÜM POLICIES (Hepsini birlikte çalıştırabilirsiniz):**
```sql
-- SELECT Policy: Herkes görselleri görüntüleyebilir
CREATE POLICY "Public Access - View Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

-- INSERT Policy: Herkes görsel yükleyebilir
CREATE POLICY "Public Access - Upload Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images');

-- UPDATE Policy: Herkes görsel güncelleyebilir (opsiyonel)
CREATE POLICY "Public Access - Update Images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-images')
WITH CHECK (bucket_id = 'profile-images');

-- DELETE Policy: Herkes görsel silebilir
CREATE POLICY "Public Access - Delete Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images');
```

**Alternatif (Daha Güvenli - Sadece görsel dosyalarına izin verir):**
```sql
-- SELECT Policy: Herkes görselleri görüntüleyebilir (sadece resim dosyaları)
CREATE POLICY "Public Access - View Images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-images' 
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);

-- INSERT Policy: Herkes görsel yükleyebilir (sadece resim dosyaları)
CREATE POLICY "Public Access - Upload Images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images'
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);

-- DELETE Policy: Herkes görsel silebilir
CREATE POLICY "Public Access - Delete Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images');
```

## 5. NPM Paketi Yükleme

Terminal'de proje klasöründe çalıştır:
```bash
npm install @supabase/supabase-js
```

## 6. Config Dosyası Oluşturma

`public/supabase-config.js` dosyası oluşturuldu (aşağıda kod var)

## 7. Google OAuth Ayarları

### Adım 1: Google Cloud Console'da OAuth Credentials Oluşturma

1. **Google Cloud Console**'a git: https://console.cloud.google.com
2. Yeni bir proje oluştur veya mevcut projeyi seç
3. **APIs & Services** → **Credentials** menüsüne git
4. **+ CREATE CREDENTIALS** → **OAuth client ID** seç
5. Eğer ilk kez OAuth kullanıyorsan, **Configure Consent Screen** ekranı çıkacak:
   - **User Type**: **External** seç → **Create**
   - **App name**: `Mapfy` (veya istediğin isim)
   - **User support email**: Kendi email'ini seç
   - **Developer contact information**: Email'ini gir
   - **Save and Continue** → **Save and Continue** (Scopes için) → **Save and Continue** (Test users için) → **Back to Dashboard**
6. **Credentials** sayfasına geri dön
7. **+ CREATE CREDENTIALS** → **OAuth client ID**
8. **Application type**: **Web application** seç
9. **Name**: `Mapfy Web Client` (veya istediğin isim)
10. **Authorized redirect URIs** bölümüne şu URI'leri ekle (her birini ayrı ayrı):
    ```
    https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback
    http://localhost:3000
    http://localhost:5173
    http://localhost:8080
    http://127.0.0.1:3000
    http://127.0.0.1:5173
    http://127.0.0.1:8080
    ```
    ⚠️ **ÖNEMLİ**: Eğer canlı bir domain kullanıyorsan (örn: `https://maphypee.com`), onu da ekle:
    ```
    https://maphypee.com
    ```
11. **Create** butonuna tıkla
12. **Client ID** ve **Client Secret** değerlerini kopyala (bir daha gösterilmeyecek!)

### Adım 2: Supabase'de Google Provider'ı Aktif Etme

1. Supabase Dashboard'a git: https://supabase.com/dashboard
2. Projeni seç
3. Sol menüden **Authentication** → **Providers** seç
4. **Google** provider'ını bul
5. **Enable Google** toggle'ını aç
6. Kopyaladığın **Client ID** ve **Client Secret** değerlerini yapıştır:
   - **Client ID (for OAuth)**: Google'dan aldığın Client ID
   - **Client Secret (for OAuth)**: Google'dan aldığın Client Secret
7. **Redirect URL** bölümünü kontrol et - şu URL görünmeli:
   ```
   https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback
   ```
   ⚠️ **ÖNEMLİ**: Bu URL'yi kopyala ve Google Cloud Console'a ekle (yukarıdaki Adım 1, madde 10)
8. **Save** butonuna tıkla

### ❌ Hata: redirect_uri_mismatch Çözümü

Eğer "redirect_uri_mismatch" hatası alıyorsan, şu adımları takip et:

1. **Google Cloud Console**'a git: https://console.cloud.google.com
2. **APIs & Services** → **Credentials** menüsüne git
3. OAuth 2.0 Client ID'ni bul ve **düzenle** (kalem ikonuna tıkla)
4. **Authorized redirect URIs** bölümüne şunu **tam olarak** ekle:
   ```
   https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback
   ```
5. **SAVE** butonuna tıkla
6. **5-10 dakika bekle** (Google'ın değişiklikleri yayınlaması için)
7. Tarayıcıyı **tamamen kapat** ve tekrar aç
8. Tekrar dene

⚠️ **Dikkat Edilmesi Gerekenler**: 
- URI'yi **tam olarak** kopyala-yapıştır yap (boşluk, büyük/küçük harf önemli)
- `http://` değil, mutlaka `https://` kullan
- Sonunda `/` (slash) olmamalı
- Değişikliklerin yayınlanması 5-10 dakika sürebilir
- Eğer hala çalışmazsa, tarayıcı cache'ini temizle (Ctrl+Shift+Delete)

### ✅ Test Etme

1. Tarayıcıda siteni aç
2. Artı (+) butonuna tıkla
3. "Google ile Giriş Yap" butonuna tıkla
4. Google hesabını seç
5. İzinleri onayla
6. Başarıyla giriş yapıldıysa, navbar'da profil avatar'ın görünmeli

## 8. HTML'e Supabase Script Ekleme

`index.html` dosyasına ekle (app.js'den önce):
```html
<script type="module" src="supabase-client.js"></script>
```

## 9. Row Level Security (RLS) Politikalarını Güncelleme

Kullanıcıların sadece kendi profillerini güncelleyebilmesi için RLS politikalarını güncelle:

```sql
-- 1. INSERT: Önce varsa eskini sil, sonra yenisini oluştur
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON profiles;

CREATE POLICY "Authenticated users can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. UPDATE: Önce varsa eskini sil, sonra yenisini oluştur
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. DELETE: Önce varsa eskini sil, sonra yenisini oluştur
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
-- Eski, güvensiz "herkes silebilir" kuralı varsa onu da temizle
DROP POLICY IF EXISTS "Anyone can delete profiles" ON profiles;

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. SELECT: Herkes profilleri okuyabilir (mevcut policy korunuyor)
-- Eğer SELECT policy yoksa, aşağıdakini ekle:
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);
```

## Önemli Notlar:

⚠️ **API Keys Güvenliği:**
- `supabase-config.js` dosyasındaki API keys'leri `.gitignore`'a ekle
- Production'da environment variables kullan
- Anon key'i public olabilir ama service_role key'i ASLA public yapma!

🔒 **Row Level Security:**
- Şu anda herkes profil ekleyip silebilir
- Yukarıdaki RLS politikalarını uygulayarak, kullanıcılar sadece kendi profillerini yönetebilir

📦 **Storage Limitleri:**
- Free tier: 1GB storage
- Her görseli optimize et (max 500KB önerilir)

🔐 **Google OAuth:**
- **Redirect URI**: `https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback`
- Bu URL'yi Google Cloud Console'da mutlaka ekle
- Test modunda sadece eklediğin test kullanıcıları giriş yapabilir
- Production için OAuth consent screen'i yayınla
