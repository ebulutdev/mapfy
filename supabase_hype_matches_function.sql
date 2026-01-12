-- Hype Eşleşme Fonksiyonu (Güncellenmiş)
-- Bu SQL fonksiyonunu Supabase SQL Editor'da çalıştırın
-- Eşleşme puanı ve nedenini hesaplayan fonksiyon
-- Puanlama: İlçe (40) + Şehir (30) + Yaş ≤3 (30) = Toplam 100 Puan

CREATE OR REPLACE FUNCTION get_hype_matches(match_limit INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  image_url TEXT,
  match_score INT,
  match_reason TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  my_city TEXT;
  my_district TEXT;
  my_age INT;
  my_id UUID;
BEGIN
  -- 1. Senin bilgilerini al
  my_id := auth.uid();
  IF my_id IS NULL THEN RETURN; END IF;
  
  SELECT city_name, district, age INTO my_city, my_district, my_age 
  FROM profiles WHERE profiles.user_id = my_id;
  
  IF my_city IS NULL OR my_age IS NULL THEN RETURN; END IF;

  -- 2. HESAPLAMA MOTORU
  RETURN QUERY
  SELECT 
    p.user_id,
    p.name::TEXT,
    p.image_url::TEXT,
    
    -- === PUANLAMA ALGORİTMASI (TOPLAM 100) ===
    (
      -- Aynı İlçe: 40 Puan
      (CASE WHEN p.district = my_district AND p.district IS NOT NULL THEN 40 ELSE 0 END) + 
      -- Aynı Şehir: 30 Puan
      (CASE WHEN p.city_name = my_city AND p.city_name IS NOT NULL THEN 30 ELSE 0 END) +    
      -- Yaş Farkı Maks 3: 30 Puan
      (CASE WHEN ABS(p.age - my_age) <= 3 AND p.age IS NOT NULL THEN 30 ELSE 0 END)
    )::INT as score,
    
    -- === AKILLI EŞLEŞME METNİ ===
    (
      CASE 
        -- 1. SENARYO: HEPSİ TUTUYOR (FULL HYPE - %100)
        -- İlçe aynıysa şehir zaten aynıdır, yaş da tutuyorsa 100 puandır.
        WHEN p.district = my_district AND ABS(p.age - my_age) <= 3 THEN 
             '🔥 SÜPER HYPE! ' || p.name || ' ile hem aynı ilçedesiniz hem de yaşlarınız çok yakın!'
        
        -- 2. SENARYO: ŞEHİR VE YAŞ TUTUYOR (İyi Eşleşme - %60)
        -- İlçe farklı ama şehir aynı ve yaş yakın.
        WHEN p.city_name = my_city AND ABS(p.age - my_age) <= 3 THEN 
             '✨ ' || p.name || ' ile aynı şehirdesiniz ve yaşlarınız birbirine çok yakın.'
             
        -- 3. SENARYO: SADECE AYNI İLÇE (Yüksek - %70)
        -- Yaş tutmuyor ama konum çok yakın.
        WHEN p.district = my_district THEN 
             '📍 ' || p.name || ' seninle aynı ilçede (' || p.district || ')'
             
        -- Diğer durumlar artık gösterilmiyor (%30'luk eşleşmeler filtrelendi)
        ELSE p.name || ' senin için öneriliyor.'
      END
    )::TEXT as reason

  FROM profiles p
  WHERE p.user_id != my_id 
    AND p.image_url IS NOT NULL 
    AND p.name IS NOT NULL
    -- FİLTRE: Sadece %60 ve üzeri eşleşmeler gösterilsin
    -- Yani: (Şehir aynı VE Yaş ≤ 3) VEYA (İlçe aynı)
    AND (
      (p.city_name = my_city AND ABS(p.age - my_age) <= 3) OR  -- Şehir + Yaş = 60 puan
      (p.district = my_district AND p.district IS NOT NULL)     -- İlçe = 70 puan (şehir zaten aynı)
    )
    
  ORDER BY score DESC, p.created_at DESC
  LIMIT match_limit;
END;
$$;

-- Fonksiyonun çalışması için gerekli izinler
GRANT EXECUTE ON FUNCTION get_hype_matches(INT) TO authenticated;

-- Test için (isteğe bağlı - Supabase'de çalıştırabilirsiniz)
-- SELECT * FROM get_hype_matches(5);
