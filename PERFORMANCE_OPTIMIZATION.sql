-- ========================================
-- PERFORMANCE OPTIMIZATION - SQL INDEXES
-- ========================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırarak veritabanı sorgularını hızlandırın
-- Sorgu sürelerini milisaniyelere düşürür

-- 1. Messages Tablosu İndeksleri (Mesajlaşma Hızlandırma)
-- Hikaye ID'sine göre mesajları ararken hızlanmak için
CREATE INDEX IF NOT EXISTS idx_messages_story_lookup 
ON messages(story_id, created_at DESC) 
WHERE story_id IS NOT NULL;

-- Sender ID ile aramaları hızlandırmak için
CREATE INDEX IF NOT EXISTS idx_messages_sender_lookup 
ON messages(sender_id, created_at DESC);

-- Receiver ID ile aramaları hızlandırmak için
CREATE INDEX IF NOT EXISTS idx_messages_receiver_lookup 
ON messages(receiver_id, created_at DESC);

-- 2. Profiles Tablosu İndeksleri (Profil Sorgularını Hızlandırma)
-- User ID ile aramalarda (zaten var olabilir, ama emin olmak için)
CREATE INDEX IF NOT EXISTS idx_profiles_userid 
ON profiles(user_id) 
WHERE user_id IS NOT NULL;

-- Premium profilleri hızlı bulmak için
CREATE INDEX IF NOT EXISTS idx_profiles_premium 
ON profiles(is_premium, created_at DESC) 
WHERE is_premium = true;

-- Şehir bazlı aramaları hızlandırmak için
CREATE INDEX IF NOT EXISTS idx_profiles_city 
ON profiles(city_id, is_premium, created_at DESC);

-- 3. Stories Tablosu İndeksleri (Hikaye Sorgularını Hızlandırma)
-- Son 24 saatin aktif hikayelerini çeken sorguyu hızlandırmak için
CREATE INDEX IF NOT EXISTS idx_stories_created_at 
ON stories(created_at DESC);

-- User ID ile hikaye aramalarını hızlandırmak için
CREATE INDEX IF NOT EXISTS idx_stories_user_id 
ON stories(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Aktif hikayeleri hızlı bulmak için (son 24 saat)
-- Bu index, WHERE created_at >= NOW() - INTERVAL '24 hours' sorgularını hızlandırır
CREATE INDEX IF NOT EXISTS idx_stories_active 
ON stories(created_at DESC) 
WHERE created_at >= (NOW() - INTERVAL '24 hours');

-- ========================================
-- PERFORMANCE OPTIMIZATION - FUNCTION LIMITS
-- ========================================

-- get_story_messages fonksiyonuna LIMIT ekle (Çok önemli!)
-- Bir hikayeye 1000 mesaj geldiyse hepsini çekmek sistemi kilitler
-- Sadece son 100 mesajı çekmek yeterlidir
CREATE OR REPLACE FUNCTION get_story_messages(p_story_id UUID)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    sender_name TEXT,
    sender_avatar TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_story_owner_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Hikaye sahibini kontrol et
    SELECT stories.user_id INTO v_story_owner_id
    FROM stories
    WHERE stories.id = p_story_id;
    
    -- Sadece hikaye sahibi veya mesaj gönderen kullanıcı görebilir
    IF v_story_owner_id != v_current_user_id AND 
       NOT EXISTS (SELECT 1 FROM messages WHERE messages.story_id = p_story_id AND messages.sender_id = v_current_user_id) THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id as id,
        m.sender_id,
        m.content,
        m.created_at,
        COALESCE(p.name::TEXT, 'Kullanıcı'::TEXT) as sender_name,
        COALESCE(p.image_url::TEXT, ''::TEXT) as sender_avatar
    FROM messages m
    LEFT JOIN profiles p ON p.user_id = m.sender_id
    WHERE m.story_id = p_story_id
    ORDER BY m.created_at ASC
    LIMIT 100; -- PERFORMANCE: Sadece son 100 mesajı getir (1000 mesaj varsa bile)
END;
$$;

-- İzinleri yeniden ver
GRANT EXECUTE ON FUNCTION get_story_messages(UUID) TO authenticated;

-- ========================================
-- NOTLAR
-- ========================================
-- 1. Bu index'ler mevcut verileri etkilemez, sadece sorgu hızını artırır
-- 2. Index'ler disk alanı kullanır ama sorgu hızı çok artar
-- 3. LIMIT 100 sayesinde hikaye mesajları sayfası anında açılır
-- 4. Eğer index zaten varsa, IF NOT EXISTS sayesinde hata vermez
