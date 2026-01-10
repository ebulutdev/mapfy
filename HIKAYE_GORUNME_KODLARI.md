# Hikaye Görünme Kodları - Tüm Dosyalar

Bu dosya, arayüzde hikayelerin görünmesi için gerekli tüm kodları içerir.

---

## 1. HTML Yapısı (index.html)

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

<!-- Add Story Modal (Hikaye Ekleme) -->
<div id="add-story-modal" class="modal-overlay hidden">
    <div class="modal-content story-modal-content">
        <button class="back-btn" id="back-add-story" title="Geri">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>
        <button class="modal-close" id="close-story-modal">×</button>
        <h2 class="modal-title">Hikaye Ekle</h2>
        
        <div class="modal-body story-modal-body">
            <!-- Story Photo/Video Upload -->
            <div class="form-section">
                <label class="form-label">Görsel veya Video Seç</label>
                <div class="photo-upload-area" id="story-photo-upload-area">
                    <input type="file" id="story-photo-input" accept="image/*,video/*" class="hidden-input">
                    <div class="upload-preview" id="story-upload-preview">
                        <span class="upload-icon">📷</span>
                        <span class="upload-text">Görsel/Video Seç</span>
                    </div>
                    <canvas id="story-crop-canvas" class="hidden"></canvas>
                </div>
                <div class="crop-controls hidden" id="story-crop-controls">
                    <button type="button" class="crop-btn" id="story-crop-apply">Kırp</button>
                    <button type="button" class="crop-btn secondary" id="story-crop-cancel">İptal</button>
                </div>
                <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 8px;">
                    Maksimum 10MB • Resim veya video
                </p>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn-secondary" id="cancel-story-btn">İptal</button>
            <button class="btn-primary" id="share-story-btn" disabled>
                <span>Hikayeyi Paylaş</span>
            </button>
        </div>
    </div>
</div>
```

---

## 2. JavaScript Kodları (stories.js)

```javascript
// ========================================
// STORIES (Hikayeler) Fonksiyonları
// ========================================

// Supabase import
import { supabase } from './supabase-client.js';

let storiesContainer = null;
let storiesWrapper = null;
let myStoryItem = null;
let myStoryAvatar = null;
let storyInput = null;

// Stories DOM elementlerini al
function initStoriesElements() {
    storiesContainer = document.getElementById('stories-container');
    storiesWrapper = document.getElementById('stories-wrapper');
    myStoryItem = document.getElementById('my-story-item');
    myStoryAvatar = document.getElementById('my-story-avatar');
    storyInput = document.getElementById('storyInput');
}

// Kullanıcının profilinin olup olmadığını kontrol et
async function checkUserHasProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // Supabase'de kullanıcının profilini kontrol et
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name, image_url, city_name, district')
            .eq('user_id', user.id)
            .single();

        if (error || !data) return false;
        
        // Eğer profil varsa, kendi hikaye avatarını güncelle
        if (myStoryAvatar && data.image_url) {
            myStoryAvatar.src = data.image_url;
            myStoryAvatar.alt = data.name || 'Sen';
        }
        
        return true;
    } catch (error) {
        console.error('Profil kontrolü hatası:', error);
        return false;
    }
}

// Stories container'ı göster/gizle
async function toggleStoriesContainer() {
    if (!storiesContainer) initStoriesElements();
    if (!storiesContainer) return;

    // Kullanıcı giriş yapmış mı kontrol et
    const { data: { user } } = await supabase.auth.getUser();
    const hasProfile = await checkUserHasProfile();
    
    // Kullanıcı giriş yapmışsa "Hikayeniz" butonunu göster
    if (user && myStoryItem) {
        myStoryItem.style.display = 'flex';
        
        // Avatar'ı yükle
        if (hasProfile && myStoryAvatar) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('image_url, name')
                .eq('user_id', user.id)
                .single();
            
            if (profile && profile.image_url) {
                myStoryAvatar.src = profile.image_url;
            } else {
                myStoryAvatar.src = 'https://via.placeholder.com/64?text=Hikaye';
            }
        } else if (myStoryAvatar) {
            myStoryAvatar.src = 'https://via.placeholder.com/64?text=Hikaye';
        }
    } else if (myStoryItem) {
        myStoryItem.style.display = 'none';
    }

    // Kullanıcı giriş yapmışsa veya hikayeler varsa container'ı göster
    const hasStories = storiesWrapper && storiesWrapper.children.length > 0;
    if (user || hasStories) {
        storiesContainer.style.display = 'flex';
    } else {
        storiesContainer.style.display = 'none';
    }
    
    // Debug için console log
    console.log('Stories Container Durumu:', {
        user: !!user,
        hasProfile,
        hasStories,
        display: storiesContainer.style.display,
        myStoryItemDisplay: myStoryItem ? myStoryItem.style.display : 'N/A'
    });
}

