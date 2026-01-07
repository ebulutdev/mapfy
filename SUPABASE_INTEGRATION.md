# Supabase Entegrasyonu Tamamlandı ✅

## Yapılandırma

Supabase bağlantı bilgileri `public/supabase-client.js` dosyasında tanımlı:
- **URL**: https://zwlyucqzjnqtrcztzhcs.supabase.co
- **Anon Key**: Yapılandırıldı

## Entegre Edilen Fonksiyonlar

### 1. `loadProfilesFromSupabase()`
- Supabase'den tüm profilleri yükler
- Harita yüklendiğinde otomatik çalışır
- Profilleri haritaya ekler

### 2. `saveProfileToSupabase(profile)`
- Yeni profil ekler
- Profil bilgilerini Supabase'e kaydeder
- Dönen ID'yi profile objesine ekler

### 3. `deleteProfileFromSupabase(profileId)`
- Profil ID'si ile Supabase'den siler
- Haritadan da kaldırır

### 4. `uploadImageToSupabase(file, fileName)`
- Görseli Supabase Storage'a yükler
- Public URL döner
- `profile-images` bucket'ını kullanır

## Kullanım

### Profil Ekleme:
```javascript
const profile = {
    name: 'Kullanıcı Adı',
    imageUrl: 'https://...', // veya uploadImageToSupabase() ile yüklenen URL
    cityId: 'istanbul',
    city: 'İstanbul',
    x: 400,
    y: 230
};

// Önce Supabase'e kaydet
await saveProfileToSupabase(profile);
// Sonra haritaya ekle
addProfileToMap(profile);
mapState.profiles.push(profile);
```

### Profil Silme:
```javascript
// Önce Supabase'den sil
await deleteProfileFromSupabase(profileId);
// Sonra haritadan kaldır
// (deleteProfile fonksiyonu içinde yapılıyor)
```

## Önemli Notlar

⚠️ **Storage Bucket**: `profile-images` bucket'ının oluşturulmuş olması gerekiyor

⚠️ **Database Schema**: `profiles` tablosu şu sütunlara sahip olmalı:
- id (UUID)
- name (VARCHAR)
- image_url (TEXT)
- city_id (VARCHAR)
- city_name (VARCHAR)
- position_x (DECIMAL)
- position_y (DECIMAL)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

📦 **NPM Paketi**: `npm install @supabase/supabase-js` komutu çalıştırılmalı

## Sonraki Adımlar

1. Supabase Dashboard'da `profiles` tablosunu oluştur
2. `profile-images` storage bucket'ını oluştur
3. Row Level Security (RLS) policy'lerini ayarla
4. Test et!

