-- ============================================================
-- MAPHYPEE STORIES SİSTEMİ - TAM KURULUM (GÜNCELLENMİŞ)
-- ============================================================
-- Bu SQL kodlarını Supabase Dashboard > SQL Editor'de sırasıyla çalıştırın

-- ============================================================
-- 1. ADIM: HİKAYELER TABLOSU VE İNDEKSLER
-- ============================================================

-- Tabloyu Oluştur (Varsa pas geçer)
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT, -- Cache amaçlı (profil tablosundan güncellenecek)
  avatar_url TEXT, -- Cache amaçlı (profil tablosundan güncellenecek)
  media_url TEXT NOT NULL, -- Resim veya video URL'si
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performans İndeksleri (Hızlı sorgulama için)
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_created_at_gt ON stories(created_at) WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================
-- 2. ADIM: GÜVENLİK VE RLS (TEMİZ BAŞLANGIÇ)
-- ============================================================

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Eski kuralları temizle (Hata almamak için)
DROP POLICY IF EXISTS "Herkes hikayeleri görebilir" ON stories;
DROP POLICY IF EXISTS "Kullanıcı hikaye yükleyebilir" ON stories;
DROP POLICY IF EXISTS "Kullanıcı silebilir" ON stories;
DROP POLICY IF EXISTS "Kullanıcı kendi hikayesini silebilir" ON stories;

-- Yeni kuralları oluştur
CREATE POLICY "Herkes hikayeleri görebilir" ON stories FOR SELECT USING (true);
CREATE POLICY "Kullanıcı hikaye yükleyebilir" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Kullanıcı silebilir" ON stories FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. ADIM: GÜVENLİ CRON JOB (OTOMATİK SİLME)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Önce eski görev varsa güvenli şekilde sil (Hata vermemesi için)
DO $$
BEGIN
    PERFORM cron.unschedule('silme-gorevi');
EXCEPTION WHEN OTHERS THEN
    NULL; -- Görev yoksa hata verme, devam et
END $$;

-- Yeni görevi kur (Her saat başı 24 saati geçenleri siler)
SELECT cron.schedule(
  'silme-gorevi',
  '0 * * * *', -- Her saat başı çalışır (Cron format: dakika saat gün ay hafta)
  $$DELETE FROM stories WHERE created_at < NOW() - INTERVAL '24 hours'$$
);

-- NOT: Eğer pg_cron hatası alırsan (Free planda bazen kısıtlı olabilir),
--      JavaScript tarafında filtreleme yaparak (loadStories fonksiyonu) 
--      kullanıcıya göstermemeyi sağlarız, veritabanından manuel silersin.

-- ============================================================
-- 4. ADIM: ALGORİTMİK AKIŞ FONKSİYONU (JOIN VE NULL DÜZELTMELİ)
-- ============================================================

