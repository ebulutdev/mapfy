-- ============================================================
-- PREMIUM GÖRÜNÜRLÜK PAKETİ - VERİTABANI ŞEMA GÜNCELLEMELERİ
-- ============================================================
-- Bu SQL kodlarını Supabase Dashboard > SQL Editor'de çalıştırın

-- ============================================================
-- 1. ADIM: PROFILES TABLOSUNA PREMIUM ALANLARI EKLE
-- ============================================================

-- Premium durumu için alanlar
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS premium_purchase_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_profiles_is_premium ON profiles(is_premium) WHERE is_premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_premium_until ON profiles(premium_until) WHERE is_premium = TRUE;

-- ============================================================
-- 2. ADIM: PREMIUM DURUMU KONTROL FONKSİYONU
-- ============================================================
-- Bu fonksiyon, kullanıcının premium durumunun hala geçerli olup olmadığını kontrol eder
-- premium_until tarihi geçmişse, is_premium'u FALSE yapar

CREATE OR REPLACE FUNCTION check_premium_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Premium süresi dolmuş kullanıcıları güncelle
  UPDATE profiles
  SET is_premium = FALSE,
      premium_until = NULL
  WHERE is_premium = TRUE
    AND premium_until IS NOT NULL
    AND premium_until < NOW();
END;
$$;

-- ============================================================
-- 3. ADIM: PREMIUM AKTİFLEŞTİRME FONKSİYONU
-- ============================================================
-- Ödeme başarılı olduğunda bu fonksiyon çağrılabilir
-- user_id: Premium satın alan kullanıcının ID'si
-- duration_days: Premium süresi (gün cinsinden, varsayılan: 7)

CREATE OR REPLACE FUNCTION activate_premium(
  p_user_id UUID,
  p_duration_days INTEGER DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_premium_until TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Premium bitiş tarihini hesapla
  v_premium_until := NOW() + (p_duration_days || ' days')::INTERVAL;
  
  -- Kullanıcının premium durumunu güncelle
  UPDATE profiles
  SET is_premium = TRUE,
      premium_purchase_date = NOW(),
      premium_until = v_premium_until,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Eğer profil yoksa hata döndür
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profil bulunamadı'
    );
  END IF;
  
  -- Başarılı yanıt
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'premium_until', v_premium_until,
    'message', 'Premium aktifleştirildi'
  );
END;
$$;

-- ============================================================
-- 4. ADIM: TÜM KULLANICILARI LİSTELEME (DİREKTORY İÇİN)
-- ============================================================
-- Bu fonksiyon hem ücretsiz hem premium kullanıcıları döndürür (liste/directory için)

CREATE OR REPLACE FUNCTION get_all_profiles_for_directory()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name VARCHAR,
  image_url TEXT,
  city_id VARCHAR,
  city_name VARCHAR,
  position_x DECIMAL,
  position_y DECIMAL,
  snapchat_username VARCHAR,
  instagram_username VARCHAR,
  facebook_username VARCHAR,
  twitter_username VARCHAR,
  pinterest_username VARCHAR,
  age INTEGER,
  district VARCHAR,
  gender VARCHAR,
  daily_message TEXT,
  message_date TIMESTAMPTZ,
  is_premium BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Önce süresi dolan premium'ları güncelle
  PERFORM check_premium_status();
  
  -- Tüm kullanıcıları döndür (free ve premium)
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.name::VARCHAR,
    p.image_url::TEXT,
    p.city_id::VARCHAR,
    p.city_name::VARCHAR,
    p.position_x::DECIMAL,
    p.position_y::DECIMAL,
    p.snapchat_username::VARCHAR,
    p.instagram_username::VARCHAR,
    p.facebook_username::VARCHAR,
    p.twitter_username::VARCHAR,
    p.pinterest_username::VARCHAR,
    p.age::INTEGER,
    p.district::VARCHAR,
    p.gender::VARCHAR,
    p.daily_message::TEXT,
    p.message_date::TIMESTAMPTZ,
    p.is_premium::BOOLEAN,
    p.created_at::TIMESTAMPTZ,
    p.updated_at::TIMESTAMPTZ
  FROM profiles p
  ORDER BY 
    p.is_premium DESC, -- Premium kullanıcılar önce
    p.created_at DESC;
