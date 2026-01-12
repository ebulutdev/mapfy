-- Story Messages Migration
-- Messages tablosuna story_id alanı ekle (hikayeye özel mesajlar için)

-- 1. Story_id sütunu ekle (NULL olabilir - NULL ise normal DM, dolu ise hikayeye özel mesaj)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS story_id UUID REFERENCES stories(id) ON DELETE CASCADE;

-- 2. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_messages_story_id ON messages(story_id) WHERE story_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_story_created ON messages(story_id, created_at DESC) WHERE story_id IS NOT NULL;

-- 3. RLS Policy güncelleme (hikayeye özel mesajları okuyabilmek için)
-- Hikaye sahibi kendi hikayesine gelen tüm mesajları görebilir
DROP POLICY IF EXISTS "Story owners can view story messages" ON messages;
CREATE POLICY "Story owners can view story messages"
    ON messages FOR SELECT
    USING (
        story_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = messages.story_id 
            AND stories.user_id = auth.uid()
        )
    );

-- Mesaj gönderen kullanıcı kendi gönderdiği hikaye mesajlarını görebilir
DROP POLICY IF EXISTS "Users can view their own story messages" ON messages;
CREATE POLICY "Users can view their own story messages"
    ON messages FOR SELECT
    USING (
        story_id IS NOT NULL AND
        auth.uid() = sender_id
    );

-- Kullanıcılar hikayeye mesaj gönderebilir (story_id ile)
DROP POLICY IF EXISTS "Users can send story messages" ON messages;
CREATE POLICY "Users can send story messages"
    ON messages FOR INSERT
    WITH CHECK (
        story_id IS NOT NULL AND
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM stories 
            WHERE stories.id = story_id
        )
    );

-- 4. Fonksiyon: Hikayeye gelen mesajları getir (hikaye sahibi için)
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
    ORDER BY m.created_at ASC;
END;
$$;

-- 5. Fonksiyon: Hikayeye mesaj gönder
CREATE OR REPLACE FUNCTION send_story_message(
    p_story_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
    v_sender_id UUID;
    v_story_owner_id UUID;
BEGIN
    v_sender_id := auth.uid();
    
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Kullanıcı giriş yapmamış';
    END IF;
    
    -- Hikaye sahibini al
    SELECT stories.user_id INTO v_story_owner_id
    FROM stories
    WHERE stories.id = p_story_id;
    
    IF v_story_owner_id IS NULL THEN
        RAISE EXCEPTION 'Hikaye bulunamadı';
    END IF;
    
    -- Kullanıcı kendi hikayesine mesaj gönderemez
    IF v_story_owner_id = v_sender_id THEN
        RAISE EXCEPTION 'Kendi hikayenize mesaj gönderemezsiniz';
    END IF;
    
    -- Mesaj içeriğini kontrol et
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Mesaj içeriği boş olamaz';
    END IF;
    
    IF char_length(p_content) > 500 THEN
        RAISE EXCEPTION 'Mesaj 500 karakterden uzun olamaz';
    END IF;
    
    -- Mesajı ekle (receiver_id = hikaye sahibi)
    INSERT INTO messages (sender_id, receiver_id, content, story_id)
    VALUES (v_sender_id, v_story_owner_id, trim(p_content), p_story_id)
    RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$;

-- 6. İzinler
GRANT EXECUTE ON FUNCTION get_story_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_story_message(UUID, TEXT) TO authenticated;

-- 7. Not: Mevcut RLS policy'ler zaten var, sadece yeni policy'ler eklendi
-- Normal DM mesajları (story_id IS NULL) mevcut policy'lerle çalışmaya devam edecek
