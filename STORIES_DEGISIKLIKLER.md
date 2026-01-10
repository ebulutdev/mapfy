# Stories (Hikayeler) Özelliği - Detaylı Değişiklikler

Bu dokümanda Stories özelliği için yapılan tüm kod değişiklikleri detaylıca açıklanmıştır.

---

## 📁 Değiştirilen Dosyalar

1. **`public/index.html`** - HTML yapısına Stories container eklendi
2. **`public/style.css`** - Stories için CSS stilleri eklendi
3. **`public/stories.js`** - ✨ YENİ DOSYA: Stories fonksiyonları
4. **`STORIES_SETUP.sql`** - ✨ YENİ DOSYA: Supabase SQL kodları

---

## 1️⃣ `public/index.html` Değişiklikleri

### 📍 Konum: Header'dan sonra, Hero Section'dan önce (Satır 203-218)

#### **Eklenen HTML Kodu:**

```html
<!-- Stories Container (Navbar'ın Altında) -->
<div id="stories-container" class="stories-container" style="display: none;">
    <div class="story-item" id="my-story-item" onclick="uploadStory()" style="display: none;">
        <div class="story-circle add-story">
            <img src="" alt="Sen" id="my-story-avatar" class="story-avatar">
            <div class="plus-icon">+</div>
        </div>
        <span class="story-username">Hikâyeniz</span>
    </div>

    <div id="stories-wrapper" class="stories-wrapper">
        <!-- Stories buraya JavaScript ile yüklenecek -->
    </div>
</div>

<input type="file" id="storyInput" accept="image/*,video/*" style="display: none;">
```

#### **Açıklama:**

1. **`stories-container`** (Ana Container)
   - Navbar'ın hemen altında gösterilecek container
   - Başlangıçta gizli (`display: none`)
   - JavaScript ile kontrol edilecek

2. **`my-story-item`** (Kendi Hikayem Butonu)
   - Kullanıcının kendi hikayesini eklemek için "+" butonu
   - Başlangıçta gizli (sadece profil açan kullanıcılar görecek)
   - `onclick="uploadStory()"` ile dosya seçici açılır

3. **`story-circle add-story`** (Kendi Hikaye Avatarı)
   - Kullanıcının profil resmi buraya gelecek
   - Gri çerçeve (diğerlerinden farklı - Instagram benzeri)
   - Alt sağda "+" ikonu

4. **`stories-wrapper`** (Diğer Kullanıcıların Hikayeleri)
   - Diğer kullanıcıların hikayeleri buraya JavaScript ile eklenecek
   - Dinamik içerik

5. **`storyInput`** (Gizli Dosya Input)
   - Resim/video seçmek için gizli input
   - `accept="image/*,video/*"` ile sadece resim ve video kabul edilir

### 📍 Konum: Script bölümü (Satır 1296-1297)

#### **Eklenen Script:**

```html
<!-- 2. Stories fonksiyonlarını yükle (Supabase'den sonra) -->
<script type="module" src="stories.js"></script>
```

#### **Açıklama:**
- `stories.js` dosyası Supabase'den sonra yükleniyor
- Modül olarak yükleniyor (`type="module"`)
- Bu sayede `supabase-client.js`'den import edebilir

---

## 2️⃣ `public/style.css` Değişiklikleri

### 📍 Konum: Dosyanın sonuna eklendi (Satır 4987'den sonra)

#### **Eklenen CSS Kodu:**

```css
/* ========================================
   STORIES CONTAINER (Hikayeler Şeridi)
   ======================================== */

.stories-container {
    display: flex;
    gap: 15px;
    padding: 12px 15px;
    background: #0a0a0a;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    scrollbar-width: none;
    -ms-overflow-style: none;
    position: sticky;
    top: calc(52px + env(safe-area-inset-top, 0px));
    z-index: 999;
}
```

#### **Açıklama:**