-- Mevcut hikaye çekme fonksiyonunu oluşturuyoruz (GÜVENLİ VERSİYON)
-- Bu fonksiyon, kullanıcının konumuna göre hikayeleri akıllıca sıralar:
-- 1. Aynı ilçedekiler (en öncelikli) - Priority 1 (Yeşil Halka)
-- 2. Aynı şehirdekiler (orta öncelik) - Priority 2 (Standart Halka)
-- 3. Diğer şehirlerdekiler (düşük öncelik) - Priority 3 (Gri Halka)
CREATE OR REPLACE FUNCTION get_nearby_stories(
  my_city TEXT,      -- Kullanıcının Şehri (örn: Bursa)
  my_district TEXT   -- Kullanıcının İlçesi (örn: Yıldırım)
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ,
  priority_level INTEGER -- Öncelik seviyesi (1=En yakın, 2=Orta, 3=Uzak)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    -- Profil tablosundan güncel veriyi al (COALESCE ile boşluk kontrolü)
    COALESCE(p.name, s.username, 'Kullanıcı') as username,
    COALESCE(p.image_url, s.avatar_url, '') as avatar_url,
    s.media_url,
    s.created_at,
    
    -- SIRALAMA ALGORİTMASI (CASE-INSENSITIVE, NULL-SAFE)
    CASE
      -- 1. ÖNCELİK: İLÇE VE ŞEHİR EŞLEŞMESİ (Yeşil Halka - En Yakın)
      -- Kullanıcıyla hem şehir hem ilçe eşleşenler en üste gelecek
      WHEN LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
           AND LOWER(TRIM(COALESCE(p.district, ''))) = LOWER(TRIM(COALESCE(my_district, ''))) 
           AND COALESCE(p.city_name, '') != '' -- Şehir boş olmamalı
           AND COALESCE(p.district, '') != '' -- İlçe boş olmamalı
           AND COALESCE(my_city, '') != '' -- Gelen şehir parametresi boş olmamalı
           AND COALESCE(my_district, '') != '' -- Gelen ilçe parametresi boş olmamalı
           THEN 1 
      
      -- 2. ÖNCELİK: SADECE ŞEHİR EŞLEŞMESİ (Standart Instagram Halka - Orta)
      -- İlçesi farklı olsa bile aynı şehirdeki kullanıcılar ortada
      WHEN LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
           AND COALESCE(p.city_name, '') != '' 
           AND COALESCE(my_city, '') != ''
           THEN 2 
      
      -- 3. ÖNCELİK: DİĞERLERİ (Gri Halka - Uzak)
      -- Farklı şehirlerdeki kullanıcılar en altta
      ELSE 3 
    END AS priority_level
  
  FROM stories s
  -- ⚠️ ÖNEMLİ: JOIN DÜZELTMESİ
  -- profiles tablosunda 2 sütun var:
  --   1. id (UUID) - PRIMARY KEY (tablonun kendi ID'si)
  --   2. user_id (UUID) - REFERENCES auth.users(id) (auth.users'a referans)
  -- stories tablosunda:
  --   user_id (UUID) - REFERENCES auth.users(id) (auth.users'a referans)
  -- ✅ DOĞRU JOIN: s.user_id = p.user_id (her ikisi de auth.users'a referans)
  -- ❌ YANLIŞ olurdu: s.user_id = p.id (çünkü p.id tablonun kendi ID'si, auth.users değil)
  JOIN profiles p ON s.user_id = p.user_id 
  
  WHERE s.created_at > NOW() - INTERVAL '24 hours' -- Sadece son 24 saat
    AND p.city_name IS NOT NULL -- Şehir bilgisi olmayan profilleri filtrele
  ORDER BY
    priority_level ASC,  -- Önce yakındakiler (1, 2, 3)
    s.created_at DESC;   -- Sonra en yeniler
END;
$$;

-- Anonim kullanıcıların bu fonksiyonu çağırmasına izin ver
GRANT EXECUTE ON FUNCTION get_nearby_stories(TEXT, TEXT) TO anon;

-- Test için (opsiyonel): Bu sorguyu çalıştırarak fonksiyonu test edebilirsin
-- SELECT * FROM get_nearby_stories('Bursa', 'Yıldırım') LIMIT 10;

-- ============================================================
-- 5. ADIM: STORAGE BUCKET OLUŞTURMA (Manuel Adımlar)
-- ============================================================

-- Supabase Dashboard > Storage > New Bucket:
-- 1. Bucket Name: stories
-- 2. Public bucket: ✅ (işaretle - herkes görselleri görebilir)
-- 3. File size limit: 10 MB (veya istediğiniz limit)
-- 4. Allowed MIME types: image/*, video/*
-- 5. Create bucket

-- Storage Policies (Storage > Policies > stories bucket):
-- 1. SELECT (Herkes okuyabilir):
--    CREATE POLICY "Herkes hikaye görsellerini görebilir"
--      ON storage.objects FOR SELECT
--      USING (bucket_id = 'stories');
--
-- 2. INSERT (Sadece giriş yapanlar yükleyebilir):
--    CREATE POLICY "Kullanıcılar hikaye yükleyebilir"
--      ON storage.objects FOR INSERT
--      WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);
--
-- 3. DELETE (Sadece sahibi silebilir):
--    CREATE POLICY "Kullanıcılar kendi hikayelerini silebilir"
--      ON storage.objects FOR DELETE
--      USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- ALGORİTMA GÖRSEL MANTIK
-- ============================================================

-- Priority 1 (Yeşil Bölge - En Üstte):
--   - Kullanıcıyla hem Şehir hem İlçe eşleşenler
--   - Örnek: Sen "Bursa / Yıldırım" → Diğer "Bursa / Yıldırım" kullanıcıları
--   - CSS: .story-circle-nearby (Yeşil/Mavi halka)
--
-- Priority 2 (Sarı/Standart Bölge - Ortada):
--   - Sadece Şehir eşleşenler (İlçe farklı)
--   - Örnek: Sen "Bursa / Yıldırım" → Diğer "Bursa / Nilüfer" kullanıcıları
--   - CSS: .story-circle (Standart Instagram gradient)
--
-- Priority 3 (Gri Bölge - En Altta):
--   - Başka şehirlerdekiler
--   - Örnek: Sen "Bursa / Yıldırım" → "İstanbul / Kadıköy" kullanıcıları
--   - CSS: .story-circle-distant (Gri/Soluk halka)