// Hikayeleri Yükle ve Listele (Algoritmik Akış - Lokasyon Bazlı)
async function loadStories() {
    if (!storiesWrapper) initStoriesElements();
    if (!storiesWrapper) return;

    try {
        // 1. Önce giriş yapmış kullanıcının kendi konumunu öğrenelim
        const { data: { user } } = await supabase.auth.getUser();

        let myCity = "";
        let myDistrict = "";

        if (user) {
            // Kullanıcının profilinden şehir/ilçe bilgisini çek
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('city_name, district')
                .eq('user_id', user.id)
                .single();
            
            if (profile && !profileError) {
                myCity = profile.city_name || "";         // Örn: Bursa
                myDistrict = profile.district || "";      // Örn: Yıldırım
            }
        }

        // 2. Akıllı Fonksiyonu (RPC) Çağırıyoruz
        const { data: stories, error } = await supabase
            .rpc('get_nearby_stories', {
                my_city: myCity || null,
                my_district: myDistrict || null
            });

        if (error) {
            console.error('Hikaye yükleme hatası:', error);
            // Fallback: Eski yöntemle yükle (RPC çalışmazsa)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: fallbackStories, error: fallbackError } = await supabase
                .from('stories')
                .select('id, user_id, username, avatar_url, media_url, created_at')
                .gt('created_at', oneDayAgo)
                .order('created_at', { ascending: false });
            
            if (fallbackError || !fallbackStories) {
                storiesWrapper.innerHTML = '';
                toggleStoriesContainer();
                return;
            }
            
            // Fallback hikayeleri ekle
            fallbackStories.forEach(story => {
                const escapedUsername = (story.username || 'Kullanıcı').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const storyHTML = `
                    <div class="story-item" onclick="viewStory('${story.id}', '${story.media_url.replace(/'/g, "\\'")}', '${escapedUsername}')">
                        <div class="story-circle">
                            <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                                 alt="${escapedUsername}" 
                                 class="story-avatar"
                                 onerror="this.src='https://via.placeholder.com/64'">
                        </div>
                        <span class="story-username">${escapedUsername}</span>
                    </div>
                `;
                storiesWrapper.innerHTML += storyHTML;
            });
            
            toggleStoriesContainer();
            return;
        }

        // Container'ı temizle
        storiesWrapper.innerHTML = '';

        if (!stories || stories.length === 0) {
            toggleStoriesContainer();
            return;
        }

        // 3. Her bir hikayeyi ekle (Öncelik sırasına göre zaten sıralanmış)
        stories.forEach(story => {
            // XSS koruması için escape yap
            const escapedUsername = (story.username || 'Kullanıcı').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            // Öncelik seviyesine göre farklı stil
            // priority_level 1 ise (Komşu/İlçe) -> Yeşil Halka
            // priority_level 2 ise (Aynı Şehir) -> Standart Instagram Halka
            // priority_level 3 ise (Uzak) -> Gri Halka
            let circleClass = 'story-circle';
            if (story.priority_level === 1) {
                circleClass += ' story-circle-nearby'; // Aynı ilçe - Yeşil/Mavi
            } else if (story.priority_level === 3) {
                circleClass += ' story-circle-distant'; // Uzak şehir - Gri
            }
            // priority_level === 2 için standart Instagram gradient kullanılır
            
            const storyHTML = `
                <div class="story-item" onclick="viewStory('${story.id}', '${story.media_url.replace(/'/g, "\\'")}', '${escapedUsername}', ${story.priority_level || 3})" data-priority="${story.priority_level || 3}">
                    <div class="${circleClass}">
                        <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                             alt="${escapedUsername}" 
                             class="story-avatar"
                             onerror="this.src='https://via.placeholder.com/64'">
                    </div>
                    <span class="story-username">${escapedUsername}</span>
                </div>
            `;
            storiesWrapper.innerHTML += storyHTML;
        });

        // Container'ı göster/gizle
        toggleStoriesContainer();
    } catch (error) {
        console.error('Stories yükleme hatası:', error);
    }
}