1. **`.stories-container`** (Ana Container Stilleri)
   - `display: flex` - Yatay sıralama
   - `gap: 15px` - Öğeler arası boşluk
   - `padding: 12px 15px` - İç boşluk
   - `background: #0a0a0a` - Koyu arka plan
   - `overflow-x: auto` - Yatay kaydırma
   - `position: sticky` - Navbar'ın altında sabit kalır
   - `top: calc(52px + env(safe-area-inset-top, 0px))` - Navbar yüksekliği + safe area
   - `scrollbar-width: none` - Firefox'ta scrollbar gizli
   - `-ms-overflow-style: none` - IE/Edge'de scrollbar gizli

2. **`.stories-container::-webkit-scrollbar`** (Chrome/Safari Scrollbar Gizleme)
   ```css
   .stories-container::-webkit-scrollbar {
       display: none;
   }
   ```

3. **`.story-item`** (Her Bir Hikaye Kutusu)
   ```css
   .story-item {
       display: inline-flex;
       flex-direction: column;
       align-items: center;
       cursor: pointer;
       width: 70px;
       flex-shrink: 0;
       transition: transform 0.2s ease;
   }
   ```
   - `cursor: pointer` - Tıklanabilir olduğunu gösterir
   - `transition: transform 0.2s ease` - Hover animasyonu

4. **`.story-item:hover`** (Hover Efekti)
   ```css
   .story-item:hover {
       transform: scale(1.05);
   }
   ```
   - Hover'da %5 büyür

5. **`.story-circle`** (Yuvarlak Çerçeve - Instagram Renkli Halka)
   ```css
   .story-circle {
       width: 64px;
       height: 64px;
       border-radius: 50%;
       padding: 2px;
       background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
       position: relative;
   }
   ```
   - Instagram renkli gradient halka
   - `padding: 2px` - İçerik ile halka arası boşluk

6. **`.story-circle.add-story`** (Kendi Hikayem İçin Gri Çerçeve)
   ```css
   .story-circle.add-story {
       background: transparent;
       border: 2px solid rgba(255, 255, 255, 0.3);
       padding: 0;
   }
   ```
   - Kendi hikayem için farklı stil (gri çerçeve)

7. **`.story-avatar`** (Profil Resmi)
   ```css
   .story-avatar {
       width: 100%;
       height: 100%;
       border-radius: 50%;
       border: 2px solid #0a0a0a;
       object-fit: cover;
   }
   ```
   - Yuvarlak profil resmi
   - `object-fit: cover` - Resmi kırpmadan doldurur

8. **`.plus-icon`** (Artı İkonu)
   ```css
   .plus-icon {
       position: absolute;
       bottom: 0;
       right: 0;
       background: #0095f6;
       width: 20px;
       height: 20px;
       border-radius: 50%;
   }
   ```
   - Alt sağda mavi yuvarlak buton
   - Instagram'daki "+" butonu benzeri

9. **`.story-username`** (Kullanıcı Adı)
   ```css
   .story-username {
       color: #fff;
       font-size: 11px;
       margin-top: 6px;
       max-width: 70px;
       overflow: hidden;
       text-overflow: ellipsis;
       white-space: nowrap;
   }
   ```
   - Kullanıcı adını gösterir
   - Uzun isimler için `...` ile kısaltır

10. **Responsive Tasarım** (Mobil için)
    ```css
    @media (max-width: 768px) {
        .stories-container {
            padding: 10px 12px;
            gap: 12px;
        }
        .story-item {
            width: 65px;
        }
        .story-circle {
            width: 60px;
            height: 60px;
        }
    }
    ```
    - Mobilde daha küçük boyutlar

11. **Map View İçin Özel Stil**
    ```css
    .app-container.map-view .stories-container {
        top: calc(40px + env(safe-area-inset-top, 0px));
    }
    ```
    - Harita sayfasında navbar daha küçük olduğu için top değeri ayarlandı

---

## 3️⃣ `public/stories.js` - YENİ DOSYA

