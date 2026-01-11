# Hikayeler ve Hypee Keşfet Sistemi - Teknik Dokümantasyon

## 📋 İçindekiler
1. [Genel Mimari](#genel-mimari)
2. [SQL RPC Fonksiyonu: `get_nearby_stories`](#sql-rpc-fonksiyonu-get_nearby_stories)
3. [Navbar Hikayeleri: `loadStories()`](#navbar-hikayeleri-loadstories)
4. [Hypee Keşfet: `loadHypeeDiscoverStories()`](#hypee-keşfet-loadhypeediscoverstories)
5. [Sıralama Algoritması Detayları](#sıralama-algoritması-detayları)
6. [Görsel Gösterim Mantığı](#görsel-gösterim-mantığı)

---

## 🏗️ Genel Mimari

Sistem **2 ana bölümden** oluşuyor:
1. **Navbar Hikayeleri** (`loadStories()`) - Üst çubukta yatay liste
2. **Hypee Keşfet** (`loadHypeeDiscoverStories()`) - Grid görünümü, Instagram Explore gibi

Her iki sistem de **aynı SQL RPC fonksiyonunu** (`get_nearby_stories`) kullanır, ancak farklı şekillerde gösterir.

---

## 🗄️ SQL RPC Fonksiyonu: `get_nearby_stories`

**Dosya:** `STORIES_SETUP.sql`

Bu fonksiyon, kullanıcının konumuna göre hikayeleri **akıllıca sıralar** ve **priority_level** (öncelik seviyesi) atar.

### Fonksiyon Tanımı

```sql
CREATE OR REPLACE FUNCTION get_nearby_stories(
  my_city TEXT,      -- Kullanıcının Şehri (örn: "Bursa")
  my_district TEXT   -- Kullanıcının İlçesi (örn: "Yıldırım")
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
```

### Sıralama Algoritması (CASE Statement)

```sql
CASE
  -- 1. ÖNCELİK: İLÇE VE ŞEHİR EŞLEŞMESİ (Priority 1 - En Yakın)
  WHEN LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
       AND LOWER(TRIM(COALESCE(p.district, ''))) = LOWER(TRIM(COALESCE(my_district, ''))) 
       AND COALESCE(p.city_name, '') != '' 
       AND COALESCE(p.district, '') != '' 
       AND COALESCE(my_city, '') != '' 
       AND COALESCE(my_district, '') != '' 
       THEN 1 
  
  -- 2. ÖNCELİK: SADECE ŞEHİR EŞLEŞMESİ (Priority 2 - Orta)
  WHEN LOWER(TRIM(COALESCE(p.city_name, ''))) = LOWER(TRIM(COALESCE(my_city, ''))) 
       AND COALESCE(p.city_name, '') != '' 
       AND COALESCE(my_city, '') != ''
       THEN 2 
  
  -- 3. ÖNCELİK: DİĞERLERİ (Priority 3 - Uzak)
  ELSE 3 
END AS priority_level
```

### Filtreler ve Sıralama

```sql
FROM stories s
JOIN profiles p ON s.user_id = p.user_id 

WHERE s.created_at > NOW() - INTERVAL '24 hours' -- Sadece son 24 saat
  AND p.city_name IS NOT NULL -- Şehir bilgisi olmayan profilleri filtrele

ORDER BY
  priority_level ASC,  -- Önce yakındakiler (1, 2, 3)
  s.created_at DESC;   -- Sonra en yeniler
```

**Önemli Notlar:**
- ✅ **Case-insensitive** karşılaştırma (LOWER, TRIM kullanımı)
- ✅ **NULL-safe** kontroller (COALESCE)
- ✅ Sadece **son 24 saat** içindeki hikayeler
- ✅ Şehir bilgisi **olmayan profiller filtrelenir**

---

## 📱 Navbar Hikayeleri: `loadStories()`

**Dosya:** `public/stories.js` (Satır 156-275)

### Çalışma Mantığı

```javascript
async function loadStories() {
    // 1. Kullanıcının konumunu öğren
    const { data: { user } } = await supabase.auth.getUser();
    let myCity = "";
    let myDistrict = "";
    
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('city_name, district')
            .eq('user_id', user.id)
            .single();
        
        myCity = profile.city_name || "";
        myDistrict = profile.district || "";
    }
    
    // 2. RPC fonksiyonunu çağır
    const { data: stories, error } = await supabase
        .rpc('get_nearby_stories', {
            my_city: myCity || null,
            my_district: myDistrict || null
        });
    
    // 3. Hikayeleri DOM'a ekle (priority_level'a göre stil)
    stories.forEach(story => {
        let circleClass = 'story-circle';
        if (story.priority_level === 1) {
            circleClass += ' story-circle-nearby'; // Yeşil halka
        } else if (story.priority_level === 3) {
            circleClass += ' story-circle-distant'; // Gri halka
        }
        // priority_level === 2 için standart Instagram gradient
    });
}
```

### Görsel Gösterim (Priority Level'a Göre)

- **Priority 1** (Aynı ilçe): `.story-circle-nearby` → **Yeşil/Mavi halka**
- **Priority 2** (Aynı şehir): `.story-circle` → **Standart Instagram gradient** (mor/pembe/turuncu)
- **Priority 3** (Uzak): `.story-circle-distant` → **Gri/Soluk halka**

### Kod Örneği

```javascript
// Satır 237-275: Hikayeleri DOM'a ekleme
stories.forEach(story => {
    const escapedUsername = (story.username || 'Kullanıcı').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    // Öncelik seviyesine göre CSS class belirle
    let circleClass = 'story-circle';
    if (story.priority_level === 1) {
        circleClass += ' story-circle-nearby'; // Aynı ilçe - Yeşil/Mavi
    } else if (story.priority_level === 3) {
        circleClass += ' story-circle-distant'; // Uzak şehir - Gri
    }
    // priority_level === 2 için standart Instagram gradient kullanılır
    
    const storyHTML = `
        <div class="story-item" onclick="viewStory(...)" data-priority="${story.priority_level || 3}">
            <div class="${circleClass}">
                <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                     alt="${escapedUsername}" 
                     class="story-avatar">
            </div>
            <span class="story-username">${escapedUsername}</span>
        </div>
    `;
    storiesWrapper.innerHTML += storyHTML;
});
```

---

## 🔍 Hypee Keşfet: `loadHypeeDiscoverStories()`

**Dosya:** `public/stories.js` (Satır 1664-1753)

### Çalışma Mantığı

Hypee Keşfet, Navbar hikayeleriyle **aynı RPC fonksiyonunu** kullanır, ancak:
1. **Sadece resimler** gösterilir (videolar filtrelenir)
2. **Grid layout** kullanılır (Instagram Explore gibi)
3. **Tüm hikayeler** gösterilir (limit yok)

### Kod Akışı

```javascript
async function loadHypeeDiscoverStories() {
    // 1. Kullanıcının konumunu öğren (Navbar ile aynı)
    const { data: { user } } = await supabase.auth.getUser();
    let myCity = "";
    let myDistrict = "";
    
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('city_name, district')
            .eq('user_id', user.id)
            .single();
        
        myCity = profile.city_name || "";
        myDistrict = profile.district || "";
    }
    
    // 2. RPC fonksiyonunu çağır (Navbar ile aynı)
    const { data: stories, error } = await supabase
        .rpc('get_nearby_stories', {
            my_city: myCity || null,
            my_district: myDistrict || null
        });
    
    // 3. SADECE RESİMLERİ FİLTRELE (Videoları hariç tut)
    const imageStories = stories.filter(story => {
        const mediaUrl = story.media_url.toLowerCase();
        return !mediaUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/);
    });
    
    // 4. Grid'e göster
    displayHypeeStories(imageStories);
}
```

### Video Filtreleme

```javascript
// Satır 1735-1739: Video uzantılarını kontrol et
const imageStories = stories.filter(story => {
    const mediaUrl = story.media_url.toLowerCase();
    // Video uzantılarını kontrol et
    return !mediaUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/);
});
```

**Filtrelenen Video Formatları:**
- `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`, `.flv`, `.wmv`, `.m4v`

---

## 🎨 Grid Gösterimi: `displayHypeeStories()`

**Dosya:** `public/stories.js` (Satır 1756-1805)

### Çalışma Mantığı

Bu fonksiyon, hikayeleri **Instagram Explore** gibi grid layout'ta gösterir.

```javascript
function displayHypeeStories(stories) {
    const grid = document.getElementById('hypee-stories-grid');
    grid.innerHTML = '';
    
    // Her hikayeyi grid item olarak ekle
    stories.forEach((story, index) => {
        const storyItem = document.createElement('div');
        storyItem.className = 'hypee-story-item';
        
        storyItem.innerHTML = `
            <img src="${story.media_url}" alt="${escapedUsername}" loading="lazy">
            <div class="hypee-story-overlay">
                <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                     class="hypee-story-avatar">
                <span class="hypee-story-username">${escapedUsername}</span>
            </div>
        `;
        
        // Tıklama olayı - Story viewer'a aç
        storyItem.addEventListener('click', () => {
            const viewerList = stories.map(s => ({
                id: s.id,
                mediaUrl: s.media_url,
                username: s.username,
                avatar: s.avatar_url,
                priorityLevel: s.priority_level || 3,
                time: s.created_at ? new Date(s.created_at).toLocaleTimeString(...) : 'Az önce'
            }));
            
            openHypeeStoryViewer(viewerList, index);
        });
        
        grid.appendChild(storyItem);
    });
}
```

### Önemli Özellikler

1. **DOM Scraping YOK:** Direkt `stories` array'i kullanılır (performans)
2. **Lazy Loading:** `loading="lazy"` ile görseller yavaş yüklenir
3. **State Management:** Tıklama anında `viewerList` oluşturulur ve global state'e set edilir

---

## 📊 Sıralama Algoritması Detayları

### Örnek Senaryo

**Kullanıcı:** "Bursa / Yıldırım"

**Hikayeler:**

| Kullanıcı | Şehir | İlçe | Priority | Sıralama |
|-----------|-------|------|----------|----------|
| Ali | Bursa | Yıldırım | **1** | 1️⃣ En üstte |
| Ayşe | Bursa | Yıldırım | **1** | 2️⃣ |
| Mehmet | Bursa | Nilüfer | **2** | 3️⃣ |
| Fatma | Bursa | Osmangazi | **2** | 4️⃣ |
| Can | İstanbul | Kadıköy | **3** | 5️⃣ |
| Zeynep | Ankara | Çankaya | **3** | 6️⃣ En altta |

### Sıralama Kriterleri

1. **Önce Priority Level:** 1 → 2 → 3 (ASC)
2. **Sonra Tarih:** En yeni → En eski (DESC)

**SQL ORDER BY:**
```sql
ORDER BY
  priority_level ASC,  -- Önce yakındakiler (1, 2, 3)
  s.created_at DESC;   -- Sonra en yeniler
```

---

## 🎭 Görsel Gösterim Mantığı

### Navbar Hikayeleri

**CSS Class'ları:**
- `.story-circle-nearby` → Priority 1 → **Yeşil/Mavi halka**
- `.story-circle` → Priority 2 → **Standart Instagram gradient** (varsayılan)
- `.story-circle-distant` → Priority 3 → **Gri/Soluk halka**

**Kod (Satır 246-251):**
```javascript
let circleClass = 'story-circle';
if (story.priority_level === 1) {
    circleClass += ' story-circle-nearby'; // Aynı ilçe - Yeşil/Mavi
} else if (story.priority_level === 3) {
    circleClass += ' story-circle-distant'; // Uzak şehir - Gri
}
// priority_level === 2 için standart Instagram gradient kullanılır
```

### Hypee Keşfet

**Grid Layout:**
- **Aspect Ratio:** `9 / 16` (Dikey format, Instagram Reels gibi)
- **Grid Columns:** 3 sütun (mobil), 4-5 sütun (desktop)
- **Overlay:** Profil avatarı + kullanıcı adı (alt kısımda)

**CSS:**
```css
.hypee-story-item {
    aspect-ratio: 9 / 16; /* Dikey format */
    position: relative;
    overflow: hidden;
    border-radius: 8px;
}

.hypee-story-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
    padding: 8px 6px 6px;
}
```

---

## 🔄 State Management

### Navbar Hikayeleri

**Global State:** Yok (direkt DOM'a eklenir)

**Viewer State:**
```javascript
let currentStoriesList = []; // Tüm hikayeler listesi
let currentStoryIndex = 0;   // Şu anki hikaye indeksi
```

### Hypee Keşfet

**Tıklama Anında State Güncelleme:**
```javascript
storyItem.addEventListener('click', () => {
    // 1. Grid'deki TÜM hikayeleri Viewer formatına çevir
    const viewerList = stories.map(s => ({
        id: s.id,
        mediaUrl: s.media_url,
        username: s.username,
        avatar: s.avatar_url,
        priorityLevel: s.priority_level || 3,
        time: new Date(s.created_at).toLocaleTimeString(...)
    }));
    
    // 2. Global state'i güncelle
    window.currentStoriesList = viewerList;
    window.currentStoryIndex = index;
    
    // 3. Story viewer'ı aç
    openHypeeStoryViewer(viewerList, index);
});
```

---

## ⚡ Performans Optimizasyonları

### 1. DOM Scraping YOK

**ÖNCE (Yavaş):**
```javascript
// ❌ Her tıklamada DOM'u tara
const allItems = document.querySelectorAll('.hypee-story-item');
const viewerList = Array.from(allItems).map(item => {
    const id = item.getAttribute('data-story-id');
    // ...
});
```

**SONRA (Hızlı):**
```javascript
// ✅ Direkt array kullan
const viewerList = stories.map(s => ({
    id: s.id,
    mediaUrl: s.media_url,
    // ...
}));
```

### 2. Lazy Loading

```javascript
<img src="${story.media_url}" alt="${escapedUsername}" loading="lazy">
```

### 3. Video Filtreleme (Sadece Hypee)

Hypee'de videolar gösterilmez, sadece resimler:
```javascript
const imageStories = stories.filter(story => {
    const mediaUrl = story.media_url.toLowerCase();
    return !mediaUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/);
});
```

---

## 📝 Özet Tablo

| Özellik | Navbar Hikayeleri | Hypee Keşfet |
|---------|-------------------|--------------|
| **RPC Fonksiyonu** | `get_nearby_stories` | `get_nearby_stories` |
| **Layout** | Yatay scroll | Grid (3-5 sütun) |
| **Video Desteği** | ✅ Var | ❌ Yok (sadece resim) |
| **Priority Gösterimi** | Halka rengi (Yeşil/Gri) | Overlay'de gösterilmez |
| **Limit** | Yok (tüm hikayeler) | Yok (tüm hikayeler) |
| **State Management** | Basit (DOM-based) | Global state (window.currentStoriesList) |
| **Lazy Loading** | ❌ Yok | ✅ Var |

---

## 🎯 Sonuç

1. **Her iki sistem de aynı RPC fonksiyonunu kullanır** → Tutarlı sıralama
2. **Priority Level bazlı sıralama** → Yakındakiler önce gelir
3. **Tarih bazlı ikincil sıralama** → En yeni hikayeler önce gelir
4. **Performans optimizasyonları** → DOM scraping yok, lazy loading var
5. **Video filtreleme (Hypee)** → Sadece resimler gösterilir

Bu sistem, Instagram Stories ve Explore mantığını lokasyon bazlı özelleştirilmiş hale getirir.