// Hikaye Görüntüle (Modal veya tam ekran)
async function viewStory(storyId, mediaUrl, username) {
    // Basit bir yeni sekmede aç (ileride modal ile geliştirilebilir)
    window.open(mediaUrl, '_blank');
    
    // İsteğe bağlı: Story görüntüleme istatistiği kaydet
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Story görüntüleme kaydı yapılabilir (gelecek için)
            console.log('Story görüntülendi:', storyId);
        }
    } catch (error) {
        console.error('Story görüntüleme kaydı hatası:', error);
    }
}

// Hikaye Yükleme Fonksiyonu (Global) - Yeni Modal Açacak
window.uploadStory = async function() {
    // Kullanıcının profili var mı kontrol et
    const hasProfile = await checkUserHasProfile();
    if (!hasProfile) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Hikaye Paylaşmak İçin Profil Oluşturmalısınız', 'Lütfen önce haritaya profil ekleyin.', 'info');
        } else {
            alert('Hikaye paylaşmak için önce profil oluşturmalısınız.');
        }
        return;
    }

    // Hikaye ekleme modalını aç
    openAddStoryModal();
};

// Global viewStory fonksiyonu
window.viewStory = viewStory;

// DOMContentLoaded Event Listener
document.addEventListener('DOMContentLoaded', async () => {
    // Supabase hazır olana kadar bekle
    if (typeof waitForSupabase === 'function') {
        await waitForSupabase();
    } else {
        // Alternatif: Supabase'in hazır olmasını bekle
        let retries = 0;
        while (retries < 50 && (!window.supabase || !supabase)) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
    }
    
    // Stories fonksiyonlarını initialize et
    initStoriesElements();
    initStoryModal();
    
    // Sayfa yüklendiğinde hikayeleri yükle
    setTimeout(async () => {
        await toggleStoriesContainer(); // Önce container'ı göster
        await loadStories(); // Sonra hikayeleri yükle
    }, 1000);

    // Auth state değiştiğinde stories'i güncelle
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            setTimeout(async () => {
                await toggleStoriesContainer();
                await loadStories();
            }, 500);
        }
    });
});
```

---

## 3. CSS Stilleri (style.css)

```css
/* ========================================
   STORIES CONTAINER (Hikayeler Alanı)
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
    scrollbar-width: none; /* Firefox: Scrollbar'ı gizle */
    -ms-overflow-style: none; /* IE ve Edge: Scrollbar'ı gizle */
    position: sticky;
    top: calc(52px + env(safe-area-inset-top, 0px)); /* Navbar'ın hemen altında */
    z-index: 999;
}

/* Chrome, Safari, Opera: Scrollbar'ı gizle */
.stories-container::-webkit-scrollbar {
    display: none;
}

.stories-wrapper {
    display: flex;
    gap: 15px;
}

/* Her Bir Hikaye Kutusu */
.story-item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    width: 70px;
    flex-shrink: 0;
    transition: transform 0.2s ease;
}

.story-item:hover {
    transform: scale(1.05);
}

.story-item:active {
    transform: scale(0.95);
}

/* Yuvarlak Çerçeve (Instagram Havası - Standart) */
.story-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Priority 1: Yakındaki Hikayeler (Aynı İlçe) - Yeşil/Mavi Halka */
.story-circle.story-circle-nearby {
    background: linear-gradient(45deg, #00ff88, #00d4ff, #0095f6, #3ecf8e);
    box-shadow: 0 0 12px rgba(62, 207, 142, 0.5);
}

.story-item:hover .story-circle-nearby {
    box-shadow: 0 0 16px rgba(62, 207, 142, 0.7);
    transform: scale(1.05);
}

/* Priority 3: Uzak Hikayeler - Gri/Soluk Halka */
.story-circle.story-circle-distant {
    background: linear-gradient(45deg, #666, #888, #aaa, #888);
    opacity: 0.7;
}

.story-item:hover .story-circle-distant {
    opacity: 0.9;
}

/* Kendi Hikayen İçin Gri Çerçeve */
.story-circle.add-story {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.3);
    padding: 0;
}

.story-circle.add-story:hover {
    border-color: rgba(255, 255, 255, 0.5);
}

/* Profil Resmi */
.story-avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid #0a0a0a;
    object-fit: cover;
    background: rgba(255, 255, 255, 0.1);
}