### 📍 Tamamen yeni dosya oluşturuldu

#### **Dosya Yapısı:**

```javascript
// 1. Supabase Import
import { supabase } from './supabase-client.js';

// 2. Global Değişkenler
let storiesContainer = null;
let storiesWrapper = null;
let myStoryItem = null;
let myStoryAvatar = null;
let storyInput = null;

// 3. Fonksiyonlar
// - initStoriesElements()
// - checkUserHasProfile()
// - toggleStoriesContainer()
// - loadStories()
// - viewStory()
// - window.uploadStory()
// - DOMContentLoaded event listener
```

### **Detaylı Fonksiyon Açıklamaları:**

#### **1. `initStoriesElements()`**
```javascript
function initStoriesElements() {
    storiesContainer = document.getElementById('stories-container');
    storiesWrapper = document.getElementById('stories-wrapper');
    myStoryItem = document.getElementById('my-story-item');
    myStoryAvatar = document.getElementById('my-story-avatar');
    storyInput = document.getElementById('storyInput');
}
```
**Amaç:** DOM elementlerini cache'ler  
**Ne Zaman Çağrılır:** İlk kullanımdan önce

#### **2. `checkUserHasProfile()`**
```javascript
async function checkUserHasProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, image_url')
        .eq('user_id', user.id)
        .single();

    if (error || !data) return false;
    
    // Avatar güncelle
    if (myStoryAvatar && data.image_url) {
        myStoryAvatar.src = data.image_url;
        myStoryAvatar.alt = data.name || 'Sen';
    }
    
    return true;
}
```
**Amaç:** Kullanıcının profilinin olup olmadığını kontrol eder  
**Dönen Değer:** `true` (profil varsa) veya `false` (yoksa)  
**Önemli:** Profil varsa avatar'ı günceller

#### **3. `toggleStoriesContainer()`**
```javascript
async function toggleStoriesContainer() {
    const hasProfile = await checkUserHasProfile();
    
    if (hasProfile && myStoryItem) {
        myStoryItem.style.display = 'flex';
    } else if (myStoryItem) {
        myStoryItem.style.display = 'none';
    }

    const hasStories = storiesWrapper && storiesWrapper.children.length > 0;
    if (hasProfile || hasStories) {
        storiesContainer.style.display = 'flex';
    } else {
        storiesContainer.style.display = 'none';
    }
}
```
**Amaç:** Stories container'ı gösterir/gizler  
**Mantık:**
- Profil varsa → "+" butonu göster
- Hikayeler varsa → Container göster
- İkisi de yoksa → Container gizle

#### **4. `loadStories()`** ⭐ ÖNEMLİ
```javascript
async function loadStories() {
    // Son 24 saatteki hikayeleri çek
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: stories, error } = await supabase
        .from('stories')
        .select('id, user_id, username, avatar_url, media_url, created_at')
        .gt('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

    // Her bir hikayeyi ekle
    stories.forEach(story => {
        const storyHTML = `...`;
        storiesWrapper.innerHTML += storyHTML;
    });
}
```
**Amaç:** Supabase'den son 24 saatteki hikayeleri çeker ve gösterir  
**Önemli Noktalar:**
- `gt('created_at', oneDayAgo)` - Sadece 24 saat içindekileri getir
- `order('created_at', { ascending: false })` - Yeni hikayeler üstte
- XSS koruması için username escape edilir

#### **5. `viewStory()`**
```javascript
async function viewStory(storyId, mediaUrl, username) {
    window.open(mediaUrl, '_blank');
    // İleride modal ile geliştirilebilir
}
```
**Amaç:** Hikayeyi yeni sekmede açar  
**İleride:** Full-screen modal eklenecek

