-- Messages Tablosu ve Fonksiyonları
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- 1. Messages Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Index'ler (Performans için)
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- 3. Row Level Security (RLS) Politikaları
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi mesajlarını görebilir (gönderdiği veya aldığı)
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Kullanıcılar sadece kendi mesajlarını gönderebilir
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Kullanıcılar sadece kendi mesajlarını güncelleyebilir (okundu işareti için)
CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4. Updated_at Trigger (Otomatik güncelleme)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Mesaj Gönderme Fonksiyonu (İsteğe bağlı - daha güvenli)
CREATE OR REPLACE FUNCTION send_message(
    p_receiver_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_message_id UUID;
    v_sender_id UUID;
BEGIN
    -- Mevcut kullanıcıyı al
    v_sender_id := auth.uid();
    
    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Kullanıcı giriş yapmamış';
    END IF;
    
    -- Mesaj içeriğini kontrol et
    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'Mesaj içeriği boş olamaz';
    END IF;
    
    IF char_length(p_content) > 500 THEN
        RAISE EXCEPTION 'Mesaj 500 karakterden uzun olamaz';
    END IF;
    
    -- Mesajı ekle
    INSERT INTO messages (sender_id, receiver_id, content)
    VALUES (v_sender_id, p_receiver_id, trim(p_content))
    RETURNING id INTO v_message_id;
    
    RETURN v_message_id;
END;
$$;

-- 6. Mesajları Getir Fonksiyonu (İki kullanıcı arasındaki konuşma)
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_other_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    receiver_id UUID,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    is_sent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.created_at,
        m.read_at,
        (m.sender_id = v_current_user_id) as is_sent
    FROM messages m
    WHERE (
        (m.sender_id = v_current_user_id AND m.receiver_id = p_other_user_id) OR
        (m.sender_id = p_other_user_id AND m.receiver_id = v_current_user_id)
    )
    ORDER BY m.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Okunmamış Mesaj Sayısı Fonksiyonu
CREATE OR REPLACE FUNCTION get_unread_message_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_count INT;
BEGIN
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM messages
    WHERE receiver_id = v_current_user_id
      AND read_at IS NULL;
    
    RETURN COALESCE(v_count, 0);
END;
$$;

-- 8. Mesajları Okundu İşaretle Fonksiyonu
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_sender_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
BEGIN
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RETURN;
    END IF;
    
    UPDATE messages
    SET read_at = timezone('utc'::text, now())
    WHERE sender_id = p_sender_id
      AND receiver_id = v_current_user_id
      AND read_at IS NULL;
END;
$$;

-- 9. İzinler
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID) TO authenticated;

-- Test için (isteğe bağlı)
-- SELECT * FROM get_conversation_messages('USER_ID_BURAYA', 50, 0);
-- SELECT get_unread_message_count();

-- ÖNEMLİ: Realtime Özelliğini Aktif Et
-- Supabase Dashboard → Database → Replication → messages tablosunu seç ve "Enable Replication" yap
-- Bu sayede gerçek zamanlı mesaj güncellemeleri çalışacak