END;
$$;

-- Anonim kullanıcılar bu fonksiyonu çağırabilir (directory public)
GRANT EXECUTE ON FUNCTION get_all_profiles_for_directory() TO anon;
GRANT EXECUTE ON FUNCTION get_all_profiles_for_directory() TO authenticated;

-- ============================================================
-- 6. ADIM: STORY SIRALAMASINI GÜNCELLE (PREMIUM ÖNCELİKLİ)
-- ============================================================
-- get_nearby_stories fonksiyonunu güncelle (STORIES_SETUP.sql'deki fonksiyon)
-- Önce mevcut fonksiyonu yedekle ve yenisini oluştur

CREATE OR REPLACE FUNCTION get_nearby_stories(
  my_city TEXT,
  my_district TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ,
  priority_level INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Önce süresi dolan premium'ları güncelle
  PERFORM check_premium_status();
  
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    COALESCE(p.name, s.username, 'Kullanıcı')::TEXT as username,
    COALESCE(p.image_url, s.avatar_url, '')::TEXT as avatar_url,
    s.media_url::TEXT,
    s.created_at::TIMESTAMPTZ,
    -- SIRALAMA ALGORİTMASI (PREMIUM ÖNCELİKLİ + LOKASYON BAZLI)
    CASE
      -- 0. ÖNCELİK: PREMIUM + İLÇE VE ŞEHİR EŞLEŞMESİ (En Öncelikli)
      WHEN p.is_premium = TRUE 
           AND (p.premium_until IS NULL OR p.premium_until > NOW())
           AND LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
           AND LOWER(TRIM(COALESCE(p.district, ''))) = LOWER(TRIM(COALESCE(my_district, ''))) 
           AND COALESCE(p.city_name, '') != '' 
           AND COALESCE(p.district, '') != '' 
           AND COALESCE(my_city, '') != '' 
           AND COALESCE(my_district, '') != '' 
           THEN 0
      
      -- 1. ÖNCELİK: İLÇE VE ŞEHİR EŞLEŞMESİ (Yeşil Halka - En Yakın)
      WHEN LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
           AND LOWER(TRIM(COALESCE(p.district, ''))) = LOWER(TRIM(COALESCE(my_district, ''))) 
           AND COALESCE(p.city_name, '') != '' 
           AND COALESCE(p.district, '') != '' 
           AND COALESCE(my_city, '') != '' 
           AND COALESCE(my_district, '') != '' 
           THEN 1
      
      -- 2. ÖNCELİK: PREMIUM + SADECE ŞEHİR EŞLEŞMESİ
      WHEN p.is_premium = TRUE 
           AND (p.premium_until IS NULL OR p.premium_until > NOW())
           AND LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
           AND COALESCE(p.city_name, '') != '' 
           AND COALESCE(my_city, '') != '' 
           THEN 2
      
      -- 3. ÖNCELİK: SADECE ŞEHİR EŞLEŞMESİ (Standart Instagram Halka - Orta)
      WHEN LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
           AND COALESCE(p.city_name, '') != '' 
           AND COALESCE(my_city, '') != '' 
           THEN 3
      
      -- 4. ÖNCELİK: PREMIUM + DİĞERLERİ
      WHEN p.is_premium = TRUE 
           AND (p.premium_until IS NULL OR p.premium_until > NOW())
           THEN 4
      
      -- 5. ÖNCELİK: DİĞERLERİ (Gri Halka - Uzak)
      ELSE 5
    END AS priority_level
  FROM stories s
  JOIN profiles p ON s.user_id = p.user_id
  WHERE s.created_at > NOW() - INTERVAL '24 hours'
    AND p.city_name IS NOT NULL
  ORDER BY 
    priority_level ASC, -- Önce premium + yakındakiler (0, 1, 2, 3, 4, 5)
    s.created_at DESC; -- Sonra en yeniler
END;
$$;

-- Anonim kullanıcılar bu fonksiyonu çağırabilir
GRANT EXECUTE ON FUNCTION get_nearby_stories(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_nearby_stories(TEXT, TEXT) TO authenticated;