#### **6. `window.uploadStory()`** ⭐ GLOBAL FONKSİYON
```javascript
window.uploadStory = async function() {
    const hasProfile = await checkUserHasProfile();
    if (!hasProfile) {
        showCustomAlert('Hikaye Paylaşmak İçin Profil Oluşturmalısınız', 
                       'Lütfen önce haritaya profil ekleyin.', 'info');
        return;
    }
    storyInput.click();
};
```
**Amaç:** "+" butonuna tıklanınca dosya seçiciyi açar  
**Güvenlik:** Profil kontrolü yapar  
**Global:** `window.uploadStory` olarak tanımlı (HTML'den çağrılabilir)

#### **7. `DOMContentLoaded` Event Listener** ⭐ ÖNEMLİ
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Supabase hazır olana kadar bekle
    await waitForSupabase?.();
    
    // 2. Elementleri initialize et
    initStoriesElements();
    
    // 3. File input change event
    storyInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        
        // a) Kullanıcı kontrolü
        // b) Profil kontrolü
        // c) Dosya boyutu kontrolü (10MB)
        // d) Dosya tipi kontrolü (image/video)
        // e) Storage'a yükle
        // f) Veritabanına kaydet
        // g) Başarı mesajı
        // h) Hikayeleri yeniden yükle
    });
    
    // 4. İlk yükleme
    setTimeout(async () => {
        await loadStories();
        await toggleStoriesContainer();
    }, 1000);
    
    // 5. Auth state değiştiğinde güncelle
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            loadStories();
            toggleStoriesContainer();
        }
    });
});
```

**Amaç:** Sayfa yüklendiğinde stories sistemini başlatır  
**Akış:**
1. Supabase hazır olana kadar bekler
2. DOM elementlerini cache'ler
3. File input için event listener ekler
4. İlk hikayeleri yükler
5. Auth değişikliklerini dinler

---

## 4️⃣ `STORIES_SETUP.sql` - YENİ DOSYA

### 📍 Supabase SQL Editor'de çalıştırılacak kodlar

#### **1. Tablo Oluşturma**
```sql
CREATE TABLE IF NOT EXISTS stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  media_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Açıklama:**
- `id` - Benzersiz hikaye ID'si
- `user_id` - Hikayeyi paylaşan kullanıcı (auth.users'a referans)
- `username` - Kullanıcı adı (cache)
- `avatar_url` - Profil resmi URL'si (cache)
- `media_url` - Hikaye resmi/video URL'si
- `created_at` - Oluşturulma tarihi (otomatik silme için)

#### **2. Index'ler (Performans)**
```sql
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
```
**Amaç:** Hızlı sorgulama için index'ler

#### **3. Row Level Security (RLS)**
```sql
-- Herkes hikayeleri görebilir
CREATE POLICY "Herkes hikayeleri görebilir" 
  ON stories FOR SELECT 
  USING (true);

-- Kullanıcı hikaye yükleyebilir
CREATE POLICY "Kullanıcı hikaye yükleyebilir" 
  ON stories FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcı kendi hikayesini silebilir
CREATE POLICY "Kullanıcı kendi hikayesini silebilir" 
  ON stories FOR DELETE 
  USING (auth.uid() = user_id);
```
**Açıklama:**
- `SELECT` - Herkes görebilir (public)
- `INSERT` - Sadece kendi user_id'si ile ekleyebilir
- `DELETE` - Sadece kendi hikayesini silebilir

#### **4. Otomatik Silme (pg_cron)** ⭐ ÖNEMLİ
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'silme-gorevi',
  '0 * * * *',    -- Her saat başı
  $$DELETE FROM stories WHERE created_at < NOW() - INTERVAL '24 hours'$$
);
```
**Amaç:** Her saat başı 24 saatten eski hikayeleri otomatik siler  
**Cron Format:** `0 * * * *` = Her saat başı (dakika 0)  
**NOT:** Free planda pg_cron çalışmayabilir, bu durumda JavaScript tarafında filtreleme yapılır

#### **5. Storage Bucket Policies**
```sql
-- Herkes hikaye görsellerini görebilir
CREATE POLICY "Herkes hikaye görsellerini görebilir"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

