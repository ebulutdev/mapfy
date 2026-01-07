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
  ADD COLUMN IF NOT EXISTS snapchat_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instagram_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS facebook_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pinterest_username VARCHAR(255),
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Index ekle (performans için) - eğer yoksa
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

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

## 7. HTML'e Supabase Script Ekleme

`index.html` dosyasına ekle (app.js'den önce):
```html
<script type="module" src="supabase-client.js"></script>
```

## Önemli Notlar:

⚠️ **API Keys Güvenliği:**
- `supabase-config.js` dosyasındaki API keys'leri `.gitignore`'a ekle
- Production'da environment variables kullan
- Anon key'i public olabilir ama service_role key'i ASLA public yapma!

🔒 **Row Level Security:**
- Şu anda herkes profil ekleyip silebilir
- İstersen authentication ekleyebilirsin (auth kullanıcıları sadece kendi profillerini silebilir)

📦 **Storage Limitleri:**
- Free tier: 1GB storage
- Her görseli optimize et (max 500KB önerilir)