.story-circle.add-story .story-avatar {
    border: none;
}

/* Artı (+) İkonu */
.plus-icon {
    position: absolute;
    bottom: 0;
    right: 0;
    background: #0095f6;
    color: white;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    border: 2px solid #0a0a0a;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease;
}

.story-item:hover .plus-icon {
    transform: scale(1.1);
}

/* Kullanıcı Adı */
.story-username {
    color: #fff;
    font-size: 11px;
    margin-top: 6px;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    font-weight: 400;
    opacity: 0.9;
}

/* Map view'da stories container'ı */
.app-container.map-view .stories-container {
    top: calc(40px + env(safe-area-inset-top, 0px)); /* Harita sayfasında navbar daha küçük */
}

/* Responsive: Mobil (768px) */
@media (max-width: 768px) {
    .stories-container {
        padding: 10px 12px;
        gap: 12px;
        top: calc(40px + env(safe-area-inset-top, 0px));
    }
    
    .app-container.map-view .stories-container {
        top: calc(32px + env(safe-area-inset-top, 0px));
    }

    .stories-wrapper {
        gap: 12px;
    }

    .story-item {
        width: 65px;
    }

    .story-circle {
        width: 60px;
        height: 60px;
    }

    .plus-icon {
        width: 18px;
        height: 18px;
        font-size: 12px;
    }

    .story-username {
        font-size: 10px;
        max-width: 65px;
    }
}

/* Responsive: Çok Küçük Ekranlar (480px) */
@media (max-width: 480px) {
    .stories-container {
        padding: 8px 10px;
        gap: 10px;
        top: calc(36px + env(safe-area-inset-top, 0px));
    }
    
    .app-container.map-view .stories-container {
        top: calc(30px + env(safe-area-inset-top, 0px));
    }

    .stories-wrapper {
        gap: 10px;
    }

    .story-item {
        width: 60px;
    }

    .story-circle {
        width: 56px;
        height: 56px;
    }

    .plus-icon {
        width: 16px;
        height: 16px;
        font-size: 11px;
    }

    .story-username {
        font-size: 9px;
        max-width: 60px;
    }
}
```

---

## 4. Özet

### Ana Fonksiyonlar:
1. **`initStoriesElements()`** - DOM elementlerini cache'ler
2. **`checkUserHasProfile()`** - Kullanıcının profilini kontrol eder
3. **`toggleStoriesContainer()`** - Container'ı gösterir/gizler
4. **`loadStories()`** - Hikayeleri yükler ve gösterir (algoritmik sıralama)
5. **`viewStory()`** - Hikayeyi yeni sekmede açar
6. **`uploadStory()`** - Hikaye ekleme modalını açar

### Özellikler:
- ✅ Navbar'ın altında sticky konumlandırma
- ✅ Lokasyon bazlı algoritmik sıralama (aynı ilçe → aynı şehir → diğerleri)
- ✅ Priority level'a göre renk kodlu halkalar (yeşil/mavi = yakın, gri = uzak)
- ✅ Responsive tasarım (desktop, tablet, mobil)
- ✅ "Hikayeniz" butonu (giriş yapmış kullanıcılar için)
- ✅ Otomatik yükleme (sayfa yüklendiğinde ve auth state değiştiğinde)

### CSS Özellikleri:
- ✅ Position sticky ile navbar altında sabit kalma
- ✅ Safe area insets desteği (notch/çentik için)
- ✅ Map-view için farklı top değerleri
- ✅ Responsive breakpoints (768px, 480px)
- ✅ Scrollbar gizleme
- ✅ Hover efektleri