-- Kullanıcılar hikaye yükleyebilir
CREATE POLICY "Kullanıcılar hikaye yükleyebilir"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);

-- Kullanıcılar kendi hikayelerini silebilir
CREATE POLICY "Kullanıcılar kendi hikayelerini silebilir"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
```
**Amaç:** Storage (dosya) erişim kontrolü

---

## 🔄 Çalışma Mantığı

### **1. Sayfa Yüklendiğinde:**
```
1. Supabase hazır olana kadar bekle
2. Kullanıcının profilini kontrol et
3. Profil varsa → "+" butonunu göster
4. Son 24 saatteki hikayeleri yükle
5. Container'ı göster/gizle
```

### **2. Hikaye Yüklerken:**
```
1. Kullanıcı "+" butonuna tıklar
2. Profil kontrolü yapılır
3. Dosya seçici açılır
4. Dosya seçilir
5. Dosya boyutu/tip kontrolü (10MB, image/video)
6. Storage'a yükle
7. Public URL al
8. Veritabanına kaydet
9. Başarı mesajı
10. Hikayeleri yeniden yükle
```

### **3. Hikaye Görüntüleme:**
```
1. Kullanıcı bir hikayeye tıklar
2. viewStory() çağrılır
3. Yeni sekmede açılır (ileride modal olacak)
```

### **4. Otomatik Silme:**
```
1. pg_cron her saat başı çalışır
2. 24 saatten eski hikayeleri siler
3. JavaScript tarafında da filtreleme yapılır (çift kontrol)
```

---

## 🎯 Önemli Notlar

### **Güvenlik:**
- ✅ Sadece profil açan kullanıcılar hikaye paylaşabilir
- ✅ Kullanıcı sadece kendi hikayesini silebilir
- ✅ Dosya boyutu limiti: 10MB
- ✅ Dosya tipi kontrolü: image/video
- ✅ XSS koruması: Username escape edilir

### **Performans:**
- ✅ Index'ler ile hızlı sorgulama
- ✅ Sadece son 24 saatteki hikayeler çekilir
- ✅ DOM elementleri cache'lenir

### **UX:**
- ✅ Instagram benzeri tasarım
- ✅ Responsive (mobil uyumlu)
- ✅ Hover efektleri
- ✅ Loading durumları
- ✅ Hata mesajları

---

## 📝 Yapılması Gerekenler (Manuel)

1. ✅ `STORIES_SETUP.sql` dosyasını Supabase'de çalıştır
2. ✅ Storage > New Bucket > `stories` oluştur (Public)
3. ✅ Storage Policies'i SQL Editor'de çalıştır
4. ✅ Test et!

---

## 🐛 Potansiyel Sorunlar ve Çözümleri

### **Problem 1: pg_cron çalışmıyor (Free Plan)**
**Çözüm:** JavaScript tarafında zaten filtreleme yapılıyor, veritabanından manuel silme yapabilirsiniz.

### **Problem 2: Stories görünmüyor**
**Kontrol:**
- Supabase'de `stories` tablosu var mı?
- RLS policies doğru mu?
- Console'da hata var mı?

### **Problem 3: Hikaye yüklenemiyor**
**Kontrol:**
- Storage bucket `stories` oluşturuldu mu?
- Storage policies doğru mu?
- Kullanıcının profili var mı?
- Dosya boyutu 10MB'dan küçük mü?

---

## ✨ Sonuç

Stories özelliği başarıyla eklendi! Kullanıcılar artık:
- ✅ Profil açtıktan sonra hikaye paylaşabilir
- ✅ 24 saat boyunca hikayelerini görebilir
- ✅ İstedikleri zaman hikayelerini silebilir
- ✅ Instagram benzeri bir deneyim yaşar

MapHypee gerçekten "Yeni Nesil Sosyal Ağ" oldu! 🎉
