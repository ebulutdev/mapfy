-- ==================== PROFİL İSTATİSTİKLERİ SUPABASE KURULUMU ====================
-- Bu dosyayı Supabase SQL Editor'de çalıştırarak istatistik sistemini kurun

-- 1. PROFİL TABLOSUNA İSTATİSTİK KOLONLARI EKLE
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- 2. MEVCUT PROFİLLERİN İSTATİSTİKLERİNİ SIFIRLA (İsteğe bağlı)
-- UPDATE profiles SET click_count = 0, view_count = 0, share_count = 0;

-- 3. RPC FONKSİYONLARI OLUŞTUR (Atomic işlemler için güvenli)

-- Click Count Artırma Fonksiyonu
CREATE OR REPLACE FUNCTION increment_click_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET click_count = COALESCE(click_count, 0) + 1
  WHERE id = row_id;
END;
$$;

-- View Count Artırma Fonksiyonu
CREATE OR REPLACE FUNCTION increment_view_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = row_id;
END;
$$;

-- Share Count Artırma Fonksiyonu
CREATE OR REPLACE FUNCTION increment_share_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = row_id;
END;
$$;

-- 4. RLS (Row Level Security) POLİTİKALARI (İsteğe bağlı - Eğer RLS aktifse)
-- RPC fonksiyonları SECURITY DEFINER kullandığı için genelde RLS'yi bypass eder
-- Ancak emin olmak için kontrol edin:

-- SELECT politikası (İstatistikleri okuma)
-- CREATE POLICY "Profiles are viewable by everyone" ON profiles
--   FOR SELECT USING (true);

-- UPDATE politikası (Sadece RPC fonksiyonları güncelleyebilir)
-- CREATE POLICY "Only RPC functions can update stats" ON profiles
--   FOR UPDATE USING (false); -- RPC fonksiyonları SECURITY DEFINER ile bypass eder

-- 5. İNDEKS EKLE (Performans için - İsteğe bağlı)
-- CREATE INDEX IF NOT EXISTS idx_profiles_click_count ON profiles(click_count DESC);
-- CREATE INDEX IF NOT EXISTS idx_profiles_view_count ON profiles(view_count DESC);
-- CREATE INDEX IF NOT EXISTS idx_profiles_share_count ON profiles(share_count DESC);

-- ==================== KURULUM TAMAMLANDI ====================
-- Artık JavaScript kodunuz bu fonksiyonları kullanabilir:
-- - increment_click_count(profileId)
-- - increment_view_count(profileId)
-- - increment_share_count(profileId)

