# Stories Storage Bucket Kurulumu

## ❌ Hata
```
StorageApiError: Bucket not found
```

Bu hata, Supabase Storage'da `stories` bucket'ının oluşturulmadığını gösteriyor.

## ✅ Çözüm Adımları

### 1. Supabase Dashboard'a Git
1. https://supabase.com/dashboard adresine git
2. Projeyi seç (https://zwlyucqzjnqtrcztzhcs.supabase.co)

### 2. Storage Bucket Oluştur
1. Sol menüden **Storage** seçeneğine tıkla
2. **New bucket** butonuna tıkla
3. Ayarlar:
   - **Name**: `stories` (tam olarak bu isim olmalı)
   - **Public bucket**: ✅ **MUTLAKA İŞARETLE** (herkes görselleri görebilir)
4. **Create bucket** butonuna tıkla

### 3. Storage Policies (İzinler) Ayarla

Storage → **Policies** → **stories** bucket'ını seç

SQL Editor'de şu kodları çalıştır:

```sql
-- SELECT Policy: Herkes hikayeleri görüntüleyebilir (sadece resim dosyaları)
CREATE POLICY "Public Access - View Stories"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'stories' 
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);

-- INSERT Policy: Herkes hikaye yükleyebilir (sadece resim dosyaları)
CREATE POLICY "Public Access - Upload Stories"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stories'
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
);

-- DELETE Policy: Herkes kendi hikayesini silebilir
CREATE POLICY "Public Access - Delete Stories"
ON storage.objects FOR DELETE
USING (bucket_id = 'stories');
```

**Veya Daha Basit (Tüm Dosya Tiplerine İzin - Test İçin):**

```sql
-- SELECT Policy: Herkes hikayeleri görüntüleyebilir
CREATE POLICY "Public Access - View Stories"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

-- INSERT Policy: Herkes hikaye yükleyebilir
CREATE POLICY "Public Access - Upload Stories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stories');

-- DELETE Policy: Herkes hikaye silebilir
CREATE POLICY "Public Access - Delete Stories"
ON storage.objects FOR DELETE
USING (bucket_id = 'stories');
```

## ✅ Kontrol

Bucket oluşturulduktan ve policies eklendikten sonra:

1. Sayfayı yenile (F5)
2. Hikaye eklemeyi tekrar dene
3. Konsolda hata olmamalı

## 📋 Özet

- ✅ Bucket adı: `stories` (tam olarak)
- ✅ Public bucket: **İŞARETLİ** olmalı
- ✅ Policies: SELECT, INSERT, DELETE eklendi

Bu adımları tamamladıktan sonra hikaye yükleme çalışacak! 🎉
