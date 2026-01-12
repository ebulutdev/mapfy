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

// Story Viewer State
let currentStoriesList = []; // Tüm hikayeler listesi
let currentStoryIndex = 0; // Şu anki hikaye indeksi
let storyViewerTimer = null; // Otomatik geçiş timer'ı
let storyViewerProgressInterval = null; // Progress bar animasyonu
let isPaused = false; // Basılı tutulduğunda durdurma için
let pausedElapsed = 0; // Duraklama süresi

// Navbar Stories Auto-scroll State
let navbarStoriesAutoScrollInterval = null; // Navbar stories otomatik scroll timer'ı
let navbarStoriesAutoScrollIndex = 0; // Navbar stories otomatik scroll indeksi

// Stories DOM elementlerini al
function initStoriesElements() {
    storiesContainer = document.getElementById('stories-container');
    storiesWrapper = document.getElementById('stories-wrapper');
    myStoryItem = document.getElementById('my-story-item');
    myStoryAvatar = document.getElementById('my-story-avatar');
    storyInput = document.getElementById('storyInput');
    
    // Mouse wheel desteği - Masaüstü için yatay kaydırma
    initStoriesWheelSupport();
    
    // Navbar stories klavye desteği (ok tuşları)
    initNavbarStoriesKeyboard();
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

// Mouse Wheel Desteği - Masaüstü için yatay kaydırma
function initStoriesWheelSupport() {
    const navbarStories = document.querySelector('.navbar-stories');
    
    if (navbarStories) {
        navbarStories.addEventListener('wheel', (evt) => {
            // Sadece hikaye alanının üzerindeyken çalışır
            evt.preventDefault(); 
            // Dikey hareketi (deltaY) yatay kaydırmaya (scrollLeft) çevirir
            navbarStories.scrollLeft += evt.deltaY;
        }, { passive: false });
        
        console.log('✅ Stories mouse wheel desteği aktif');
    }
}

// Navbar Stories Klavye Desteği (Ok Tuşları)
function initNavbarStoriesKeyboard() {
    // Önce mevcut listener'ı kaldır (çift ekleme önleme)
    if (window.navbarStoriesKeydownHandler) {
        document.removeEventListener('keydown', window.navbarStoriesKeydownHandler, true);
    }
    
    window.navbarStoriesKeydownHandler = (e) => {
        const navbarStories = document.querySelector('.navbar-stories');
        const storyViewerModal = document.getElementById('story-viewer-modal');
        
        // Story viewer modal açıksa navbar stories ok tuşlarını devre dışı bırak
        const isModalOpen = storyViewerModal && !storyViewerModal.classList.contains('hidden');
        
        if (isModalOpen) {
            // Story viewer açık, navbar stories ok tuşlarını çalıştırma
            return;
        }
        
        // Sadece story viewer modal açık DEĞİLSE ve navbar stories görünürse çalış
        if (navbarStories && storiesContainer && storiesContainer.style.display !== 'none') {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                scrollNavbarStories('left');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                scrollNavbarStories('right');
            }
        }
    };
    
    document.addEventListener('keydown', window.navbarStoriesKeydownHandler, true);
}

// Navbar Stories Scroll Fonksiyonu (Hikaye Bazlı - Daha İyi)
function scrollNavbarStories(direction) {
    const navbarStories = document.querySelector('.navbar-stories');
    if (!navbarStories) return;
    
    const storyItems = Array.from(navbarStories.querySelectorAll('.story-item'));
    if (storyItems.length === 0) return;
    
    // Mevcut görünür hikayeyi bul
    const containerRect = navbarStories.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let currentIndex = -1;
    storyItems.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.left + itemRect.width / 2;
        // Eğer hikaye container'ın merkezine yakınsa, bu mevcut hikaye
        if (Math.abs(itemCenter - containerCenter) < itemRect.width / 2) {
            currentIndex = index;
        }
    });
    
    // Eğer mevcut hikaye bulunamazsa, ilk görünür hikayeyi bul
    if (currentIndex === -1) {
        storyItems.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            if (itemRect.left >= containerRect.left && itemRect.left <= containerRect.right) {
                if (currentIndex === -1) currentIndex = index;
            }
        });
    }
    
    // Yönüne göre bir sonraki/önceki hikayeyi bul
    let targetIndex;
    if (direction === 'left') {
        targetIndex = currentIndex > 0 ? currentIndex - 1 : storyItems.length - 1;
    } else {
        targetIndex = currentIndex < storyItems.length - 1 ? currentIndex + 1 : 0;
    }
    
    // Hedef hikayeyi görünür alana getir
    const targetItem = storyItems[targetIndex];
    if (targetItem) {
        targetItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }
}

// Navbar Stories Otomatik Scroll Başlat (Hikaye Bazlı - Daha İyi)
function startNavbarStoriesAutoScroll() {
    stopNavbarStoriesAutoScroll(); // Önceki timer'ı temizle
    
    const navbarStories = document.querySelector('.navbar-stories');
    if (!navbarStories || !storiesContainer || storiesContainer.style.display === 'none') {
        return;
    }
    
    const storyItems = Array.from(navbarStories.querySelectorAll('.story-item'));
    if (storyItems.length === 0) return;
    
    // Mevcut görünür hikayeyi bul
    const findCurrentStoryIndex = () => {
        const containerRect = navbarStories.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        
        for (let i = 0; i < storyItems.length; i++) {
            const itemRect = storyItems[i].getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            if (Math.abs(itemCenter - containerCenter) < itemRect.width / 2) {
                return i;
            }
        }
        return 0; // Bulunamazsa ilk hikayeyi döndür
    };
    
    navbarStoriesAutoScrollIndex = findCurrentStoryIndex();
    const scrollDuration = 5000; // 5 saniyede bir scroll
    
    navbarStoriesAutoScrollInterval = setInterval(() => {
        // Story viewer modal açıksa otomatik scroll yapma
        const storyViewerModal = document.getElementById('story-viewer-modal');
        if (storyViewerModal && !storyViewerModal.classList.contains('hidden')) {
            return;
        }
        
        // Navbar stories görünür değilse durdur
        if (!storiesContainer || storiesContainer.style.display === 'none') {
            stopNavbarStoriesAutoScroll();
            return;
        }
        
        const currentStoryItems = Array.from(navbarStories.querySelectorAll('.story-item'));
        if (currentStoryItems.length === 0) {
            stopNavbarStoriesAutoScroll();
            return;
        }
        
        // Mevcut görünür hikayeyi güncelle
        navbarStoriesAutoScrollIndex = findCurrentStoryIndex();
        
        // Scroll index'i artır
        navbarStoriesAutoScrollIndex++;
        
        // Eğer son hikayeye ulaştıysak başa dön
        if (navbarStoriesAutoScrollIndex >= currentStoryItems.length) {
            navbarStoriesAutoScrollIndex = 0;
        }
        
        // Hedef hikayeyi görünür alana getir
        const targetItem = currentStoryItems[navbarStoriesAutoScrollIndex];
        if (targetItem) {
            targetItem.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, scrollDuration);
}

// Navbar Stories Otomatik Scroll Durdur
function stopNavbarStoriesAutoScroll() {
    if (navbarStoriesAutoScrollInterval) {
        clearInterval(navbarStoriesAutoScrollInterval);
        navbarStoriesAutoScrollInterval = null;
    }
    navbarStoriesAutoScrollIndex = 0;
}

// Skeleton Loading Göster
function showStoriesSkeleton() {
    if (!storiesWrapper) return;
    
    // Skeleton loading HTML'i
    const skeletonHTML = `
        <div class="story-item skeleton-item">
            <div class="story-circle skeleton-circle"></div>
        </div>
        <div class="story-item skeleton-item">
            <div class="story-circle skeleton-circle"></div>
        </div>
        <div class="story-item skeleton-item">
            <div class="story-circle skeleton-circle"></div>
        </div>
        <div class="story-item skeleton-item">
            <div class="story-circle skeleton-circle"></div>
        </div>
        <div class="story-item skeleton-item">
            <div class="story-circle skeleton-circle"></div>
        </div>
    `;
    
    storiesWrapper.innerHTML = skeletonHTML;
}

// Stories container'ı göster/gizle
async function toggleStoriesContainer() {
    if (!storiesContainer) initStoriesElements();
    if (!storiesContainer) return;

    // Hero section'da mıyız kontrol et
    const appContainer = document.querySelector('.app-container');
    const heroSection = document.getElementById('hero-section');
    const isHeroView = heroSection && !heroSection.classList.contains('hidden');
    const isMapView = appContainer && appContainer.classList.contains('map-view');

    // Kullanıcı giriş yapmış mı kontrol et
    const { data: { user } } = await supabase.auth.getUser();
    const hasProfile = await checkUserHasProfile();
    
    // Hero section'da hikayeleri gizle
    if (isHeroView) {
        storiesContainer.style.display = 'none';
        stopNavbarStoriesAutoScroll();
        return;
    }
    
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

    // Map view'da ve kullanıcı giriş yapmışsa veya hikayeler varsa container'ı göster
    const hasStories = storiesWrapper && storiesWrapper.children.length > 0;
    if (isMapView && (user || hasStories)) {
        storiesContainer.style.display = 'flex';
        // Navbar stories otomatik scroll'u başlat (hata olursa devam et)
        try {
            startNavbarStoriesAutoScroll();
        } catch (error) {
            console.error('Navbar stories auto-scroll başlatma hatası:', error);
        }
    } else {
        storiesContainer.style.display = 'none';
        // Navbar stories otomatik scroll'u durdur (hata olursa devam et)
        try {
            stopNavbarStoriesAutoScroll();
        } catch (error) {
            console.error('Navbar stories auto-scroll durdurma hatası:', error);
        }
    }
    
    // Debug için console log
    console.log('Stories Container Durumu:', {
        user: !!user,
        hasProfile,
        hasStories,
        isHeroView,
        isMapView,
        display: storiesContainer.style.display,
        myStoryItemDisplay: myStoryItem ? myStoryItem.style.display : 'N/A'
    });
}

// İzlendi Durumunu Yönet (localStorage)
function markAsViewed(storyId) {
    try {
        const viewed = JSON.parse(localStorage.getItem('viewedStories') || '[]');
        if (!viewed.includes(storyId)) {
            viewed.push(storyId);
            // Maksimum 1000 hikaye ID'si tut (performans için)
            if (viewed.length > 1000) {
                viewed.shift(); // En eski ID'yi sil
            }
            localStorage.setItem('viewedStories', JSON.stringify(viewed));
            
            // Görsel olarak da halkayı griye çevir (eğer DOM'da varsa)
            const storyItem = storiesWrapper?.querySelector(`[onclick*="${storyId}"]`);
            if (storyItem) {
                const circle = storyItem.querySelector('.story-circle');
                if (circle) {
                    // Tüm priority class'larını kaldır, sadece viewed ekle
                    circle.classList.remove('story-circle-nearby', 'story-circle-distant');
                    circle.classList.add('story-circle-viewed');
                }
            }
        }
    } catch (error) {
        console.error('İzlendi durumu kaydetme hatası:', error);
    }
}

// İzlendi durumunu kontrol et
function isViewed(storyId) {
    try {
        const viewed = JSON.parse(localStorage.getItem('viewedStories') || '[]');
        return viewed.includes(storyId);
    } catch (error) {
        return false;
    }
}

// Hikayeleri Yükle ve Listele (Algoritmik Akış - Lokasyon Bazlı)
async function loadStories() {
    if (!storiesWrapper) initStoriesElements();
    if (!storiesWrapper) return;

    // Yükleniyor animasyonunu göster
    showStoriesSkeleton();

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

        // 2. 24 saatten eski hikayeleri filtrele (otomatik silme)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // 3. Akıllı Fonksiyonu (RPC) Çağırıyoruz
        // "Benim konumum Bursa/Yıldırım, buna göre sırala getir" diyoruz.
        const { data: stories, error } = await supabase
            .rpc('get_nearby_stories', {
                my_city: myCity || null,
                my_district: myDistrict || null
            });
        
        // user_id bilgisini stories'e ekle (eğer yoksa)
        if (stories && stories.length > 0) {
            const storyIds = stories.map(s => s.id).filter(Boolean);
            if (storyIds.length > 0) {
                const { data: storiesWithUserId } = await supabase
                    .from('stories')
                    .select('id, user_id')
                    .in('id', storyIds);
                
                if (storiesWithUserId) {
                    const userIdMap = {};
                    storiesWithUserId.forEach(s => {
                        userIdMap[s.id] = s.user_id;
                    });
                    
                    stories.forEach(story => {
                        if (!story.user_id && userIdMap[story.id]) {
                            story.user_id = userIdMap[story.id];
                        }
                    });
                }
            }
        }
        
        // 4. 24 saatten eski hikayeleri filtrele ve sil
        if (stories && stories.length > 0) {
            const validStories = [];
            const expiredStoryIds = [];
            
            for (const story of stories) {
                const storyDate = new Date(story.created_at);
                if (storyDate >= new Date(oneDayAgo)) {
                    validStories.push(story);
                } else {
                    expiredStoryIds.push(story.id);
                }
            }
            
            // Eski hikayeleri sil (arka planda, hata olsa bile devam et)
            if (expiredStoryIds.length > 0) {
                supabase
                    .from('stories')
                    .delete()
                    .in('id', expiredStoryIds)
                    .then(() => {
                        console.log(`✅ ${expiredStoryIds.length} eski hikaye silindi`);
                    })
                    .catch(err => {
                        console.warn('⚠️ Eski hikaye silme hatası:', err);
                    });
            }
            
            // Sadece geçerli hikayeleri kullan
            stories.length = 0;
            stories.push(...validStories);
        }

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
            // user_id'yi al (profil detayları için)
            const storyUserId = story.user_id || null;
            const storyUserAttr = storyUserId ? `data-user-id="${storyUserId}"` : '';
            
            const storyHTML = `
                <div class="story-item" onclick="viewStory('${story.id}', '${story.media_url.replace(/'/g, "\\'")}', '${escapedUsername}')" ${storyUserAttr}>
                    <div class="story-circle" onclick="event.stopPropagation(); handleStoryProfileClick('${story.id}', '${storyUserId || ''}')">
                        <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                             alt="${escapedUsername}" 
                             class="story-avatar"
                             onerror="this.src='https://via.placeholder.com/64'">
                    </div>
                    <span class="story-username" onclick="event.stopPropagation(); handleStoryProfileClick('${story.id}', '${storyUserId || ''}')">${escapedUsername}</span>
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

        // 3. İzlenen hikayeleri localStorage'dan al
        const viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '[]');
        
        // 4. Her bir hikayeyi ekle (Öncelik sırasına göre zaten sıralanmış)
        stories.forEach(story => {
            // XSS koruması için escape yap
            const escapedUsername = (story.username || 'Kullanıcı').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            // Öncelik seviyesine göre farklı stil
            // priority_level 1 ise (Komşu/İlçe) -> Yeşil Halka
            // priority_level 2 ise (Aynı Şehir) -> Standart Instagram Halka
            // priority_level 3 ise (Uzak) -> Gri Halka
            // Eğer izlendiyse -> Gri Halka (priority ne olursa olsun)
            let circleClass = 'story-circle';
            
            // ÖNCE: İzlendi durumunu kontrol et (en yüksek öncelik)
            if (viewedStories.includes(story.id)) {
                circleClass += ' story-circle-viewed'; // İzlendi - Gri stil
            } else if (story.priority_level === 1) {
                circleClass += ' story-circle-nearby'; // Aynı ilçe - Yeşil/Mavi
            } else if (story.priority_level === 3) {
                circleClass += ' story-circle-distant'; // Uzak şehir - Gri
            }
            // priority_level === 2 için standart Instagram gradient kullanılır
            
            // user_id'yi al (profil detayları için)
            const storyUserId = story.user_id || null;
            const storyUserAttr = storyUserId ? `data-user-id="${storyUserId}"` : '';
            
            const storyHTML = `
                <div class="story-item" onclick="viewStory('${story.id}', '${story.media_url.replace(/'/g, "\\'")}', '${escapedUsername}', ${story.priority_level || 3})" data-priority="${story.priority_level || 3}" ${storyUserAttr}>
                    <div class="${circleClass}" onclick="event.stopPropagation(); handleStoryProfileClick('${story.id}', '${storyUserId || ''}')">
                        <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                             alt="${escapedUsername}" 
                             class="story-avatar"
                             onerror="this.src='https://via.placeholder.com/64'">
                    </div>
                    <span class="story-username" onclick="event.stopPropagation(); handleStoryProfileClick('${story.id}', '${storyUserId || ''}')">${escapedUsername}</span>
                </div>
            `;
            storiesWrapper.innerHTML += storyHTML;
        });

        // Container'ı göster/gizle
        toggleStoriesContainer();
        
        // Navbar stories otomatik scroll'u başlat (hata olursa devam et)
        try {
            startNavbarStoriesAutoScroll();
        } catch (error) {
            console.error('Navbar stories auto-scroll başlatma hatası:', error);
        }
    } catch (error) {
        console.error('Stories yükleme hatası:', error);
    }
}

// Hikaye Görüntüle (Tam Ekran Modal)
async function viewStory(storyId, mediaUrl, username, priorityLevel = 3) {
    // Tüm hikayeleri bul (storiesWrapper'dan)
    const allStoryItems = Array.from(storiesWrapper.querySelectorAll('.story-item'));
    currentStoriesList = [];
    
    // Önce tüm hikayelerin created_at ve user_id bilgilerini toplu olarak al
    const storyIds = [];
    allStoryItems.forEach((item) => {
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr) {
            const match = onclickAttr.match(/viewStory\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"](?:,\s*(\d+))?\)/);
            if (match) {
                storyIds.push(match[1]);
            }
        }
    });
    
    // Veritabanından tüm hikayelerin created_at ve user_id bilgilerini al
    let storiesWithData = {};
    if (storyIds.length > 0) {
        try {
            const { data: storiesData } = await supabase
                .from('stories')
                .select('id, created_at, user_id')
                .in('id', storyIds);
            
            if (storiesData) {
                storiesData.forEach(s => {
                    storiesWithData[s.id] = {
                        created_at: s.created_at,
                        user_id: s.user_id
                    };
                });
            }
        } catch (error) {
            console.warn('Hikaye bilgileri alınamadı:', error);
        }
    }
    
    allStoryItems.forEach((item, index) => {
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr) {
            // onclick="viewStory('id', 'url', 'username', priority)" formatından parse et
            const match = onclickAttr.match(/viewStory\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"](?:,\s*(\d+))?\)/);
            if (match) {
                const storyData = storiesWithData[match[1]] || {};
                currentStoriesList.push({
                    id: match[1],
                    mediaUrl: match[2],
                    username: match[3],
                    priorityLevel: match[4] ? parseInt(match[4]) : 3,
                    created_at: storyData.created_at || null, // created_at bilgisini ekle
                    user_id: storyData.user_id || null, // user_id bilgisini ekle (çöp kutusu için)
                    index: index
                });
            }
        }
    });
    
    // Şu anki hikayenin indeksini bul
    currentStoryIndex = currentStoriesList.findIndex(s => s.id === storyId);
    if (currentStoryIndex === -1) currentStoryIndex = 0;
    
    // Story viewer'ı aç
    openStoryViewer(currentStoriesList[currentStoryIndex]);
}

// Zaman Farkını Hesapla (Türkçe Format)
function getTimeAgo(createdAt) {
    if (!createdAt) return 'Az önce';
    
    const now = new Date();
    const storyDate = new Date(createdAt);
    const diffMs = now - storyDate;
    
    // Saniye cinsinden fark
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
        return `${diffSeconds}s önce`;
    }
    
    // Dakika cinsinden fark
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffMinutes < 60) {
        return `${diffMinutes}d önce`;
    }
    
    // Saat cinsinden fark
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffHours < 24) {
        return `${diffHours}sa önce`;
    }
    
    // Gün cinsinden fark
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays < 7) {
        return `${diffDays}g önce`;
    }
    
    // Hafta cinsinden fark
    const diffWeeks = Math.floor(diffDays / 7);
    
    if (diffWeeks < 4) {
        return `${diffWeeks}w önce`;
    }
    
    // Ay cinsinden fark (yaklaşık)
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffMonths < 12) {
        return `${diffMonths}ay önce`;
    }
    
    // Yıl cinsinden fark
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y önce`;
}

// Story Viewer'ı Aç
async function openStoryViewer(story) {
    const storyViewerModal = document.getElementById('story-viewer-modal');
    const storyViewerImage = document.getElementById('story-viewer-image');
    const storyViewerVideo = document.getElementById('story-viewer-video');
    const storyViewerAvatar = document.getElementById('story-viewer-avatar-img');
    const storyViewerUsername = document.getElementById('story-viewer-username');
    const storyViewerTime = document.getElementById('story-viewer-time');
    const progressContainer = document.getElementById('story-progress-container');
    const storyDeleteBtn = document.getElementById('story-viewer-delete-btn');
    const compatibilityBadge = document.getElementById('story-compatibility-badge');
    const compatibilityText = document.getElementById('story-compatibility-text');
    
    if (!storyViewerModal) return;
    
    // Hikayeyi izlendi olarak işaretle
    if (story.id) {
        markAsViewed(story.id);
    }
    
    // Timer'ı durdur (eğer varsa)
    stopStoryTimer();
    
    // Modal'ı göster
    storyViewerModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Progress bar'ları oluştur
    updateProgressBars();
    
    // Story bilgilerini yükle (Sadece fotoğraf)
    storyViewerVideo.style.display = 'none';
    storyViewerImage.style.display = 'block';
    storyViewerImage.src = story.mediaUrl;
    
    // Avatar ve kullanıcı bilgisi (storiesWrapper'dan al)
    const storyItem = storiesWrapper.querySelector(`[onclick*="${story.id}"]`);
    if (storyItem) {
        const avatarImg = storyItem.querySelector('.story-avatar');
        if (avatarImg && avatarImg.src) {
            storyViewerAvatar.src = avatarImg.src;
        }
    }
    
    storyViewerUsername.textContent = story.username || 'Kullanıcı';
    
    // Avatar ve username'e tıklama event'i ekle (profil detayları için)
    if (storyViewerAvatar && storyViewerUsername) {
        // Önceki event listener'ları temizle
        const newAvatar = storyViewerAvatar.cloneNode(true);
        storyViewerAvatar.parentNode.replaceChild(newAvatar, storyViewerAvatar);
        const newUsername = storyViewerUsername.cloneNode(true);
        storyViewerUsername.parentNode.replaceChild(newUsername, storyViewerUsername);
        
        // Yeni referansları al
        const avatarEl = document.getElementById('story-viewer-avatar-img');
        const usernameEl = document.getElementById('story-viewer-username');
        
        // Profil detaylarını açma fonksiyonu
        const openProfileFromStory = async () => {
            let storyUserId = story.user_id;
            
            // user_id yoksa veritabanından al
            if (!storyUserId && story.id) {
                try {
                    const { data: storyData } = await supabase
                        .from('stories')
                        .select('user_id')
                        .eq('id', story.id)
                        .single();
                    if (storyData && storyData.user_id) {
                        storyUserId = storyData.user_id;
                    }
                } catch (error) {
                    console.error('Story user_id alınamadı:', error);
                }
            }
            
            if (storyUserId) {
                // user_id'den profile_id'yi bul
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('user_id', storyUserId)
                        .single();
                    
                    if (profile && profile.id) {
                        // Profil detaylarını aç
                        if (typeof handleProfileClick === 'function') {
                            handleProfileClick(profile.id);
                            // Story viewer'ı kapat
                            closeStoryViewer();
                        }
                    } else {
                        showAlert('Profil bulunamadı.', 'Bilgi', 'info');
                    }
                } catch (error) {
                    console.error('Profil bulunamadı:', error);
                    showAlert('Profil bulunamadı.', 'Bilgi', 'info');
                }
            } else {
                showAlert('Kullanıcı bilgisi bulunamadı.', 'Bilgi', 'info');
            }
        };
        
        // Avatar ve username'e tıklama event'i ekle
        if (avatarEl) {
            avatarEl.style.cursor = 'pointer';
            avatarEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openProfileFromStory();
            });
        }
        
        if (usernameEl) {
            usernameEl.style.cursor = 'pointer';
            usernameEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openProfileFromStory();
            });
        }
    }
    
    // Hikaye zamanını göster (hızlı - önce mevcut bilgiyi göster)
    if (story.created_at) {
        storyViewerTime.textContent = getTimeAgo(story.created_at);
    } else {
        storyViewerTime.textContent = 'Az önce';
        // Arka planda yükle (non-blocking)
        if (story.id) {
            supabase
                .from('stories')
                .select('created_at')
                .eq('id', story.id)
                .single()
                .then(({ data: storyData }) => {
                    if (storyData && storyData.created_at) {
                        storyViewerTime.textContent = getTimeAgo(storyData.created_at);
                    }
                })
                .catch(() => {}); // Sessizce hata yoksay
        }
    }
    
    // Otomatik geçiş timer'ını hemen başlat (async işlemlerden önce)
    startStoryTimer();
    
    // Async işlemleri paralel olarak arka planda yap (non-blocking)
    Promise.all([
        // Uyumluluk Badge'ini Güncelle (lazy load)
        (async () => {
            if (compatibilityBadge && compatibilityText) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    let storyUserId = story.user_id;
                    
                    if (!storyUserId && story.id) {
                        const { data: storyData } = await supabase
                            .from('stories')
                            .select('user_id')
                            .eq('id', story.id)
                            .single();
                        if (storyData) {
                            storyUserId = storyData.user_id;
                            story.user_id = storyUserId;
                        }
                    }
                    
                    if (user && storyUserId && user.id === storyUserId) {
                        compatibilityBadge.style.display = 'none';
                        return;
                    }
                    
                    const priorityLevel = story.priorityLevel || 3;
                    let compatibilityMessage = "";
                    let badgeClass = "";
                    
                    if (priorityLevel === 1) {
                        compatibilityMessage = "Aynı İlçe";
                        badgeClass = "compatibility-high";
                    } else if (priorityLevel === 2) {
                        compatibilityMessage = "Aynı Şehir";
                        badgeClass = "compatibility-medium";
                    } else {
                        let storyCity = "";
                        if (storyUserId) {
                            const { data: storyProfile } = await supabase
                                .from('profiles')
                                .select('city_name')
                                .eq('user_id', storyUserId)
                                .single();
                            if (storyProfile && storyProfile.city_name) {
                                storyCity = storyProfile.city_name;
                            }
                        }
                        compatibilityMessage = storyCity || "Farklı Konum";
                        badgeClass = "compatibility-low";
                    }
                    
                    compatibilityText.textContent = compatibilityMessage;
                    compatibilityBadge.className = `story-compatibility-badge ${badgeClass}`;
                    compatibilityBadge.style.display = 'flex';
                    setTimeout(() => {
                        compatibilityBadge.classList.add('visible');
                    }, 50);
                } catch (error) {
                    if (compatibilityBadge) {
                        compatibilityBadge.style.display = 'none';
                    }
                }
            }
        })(),
        
        // Çöp kutusu butonunu kontrol et (lazy load)
        (async () => {
            if (storyDeleteBtn) {
                try {
                    const { data: { user }, error: authError } = await supabase.auth.getUser();
                    
                    if (authError || !user) {
                        storyDeleteBtn.style.display = 'none';
                        storyDeleteBtn.removeAttribute('data-story-id');
                        return;
                    }
                    
                    let storyUserId = story.user_id;
                    
                    if (!storyUserId && story.id) {
                        const { data: storyData, error: storyError } = await supabase
                            .from('stories')
                            .select('user_id')
                            .eq('id', story.id)
                            .single();
                        
                        if (!storyError && storyData && storyData.user_id) {
                            storyUserId = storyData.user_id;
                            story.user_id = storyUserId;
                        }
                    }
                    
                    if (storyUserId && storyUserId === user.id) {
                        storyDeleteBtn.style.display = 'flex';
                        storyDeleteBtn.setAttribute('data-story-id', story.id);
                    } else {
                        storyDeleteBtn.style.display = 'none';
                        storyDeleteBtn.removeAttribute('data-story-id');
                    }
                } catch (error) {
                    storyDeleteBtn.style.display = 'none';
                    storyDeleteBtn.removeAttribute('data-story-id');
                }
            }
        })()
    ]).catch(() => {}); // Hataları sessizce yoksay
}

// Story Viewer'ı Kapat
function closeStoryViewer() {
    const storyViewerModal = document.getElementById('story-viewer-modal');
    
    if (storyViewerModal) {
        storyViewerModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Çöp kutusu butonunu gizle
    const storyDeleteBtn = document.getElementById('story-viewer-delete-btn');
    if (storyDeleteBtn) {
        storyDeleteBtn.style.display = 'none';
        storyDeleteBtn.removeAttribute('data-story-id');
        storyDeleteBtn.disabled = false;
        storyDeleteBtn.style.opacity = '1';
    }
    
    // Uyumluluk badge'ini gizle
    const compatibilityBadge = document.getElementById('story-compatibility-badge');
    if (compatibilityBadge) {
        compatibilityBadge.style.display = 'none';
        compatibilityBadge.classList.remove('visible');
    }
    
    // Timer'ları temizle
    stopStoryTimer();
    
    // State'i sıfırla
    isPaused = false;
    pausedElapsed = 0;
    
    console.log('✅ Story viewer kapatıldı');
}

// Otomatik Geçiş Timer'ı Başlat (Optimize Edilmiş - Daha Hızlı)
function startStoryTimer() {
    stopStoryTimer(); // Önceki timer'ı temizle
    
    const duration = 5000; // 5 saniye
    let elapsed = pausedElapsed; // Kaldığı yerden devam et
    const interval = 16; // Her 16ms'de bir güncelle (60 FPS için optimize)
    const startTime = Date.now() - elapsed; // Gerçek başlangıç zamanı
    
    // Progress bar'ı sıfırla ve başlat
    const progressBars = document.querySelectorAll('.story-progress-bar');
    if (progressBars[currentStoryIndex]) {
        progressBars[currentStoryIndex].classList.add('active');
        const progressFill = progressBars[currentStoryIndex].querySelector('.story-progress-fill');
        if (progressFill) {
            const initialProgress = (elapsed / duration) * 100;
            progressFill.style.width = `${Math.min(initialProgress, 100)}%`;
        }
    }
    
    storyViewerProgressInterval = setInterval(() => {
        // Basılı tutuluyorsa hiçbir şey yapma (süre akmasın)
        if (isPaused) {
            return;
        }
        
        elapsed = Date.now() - startTime;
        const progress = (elapsed / duration) * 100;
        
        if (progressBars[currentStoryIndex]) {
            const progressFill = progressBars[currentStoryIndex].querySelector('.story-progress-fill');
            if (progressFill) {
                progressFill.style.width = `${Math.min(progress, 100)}%`;
            }
        }
        
        if (elapsed >= duration) {
            // Interval'i temizle (tekrar çağrılmasını önle)
            if (storyViewerProgressInterval) {
                clearInterval(storyViewerProgressInterval);
                storyViewerProgressInterval = null;
            }
            
            // Progress bar'ı tamamlandı olarak işaretle
            if (progressBars[currentStoryIndex]) {
                progressBars[currentStoryIndex].classList.remove('active');
                progressBars[currentStoryIndex].classList.add('completed');
                const progressFill = progressBars[currentStoryIndex].querySelector('.story-progress-fill');
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
            }
            pausedElapsed = 0; // Yeni hikayeye geçerken sıfırla
            nextStory();
        }
    }, interval);
}

// Timer'ı Duraklat (Basılı tutma)
function pauseStoryTimer() {
    if (!isPaused && storyViewerProgressInterval) {
        isPaused = true;
        
        // Şu anki ilerlemeyi kaydet ve timer'ı durdur
        const progressBars = document.querySelectorAll('.story-progress-bar');
        if (progressBars[currentStoryIndex]) {
            const progressFill = progressBars[currentStoryIndex].querySelector('.story-progress-fill');
            if (progressFill) {
                const currentWidth = parseFloat(progressFill.style.width) || 0;
                pausedElapsed = (currentWidth / 100) * 5000; // 5 saniyenin yüzdesi
            }
        }
        
        // Timer'ı durdur
        if (storyViewerProgressInterval) {
            clearInterval(storyViewerProgressInterval);
            storyViewerProgressInterval = null;
        }
    }
}

// Timer'ı Devam Ettir (Bırakma)
function resumeStoryTimer() {
    if (isPaused) {
        isPaused = false;
        // Timer'ı kaldığı yerden devam ettir
        startStoryTimer();
    }
}

// Timer'ı Durdur
function stopStoryTimer() {
    if (storyViewerTimer) {
        clearTimeout(storyViewerTimer);
        storyViewerTimer = null;
    }
    if (storyViewerProgressInterval) {
        clearInterval(storyViewerProgressInterval);
        storyViewerProgressInterval = null;
    }
    isPaused = false;
    pausedElapsed = 0;
}

// Sonraki Hikaye (Optimize Edilmiş - Hızlı Geçiş)
function nextStory() {
    // Global state'i kontrol et (Hypee'den gelebilir)
    const storiesList = window.currentStoriesList || currentStoriesList;
    if (!storiesList || storiesList.length === 0) return;
    
    // Timer'ı durdur (hızlı geçiş için)
    stopStoryTimer();
    pausedElapsed = 0;
    
    const currentIdx = window.currentStoryIndex !== undefined ? window.currentStoryIndex : currentStoryIndex;
    const nextIdx = (currentIdx + 1) % storiesList.length;
    
    // State'i güncelle
    window.currentStoryIndex = nextIdx;
    currentStoryIndex = nextIdx;
    
    // İzlendi işaretlemelerini arka planda yap (non-blocking)
    const currentStory = storiesList[currentIdx];
    const nextStoryItem = storiesList[nextIdx];
    if (currentStory && currentStory.id) {
        markAsViewed(currentStory.id);
    }
    if (nextStoryItem && nextStoryItem.id) {
        markAsViewed(nextStoryItem.id);
    }
    
    // Hemen hikayeyi aç (async işlemlerden önce)
    openStoryViewer(nextStoryItem);
}

// Önceki Hikaye (Optimize Edilmiş - Hızlı Geçiş)
function prevStory() {
    // Global state'i kontrol et (Hypee'den gelebilir)
    const storiesList = window.currentStoriesList || currentStoriesList;
    if (!storiesList || storiesList.length === 0) return;
    
    // Timer'ı durdur (hızlı geçiş için)
    stopStoryTimer();
    pausedElapsed = 0;
    
    const currentIdx = window.currentStoryIndex !== undefined ? window.currentStoryIndex : currentStoryIndex;
    const prevIdx = (currentIdx - 1 + storiesList.length) % storiesList.length;
    
    // State'i güncelle
    window.currentStoryIndex = prevIdx;
    currentStoryIndex = prevIdx;
    
    // İzlendi işaretlemelerini arka planda yap (non-blocking)
    const currentStory = storiesList[currentIdx];
    const prevStoryItem = storiesList[prevIdx];
    if (currentStory && currentStory.id) {
        markAsViewed(currentStory.id);
    }
    if (prevStoryItem && prevStoryItem.id) {
        markAsViewed(prevStoryItem.id);
    }
    
    // Hemen hikayeyi aç (async işlemlerden önce)
    openStoryViewer(prevStoryItem);
}

// Progress Bar'ları Güncelle
function updateProgressBars() {
    const progressContainer = document.getElementById('story-progress-container');
    if (!progressContainer) return;
    
    progressContainer.innerHTML = '';
    
    currentStoriesList.forEach((story, index) => {
        const progressBar = document.createElement('div');
        progressBar.className = 'story-progress-bar';
        
        // Progress fill div'i
        const progressFill = document.createElement('div');
        progressFill.className = 'story-progress-fill';
        
        if (index < currentStoryIndex) {
            progressBar.classList.add('completed');
            progressFill.style.width = '100%';
        } else if (index === currentStoryIndex) {
            progressBar.classList.add('active');
            progressFill.style.width = '0%';
        } else {
            progressFill.style.width = '0%';
        }
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
    });
}

// Tek Bir Progress Bar'ı Güncelle
function updateProgressBar(index, progress) {
    const progressBars = document.querySelectorAll('.story-progress-bar');
    if (progressBars[index]) {
        const progressFill = progressBars[index].querySelector('.story-progress-fill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
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

// Hikaye Ekleme Modalını Aç
function openAddStoryModal() {
    const storyModal = document.getElementById('add-story-modal');
    if (!storyModal) {
        console.error('Hikaye modalı bulunamadı!');
        return;
    }
    
    storyModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Reset form
    resetStoryModal();
}

// Hikaye Modalını Kapat
function closeAddStoryModal() {
    const storyModal = document.getElementById('add-story-modal');
    if (storyModal) {
        storyModal.classList.add('hidden');
        document.body.style.overflow = '';
        resetStoryModal();
    }
}

// Hikaye Modalını Sıfırla
function resetStoryModal() {
    const storyUploadPreview = document.getElementById('story-upload-preview');
    const storyPhotoInput = document.getElementById('story-photo-input');
    const storyCropCanvas = document.getElementById('story-crop-canvas');
    const storyCropControls = document.getElementById('story-crop-controls');
    const shareStoryBtn = document.getElementById('share-story-btn');
    
    if (storyUploadPreview) {
        storyUploadPreview.innerHTML = `
            <span class="upload-icon">📷</span>
            <span class="upload-text">Görsel Seç</span>
        `;
    }
    
    if (storyPhotoInput) storyPhotoInput.value = '';
    if (storyCropCanvas) {
        storyCropCanvas.classList.add('hidden');
        const ctx = storyCropCanvas.getContext('2d');
        ctx.clearRect(0, 0, storyCropCanvas.width, storyCropCanvas.height);
    }
    if (storyCropControls) storyCropControls.classList.add('hidden');
    if (shareStoryBtn) shareStoryBtn.disabled = true;
    
    // Story modal state
    if (!window.storyModalState) {
        window.storyModalState = {};
    }
    window.storyModalState.selectedFile = null;
    window.storyModalState.croppedImage = null;
    window.storyModalState.cropImageSrc = null;
}

// Hikayeyi Sil (Global Fonksiyon)
window.deleteCurrentStory = async function() {
    const storyDeleteBtn = document.getElementById('story-viewer-delete-btn');
    if (!storyDeleteBtn) return;
    
    const storyId = storyDeleteBtn.getAttribute('data-story-id');
    if (!storyId) return;
    
    try {
        // Kullanıcı kontrolü
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Giriş Yapmalısınız', 'Hikaye silmek için giriş yapmalısınız.', 'error');
            } else {
                alert('Giriş yapmalısınız');
            }
            return;
        }
        
        // Hikayenin sahibini kontrol et
        const { data: storyData, error: storyError } = await supabase
            .from('stories')
            .select('user_id, media_url')
            .eq('id', storyId)
            .single();
        
        if (storyError || !storyData) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Hata', 'Hikaye bulunamadı.', 'error');
            } else {
                alert('Hikaye bulunamadı');
            }
            return;
        }
        
        // Kullanıcının kendi hikayesi mi kontrol et
        if (storyData.user_id !== user.id) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Yetkisiz İşlem', 'Bu hikayeyi silme yetkiniz yok.', 'error');
            } else {
                alert('Bu hikayeyi silme yetkiniz yok');
            }
            return;
        }
        
        // Küçük onay kutusu göster
        const confirmed = await showStoryDeleteConfirm();
        
        if (!confirmed) return;
        
        // Loading göster
        if (storyDeleteBtn) {
            storyDeleteBtn.disabled = true;
            storyDeleteBtn.style.opacity = '0.5';
        }
        
        // Storage'dan dosyayı sil (media_url'den dosya yolunu çıkar)
        if (storyData.media_url) {
            try {
                // URL'den dosya yolunu çıkar: "https://...supabase.co/storage/v1/object/public/stories/stories/user_id/filename"
                // Veya: "stories/user_id/filename" formatında
                const urlParts = storyData.media_url.split('/stories/');
                if (urlParts.length > 1) {
                    const filePath = `stories/${urlParts[1]}`;
                    const { error: storageError } = await supabase.storage
                        .from('stories')
                        .remove([filePath]);
                    
                    if (storageError) {
                        console.warn('Storage silme hatası (devam ediliyor):', storageError);
                        // Storage hatası olsa bile veritabanından silmeye devam et
                    }
                }
            } catch (storageErr) {
                console.warn('Storage silme hatası (devam ediliyor):', storageErr);
            }
        }
        
        // Veritabanından hikayeyi sil
        const { error: deleteError } = await supabase
            .from('stories')
            .delete()
            .eq('id', storyId)
            .eq('user_id', user.id); // Güvenlik: Sadece kendi hikayesini silebilsin
        
        if (deleteError) {
            console.error('Hikaye silme hatası:', deleteError);
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Hata', 'Hikaye silinirken bir hata oluştu.', 'error');
            } else {
                alert('Hikaye silinirken bir hata oluştu');
            }
            if (storyDeleteBtn) {
                storyDeleteBtn.disabled = false;
                storyDeleteBtn.style.opacity = '1';
            }
            return;
        }
        
        // Başarılı
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Başarılı', 'Hikayeniz silindi.', 'success');
        } else {
            alert('Hikayeniz silindi');
        }
        
        // Story viewer'ı kapat
        closeStoryViewer();
        
        // Hikayeleri yeniden yükle
        await loadStories();
        
    } catch (error) {
        console.error('Hikaye silme hatası:', error);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        } else {
            alert('Bir hata oluştu');
        }
        const storyDeleteBtn = document.getElementById('story-viewer-delete-btn');
        if (storyDeleteBtn) {
            storyDeleteBtn.disabled = false;
            storyDeleteBtn.style.opacity = '1';
        }
    }
};

// Story Silme Onay Kutusu (Küçük ve Şık)
function showStoryDeleteConfirm() {
    return new Promise((resolve) => {
        const modal = document.getElementById('story-delete-confirm-modal');
        const cancelBtn = document.getElementById('story-confirm-cancel');
        const deleteBtn = document.getElementById('story-confirm-delete');
        
        if (!modal || !cancelBtn || !deleteBtn) {
            console.error('Story confirm modal bulunamadı');
            resolve(false);
            return;
        }
        
        // Modal'ı göster
        modal.classList.remove('hidden');
        
        // Timer'ı durdur (onay sırasında hikaye geçiş yapmasın)
        pauseStoryTimer();
        
        // İptal butonu
        const handleCancel = () => {
            modal.classList.add('hidden');
            resumeStoryTimer();
            cancelBtn.removeEventListener('click', handleCancel);
            deleteBtn.removeEventListener('click', handleDelete);
            modal.removeEventListener('click', handleOverlayClick);
            resolve(false);
        };
        
        // Sil butonu
        const handleDelete = () => {
            modal.classList.add('hidden');
            cancelBtn.removeEventListener('click', handleCancel);
            deleteBtn.removeEventListener('click', handleDelete);
            modal.removeEventListener('click', handleOverlayClick);
            resolve(true);
        };
        
        // Overlay'e tıklayınca iptal et
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        };
        
        cancelBtn.addEventListener('click', handleCancel);
        deleteBtn.addEventListener('click', handleDelete);
        modal.addEventListener('click', handleOverlayClick);
    });
}

// Story Viewer State'ini global yap (Hypee'den erişilebilir olması için)
window.currentStoriesList = currentStoriesList;
window.currentStoryIndex = currentStoryIndex;

// Story Viewer'ı Aç (Global fonksiyon - Hypee'den erişilebilir)
window.openStoryViewer = openStoryViewer;

// Global viewStory fonksiyonu
window.viewStory = viewStory;
window.nextStory = nextStory;
window.prevStory = prevStory;
window.closeStoryViewer = closeStoryViewer;

// Global getTimeAgo fonksiyonu (Hypee'den erişilebilir)
window.getTimeAgo = getTimeAgo;

// Hikaye Modal Event Listeners ve Crop İşlevi
function initStoryModal() {
    const storyModal = document.getElementById('add-story-modal');
    const storyPhotoInput = document.getElementById('story-photo-input');
    const storyPhotoUploadArea = document.getElementById('story-photo-upload-area');
    const storyUploadPreview = document.getElementById('story-upload-preview');
    const storyCropCanvas = document.getElementById('story-crop-canvas');
    const storyCropControls = document.getElementById('story-crop-controls');
    const storyCropApply = document.getElementById('story-crop-apply');
    const storyCropCancel = document.getElementById('story-crop-cancel');
    const shareStoryBtn = document.getElementById('share-story-btn');
    const cancelStoryBtn = document.getElementById('cancel-story-btn');
    const backStoryBtn = document.getElementById('back-add-story');
    const closeStoryBtn = document.getElementById('close-story-modal');

    // Modal Kapatma Event Listeners
    if (cancelStoryBtn) {
        cancelStoryBtn.addEventListener('click', closeAddStoryModal);
    }
    if (backStoryBtn) {
        backStoryBtn.addEventListener('click', closeAddStoryModal);
    }
    if (closeStoryBtn) {
        closeStoryBtn.addEventListener('click', closeAddStoryModal);
    }
    if (storyModal) {
        storyModal.addEventListener('click', (e) => {
            if (e.target === storyModal) {
                closeAddStoryModal();
            }
        });
    }

    // Fotoğraf yükleme alanına tıklama
    if (storyPhotoUploadArea && storyPhotoInput) {
        storyPhotoUploadArea.addEventListener('click', () => {
            if (!storyUploadPreview.querySelector('img')) {
                storyPhotoInput.click();
            }
        });
    }

    // Dosya seçimi
    if (storyPhotoInput) {
        storyPhotoInput.addEventListener('change', handleStoryFileSelect);
    }

    // Crop Apply
    if (storyCropApply) {
        storyCropApply.addEventListener('click', handleStoryCropApply);
    }

    // Crop Cancel
    if (storyCropCancel) {
        storyCropCancel.addEventListener('click', handleStoryCropCancel);
    }

    // Share Story
    if (shareStoryBtn) {
        shareStoryBtn.addEventListener('click', handleShareStory);
    }
}

// Story File Select Handler
async function handleStoryFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Dosya tipi kontrolü (Sadece resim)
    if (!file.type.startsWith('image/')) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Geçersiz Dosya', 'Sadece resim yükleyebilirsiniz.', 'error');
        } else {
            alert('Sadece resim yükleyebilirsiniz.');
        }
        return;
    }

    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Dosya Çok Büyük', 'Hikaye resmi/videosu maksimum 10MB olabilir.', 'error');
        } else {
            alert('Dosya çok büyük. Maksimum 10MB.');
        }
        return;
    }

    const storyUploadPreview = document.getElementById('story-upload-preview');
    const storyCropCanvas = document.getElementById('story-crop-canvas');
    const storyCropControls = document.getElementById('story-crop-controls');
    const shareStoryBtn = document.getElementById('share-story-btn');

    // Modal state
    if (!window.storyModalState) {
        window.storyModalState = {};
    }
    window.storyModalState.selectedFile = file;

    // Resim için crop işlemi hazırla
    const img = new Image();
    img.onload = () => {
        // Canvas boyutlarını ayarla
        const maxSize = 800;
        let canvasWidth = img.width;
        let canvasHeight = img.height;

        if (canvasWidth > maxSize || canvasHeight > maxSize) {
            const ratio = Math.min(maxSize / canvasWidth, maxSize / canvasHeight);
            canvasWidth = canvasWidth * ratio;
            canvasHeight = canvasHeight * ratio;
        }

        if (storyCropCanvas) {
            storyCropCanvas.width = canvasWidth;
            storyCropCanvas.height = canvasHeight;
            storyCropCanvas.classList.remove('hidden');
            
            const ctx = storyCropCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            
            // Crop overlay çiz
            drawStoryCropOverlay(ctx, canvasWidth, canvasHeight);
        }

        if (storyCropControls) storyCropControls.classList.remove('hidden');
        if (storyUploadPreview) storyUploadPreview.style.display = 'none';
    };
    
    // Görseli yükle
    window.storyModalState.cropImageSrc = URL.createObjectURL(file);
    img.src = window.storyModalState.cropImageSrc;
}

// Story Crop Overlay Çiz
function drawStoryCropOverlay(ctx, width, height) {
    // Kare boyutu (küçük olan tarafın %90'ı)
    const size = Math.min(width, height) * 0.9;
    const x = (width - size) / 2;
    const y = (height - size) / 2;

    // Koyu overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Orta kareyi temizle (crop alanı)
    ctx.clearRect(x, y, size, size);

    // Kare kenarları
    ctx.strokeStyle = '#0095f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);

    // Crop koordinatlarını kaydet
    if (!window.storyModalState) window.storyModalState = {};
    window.storyModalState.cropStartX = x;
    window.storyModalState.cropStartY = y;
    window.storyModalState.cropEndX = x + size;
    window.storyModalState.cropEndY = y + size;
}

// Story Crop Apply
function handleStoryCropApply() {
    const storyCropCanvas = document.getElementById('story-crop-canvas');
    const storyCropControls = document.getElementById('story-crop-controls');
    const storyUploadPreview = document.getElementById('story-upload-preview');
    const shareStoryBtn = document.getElementById('share-story-btn');

    if (!storyCropCanvas || !window.storyModalState || !window.storyModalState.cropImageSrc) return;

    const size = window.storyModalState.cropEndX - window.storyModalState.cropStartX;
    const x = window.storyModalState.cropStartX;
    const y = window.storyModalState.cropStartY;

    // Orijinal görseli yükle ve crop uygula
    const img = new Image();
    img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = storyCropCanvas.width;
        tempCanvas.height = storyCropCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        // Crop işlemi
        const imageData = tempCtx.getImageData(x, y, size, size);
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = size;
        croppedCanvas.height = size;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.putImageData(imageData, 0, 0);

        // Blob'a çevir
        croppedCanvas.toBlob((blob) => {
            window.storyModalState.croppedImage = blob;
            
            if (storyUploadPreview) {
                storyUploadPreview.innerHTML = `<img src="${croppedCanvas.toDataURL()}" alt="Cropped" style="max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: contain;">`;
                storyUploadPreview.style.display = 'block';
            }
            
            if (storyCropControls) storyCropControls.classList.add('hidden');
            if (storyCropCanvas) storyCropCanvas.classList.add('hidden');
            if (shareStoryBtn) shareStoryBtn.disabled = false;
        }, 'image/png', 0.95);
    };
    
    img.src = window.storyModalState.cropImageSrc;
}

// Story Crop Cancel
function handleStoryCropCancel() {
    const storyCropCanvas = document.getElementById('story-crop-canvas');
    const storyCropControls = document.getElementById('story-crop-controls');
    const storyPhotoInput = document.getElementById('story-photo-input');
    const storyUploadPreview = document.getElementById('story-upload-preview');

    if (storyCropCanvas) {
        storyCropCanvas.classList.add('hidden');
        const ctx = storyCropCanvas.getContext('2d');
        ctx.clearRect(0, 0, storyCropCanvas.width, storyCropCanvas.height);
    }
    if (storyCropControls) storyCropControls.classList.add('hidden');
    if (storyPhotoInput) storyPhotoInput.value = '';
    if (storyUploadPreview) {
        storyUploadPreview.style.display = 'block';
        storyUploadPreview.innerHTML = `
            <span class="upload-icon">📷</span>
            <span class="upload-text">Görsel Seç</span>
        `;
    }
    
    if (window.storyModalState) {
        window.storyModalState.selectedFile = null;
        window.storyModalState.cropImageSrc = null;
        window.storyModalState.croppedImage = null;
    }
}

// Share Story Handler
async function handleShareStory() {
    if (!window.storyModalState || (!window.storyModalState.croppedImage && !window.storyModalState.selectedFile)) {
        return;
    }

    const shareStoryBtn = document.getElementById('share-story-btn');
    if (shareStoryBtn) {
        shareStoryBtn.disabled = true;
        shareStoryBtn.innerHTML = '<span>Yükleniyor...</span>';
    }

    try {
        // Kullanıcı kontrolü
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Giriş Yapmalısınız', 'Hikaye paylaşmak için giriş yapmalısınız.', 'error');
            } else {
                alert('Giriş Yapmalısınız');
            }
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Profil kontrolü
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, image_url, city_name, district')
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Profil Bulunamadı', 'Lütfen önce haritaya profil ekleyin.', 'error');
            } else {
                alert('Lütfen önce haritaya profil ekleyin.');
            }
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Konum kontrolü
        if (!profile.city_name || !profile.district) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Konum Bilgisi Gerekli', 'Hikayenin doğru kişilere ulaşması için profilinden Şehir ve İlçe seçmelisin.', 'info');
            } else {
                alert('Hikayenin doğru kişilere ulaşması için profilinden Şehir ve İlçe seçmelisin.');
            }
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Günde bir hikaye kontrolü
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: todayStories, error: todayStoriesError } = await supabase
            .from('stories')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString());
        
        if (todayStoriesError) {
            console.error('Bugünkü hikaye kontrolü hatası:', todayStoriesError);
        }
        
        if (todayStories && todayStories.length > 0) {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Günlük Limit', 'Günde sadece bir hikaye paylaşabilirsiniz. Yarın tekrar deneyin.', 'warning');
            } else {
                alert('Günde sadece bir hikaye paylaşabilirsiniz.');
            }
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Dosyayı hazırla (kırpılmış resim varsa onu kullan, yoksa orijinali)
        const fileToUpload = window.storyModalState.croppedImage || window.storyModalState.selectedFile;
        if (!fileToUpload) {
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Dosya uzantısı
        const fileExt = window.storyModalState.croppedImage ? 'png' : window.storyModalState.selectedFile.name.split('.').pop();
        const fileName = `stories/${user.id}/${Date.now()}.${fileExt}`;

        // Storage'a yükle
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stories')
            .upload(fileName, fileToUpload, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Yükleme hatası:', uploadError);
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Yükleme Hatası', 'Hikaye yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            } else {
                alert('Yükleme hatası!');
            }
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

        // Veritabanına kaydet
        const { error: insertError } = await supabase
            .from('stories')
            .insert({
                user_id: user.id,
                username: profile.name || 'Kullanıcı',
                avatar_url: profile.image_url || '',
                media_url: publicUrl
            });

        if (insertError) {
            console.error('Veritabanı hatası:', insertError);
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Kayıt Hatası', 'Hikaye kaydedilirken bir hata oluştu.', 'error');
            } else {
                alert('Kayıt hatası!');
            }
            await supabase.storage.from('stories').remove([fileName]);
            if (shareStoryBtn) {
                shareStoryBtn.disabled = false;
                shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
            }
            return;
        }

        // Başarılı
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Başarılı!', 'Hikayeniz paylaşıldı!', 'success');
        } else {
            alert('Hikayeniz paylaşıldı!');
        }

        // Modalı kapat ve hikayeleri yenile
        closeAddStoryModal();
        await loadStories();
        
    } catch (error) {
        console.error('Hikaye paylaşma hatası:', error);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        } else {
            alert('Bir hata oluştu!');
        }
        if (shareStoryBtn) {
            shareStoryBtn.disabled = false;
            shareStoryBtn.innerHTML = '<span>Hikayeyi Paylaş</span>';
        }
    }
}

// Story Viewer Event Listeners
function initStoryViewer() {
    const storyViewerClose = document.getElementById('story-viewer-close');
    const storyViewerModal = document.getElementById('story-viewer-modal');
    const storyNavPrev = document.getElementById('story-nav-prev');
    const storyNavNext = document.getElementById('story-nav-next');
    const storyContentWrapper = document.querySelector('.story-content-wrapper');
    
    // Kapat butonu - Hem direkt hem de delegated event listener
    if (storyViewerClose) {
        // Önce mevcut listener'ları temizle (çift ekleme önleme)
        const newCloseBtn = storyViewerClose.cloneNode(true);
        storyViewerClose.parentNode.replaceChild(newCloseBtn, storyViewerClose);
        
        // Yeni event listener ekle
        document.getElementById('story-viewer-close').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeStoryViewer();
            return false;
        }, true); // Capture phase'de çalışsın
        
        // Alternatif: Direkt onclick (yedek)
        document.getElementById('story-viewer-close').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeStoryViewer();
            return false;
        };
    }
    
    // Çöp kutusu butonu
    const storyDeleteBtn = document.getElementById('story-viewer-delete-btn');
    if (storyDeleteBtn) {
        // Önce mevcut listener'ları temizle (çift ekleme önleme)
        const newDeleteBtn = storyDeleteBtn.cloneNode(true);
        storyDeleteBtn.parentNode.replaceChild(newDeleteBtn, storyDeleteBtn);
        
        // Yeni event listener ekle
        document.getElementById('story-viewer-delete-btn').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            window.deleteCurrentStory();
            return false;
        }, true);
        
        // Alternatif: Direkt onclick (yedek)
        document.getElementById('story-viewer-delete-btn').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.deleteCurrentStory();
            return false;
        };
    }
    
    // Modal dışına tıklayınca kapat (ama butonlara tıklanınca kapanmasın)
    if (storyViewerModal) {
        storyViewerModal.addEventListener('click', (e) => {
            // Kapat butonu, nav butonları, sil butonu veya içerik alanına tıklanırsa kapanmasın
            if (e.target.closest('.story-viewer-close') || 
                e.target.closest('.story-nav-btn') ||
                e.target.closest('.story-viewer-delete-btn') ||
                e.target.closest('.story-content-wrapper') ||
                e.target.closest('.story-progress-container') ||
                e.target.closest('.story-viewer-info')) {
                return; // Bu elementlere tıklanınca hiçbir şey yapma
            }
            // Sadece boş alana (modal'ın kendisine) tıklanırsa kapat
            if (e.target === storyViewerModal) {
                closeStoryViewer();
            }
        });
    }
    
    // Önceki hikaye - Daha güvenilir event listener
    if (storyNavPrev) {
        // Önce mevcut listener'ları temizle
        const newPrevBtn = storyNavPrev.cloneNode(true);
        storyNavPrev.parentNode.replaceChild(newPrevBtn, storyNavPrev);
        
        // Yeni event listener ekle
        document.getElementById('story-nav-prev').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            prevStory();
            return false;
        }, true);
        
        // Alternatif: Direkt onclick (yedek)
        document.getElementById('story-nav-prev').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            prevStory();
            return false;
        };
    }
    
    // Sonraki hikaye - Daha güvenilir event listener
    if (storyNavNext) {
        // Önce mevcut listener'ları temizle
        const newNextBtn = storyNavNext.cloneNode(true);
        storyNavNext.parentNode.replaceChild(newNextBtn, storyNavNext);
        
        // Yeni event listener ekle
        document.getElementById('story-nav-next').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            nextStory();
            return false;
        }, true);
        
        // Alternatif: Direkt onclick (yedek)
        document.getElementById('story-nav-next').onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            nextStory();
            return false;
        };
    }
    
    // Basılı Tutunca Durdurma (Hold to Pause) - Masaüstü ve Mobil
    if (storyContentWrapper || storyViewerModal) {
        const targetElement = storyContentWrapper || storyViewerModal;
        
        // Basılı tutma (mousedown / touchstart)
        ['mousedown', 'touchstart'].forEach(evt => {
            targetElement.addEventListener(evt, (e) => {
                // Navigation butonlarına, kapat butonuna veya sil butonuna tıklanırsa durdurma
                if (e.target.closest('.story-nav-btn') || 
                    e.target.closest('.story-viewer-close') ||
                    e.target.closest('.story-viewer-delete-btn')) {
                    return;
                }
                pauseStoryTimer();
            }, { passive: true });
        });
        
        // Bırakma (mouseup / touchend)
        ['mouseup', 'touchend'].forEach(evt => {
            targetElement.addEventListener(evt, () => {
                resumeStoryTimer();
            }, { passive: true });
        });
        
        // Mouse/Touch dışarı çıkınca da devam et (örneğin ekran dışına çıktığında)
        ['mouseleave', 'touchcancel'].forEach(evt => {
            targetElement.addEventListener(evt, () => {
                resumeStoryTimer();
            }, { passive: true });
        });
    }
    
    // Klavye kısayolları (Global event listener - modal açıkken çalışır)
    // Önce mevcut listener'ı kaldır (çift ekleme önleme)
    if (window.storyViewerKeydownHandler) {
        document.removeEventListener('keydown', window.storyViewerKeydownHandler, true);
    }
    
    window.storyViewerKeydownHandler = (e) => {
        const storyViewerModal = document.getElementById('story-viewer-modal');
        
        // Sadece story viewer açıkken çalış
        if (!storyViewerModal || storyViewerModal.classList.contains('hidden')) {
            return; // Story viewer kapalı, hiçbir şey yapma
        }
        
        // Story viewer açık - ok tuşlarını işle (öncelik: story viewer > navbar stories)
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeStoryViewer();
            return false;
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            prevStory();
            return false;
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            nextStory();
            return false;
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            // Boşluk tuşu ile durdur/devam et
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (isPaused) {
                resumeStoryTimer();
            } else {
                pauseStoryTimer();
            }
            return false;
        }
    };
    
    // Event listener'ı ekle (capture phase'de çalışsın ki diğer listener'ları geçsin)
    document.addEventListener('keydown', window.storyViewerKeydownHandler, true);
}

// Story input change event - Sayfa yüklendiğinde initialize et
document.addEventListener('DOMContentLoaded', async () => {
    // Supabase hazır olana kadar bekle (global waitForSupabase fonksiyonunu kullan)
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
    
    // Story modal'ı initialize et
    initStoryModal();
    
    // Story viewer'ı initialize et
    initStoryViewer();
    
    // Eski storyInput event listener'ı kaldırıldı - artık modal kullanılıyor
    // İsterseniz eski input'u da kaldırabilirsiniz, ama şimdilik bırakıyoruz
    if (storyInput) {
        storyInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                // Kullanıcı kontrolü
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError || !user) {
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Giriş Yapmalısınız', 'Hikaye paylaşmak için giriş yapmalısınız.', 'error');
                    } else {
                        alert('Giriş Yapmalısınız');
                    }
                    return;
                }

                // Profil kontrolü (Konum bilgisini de kontrol edelim)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, name, image_url, city_name, district')
                    .eq('user_id', user.id)
                    .single();

                if (profileError || !profile) {
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Profil Bulunamadı', 'Lütfen önce haritaya profil ekleyin.', 'error');
                    } else {
                        alert('Lütfen önce haritaya profil ekleyin.');
                    }
                    return;
                }

                // Şehir ve ilçe kontrolü (Algoritmik akış için gerekli)
                if (!profile.city_name || !profile.district) {
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Konum Bilgisi Gerekli', 'Hikayenin doğru kişilere ulaşması için profilinden Şehir ve İlçe seçmelisin.', 'info');
                    } else {
                        alert('Hikayenin doğru kişilere ulaşması için profilinden Şehir ve İlçe seçmelisin.');
                    }
                    return;
                }

                // Dosya boyutu kontrolü (10MB limit)
                if (file.size > 10 * 1024 * 1024) {
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Dosya Çok Büyük', 'Hikaye resmi/videosu maksimum 10MB olabilir.', 'error');
                    } else {
                        alert('Dosya çok büyük. Maksimum 10MB.');
                    }
                    return;
                }

                // Dosya tipi kontrolü
                if (!file.type.startsWith('image/')) {
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Geçersiz Dosya', 'Sadece resim yükleyebilirsiniz.', 'error');
                    } else {
                        alert('Sadece resim yükleyebilirsiniz.');
                    }
                    return;
                }

                // Loading göster
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Yükleniyor...', 'Hikayeniz yükleniyor, lütfen bekleyin.', 'info');
                }

                // Dosyayı Storage'a Yükle
                const fileExt = file.name.split('.').pop();
                const fileName = `stories/${user.id}/${Date.now()}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('stories')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Yükleme hatası:', uploadError);
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Yükleme Hatası', 'Hikaye yüklenirken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
                    } else {
                        alert('Yükleme hatası!');
                    }
                    return;
                }

                // Public URL'ini al
                const { data: { publicUrl } } = supabase.storage
                    .from('stories')
                    .getPublicUrl(fileName);

                // Veritabanına Yaz
                const { error: insertError } = await supabase
                    .from('stories')
                    .insert({
                        user_id: user.id,
                        username: profile.name || 'Kullanıcı',
                        avatar_url: profile.image_url || '',
                        media_url: publicUrl
                    });

                if (insertError) {
                    console.error('Veritabanı hatası:', insertError);
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert('Kayıt Hatası', 'Hikaye kaydedilirken bir hata oluştu.', 'error');
                    } else {
                        alert('Kayıt hatası!');
                    }
                    // Yüklenen dosyayı sil
                    await supabase.storage.from('stories').remove([fileName]);
                    return;
                }

                // Başarılı
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Başarılı!', 'Hikayeniz paylaşıldı!', 'success');
                } else {
                    alert('Hikayeniz paylaşıldı!');
                }
                
                // Input'u temizle
                storyInput.value = '';
                
                // Hikayeleri yeniden yükle
                await loadStories();
            } catch (error) {
                console.error('Hikaye yükleme hatası:', error);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
                } else {
                    alert('Bir hata oluştu!');
                }
            }
        });
    }

    // Sayfa yüklendiğinde ve Supabase hazır olduğunda hikayeleri yükle
    setTimeout(async () => {
        await toggleStoriesContainer(); // Önce container'ı göster
        await loadStories(); // Sonra hikayeleri yükle
    }, 1000); // Supabase'in tam olarak hazır olması için kısa bir bekleme

    // Auth state değiştiğinde stories'i güncelle
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            setTimeout(async () => {
                await toggleStoriesContainer(); // Önce container'ı güncelle
                await loadStories(); // Sonra hikayeleri yükle
            }, 500);
        }
    });
    
    // Harita görünümünde Hypee butonunu göster
    updateHypeeButtonVisibility();
    
    // App container'ın map-view class'ını dinle (değişiklik olduğunda butonu güncelle)
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        // MutationObserver ile class değişikliklerini dinle
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateHypeeButtonVisibility();
                }
            });
        });
        
        observer.observe(appContainer, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Hypee Keşfet Modal Fonksiyonları
// Hypee buton görünürlüğünü güncelle
function updateHypeeButtonVisibility() {
    const appContainer = document.querySelector('.app-container');
    const hypeeBtn = document.getElementById('hypee-btn');
    
    if (hypeeBtn && appContainer) {
        if (appContainer.classList.contains('map-view')) {
            hypeeBtn.style.display = 'flex';
        } else {
            hypeeBtn.style.display = 'none';
        }
    }
}

// Global olarak erişilebilir yap
window.updateHypeeButtonVisibility = updateHypeeButtonVisibility;

// Hypee Keşfet Modal'ı Aç
window.openHypeeDiscover = async function() {
    const modal = document.getElementById('hypee-discover-modal');
    const grid = document.getElementById('hypee-stories-grid');
    const loading = document.getElementById('hypee-loading');
    const empty = document.getElementById('hypee-empty');
    
    if (!modal) return;
    
    // Modal'ı göster
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Varsayılan olarak "Hypee Keşfet" sekmesini göster
    switchHypeeTab('discover');
    
    // Loading göster
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (grid) grid.innerHTML = '';
    
    // Hikayeleri yükle
    await loadHypeeDiscoverStories();
    
    // Loading gizle
    if (loading) loading.style.display = 'none';
}

// Hypee Tab Değiştir
window.switchHypeeTab = function(tabName) {
    // Tüm tab'ları ve içerikleri güncelle
    const tabs = document.querySelectorAll('.hypee-tab');
    const contents = document.querySelectorAll('.hypee-tab-content');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    contents.forEach(content => {
        if (content.id === `hypee-tab-${tabName}`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    // Eğer "matches" sekmesine geçildiyse eşleşmeleri yükle
    if (tabName === 'matches') {
        loadHypeMatches();
    }
}

// Hypee Keşfet Modal'ı Kapat
window.closeHypeeDiscover = function() {
    const modal = document.getElementById('hypee-discover-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Hypee Keşfet Hikayelerini Yükle (Profil bilgilerine göre sıralı)
async function loadHypeeDiscoverStories() {
    const grid = document.getElementById('hypee-stories-grid');
    const empty = document.getElementById('hypee-empty');
    
    if (!grid) return;
    
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
                myCity = profile.city_name || "";
                myDistrict = profile.district || "";
            }
        }
        
        // 2. 24 saatten eski hikayeleri filtrele (otomatik silme)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // 3. Akıllı Fonksiyonu (RPC) Çağırıyoruz - Tüm hikayeleri öncelik sırasına göre al
        const { data: stories, error } = await supabase
            .rpc('get_nearby_stories', {
                my_city: myCity || null,
                my_district: myDistrict || null
            });
        
        // 4. 24 saatten eski hikayeleri filtrele ve sil
        if (stories && stories.length > 0) {
            const validStories = [];
            const expiredStoryIds = [];
            
            for (const story of stories) {
                const storyDate = new Date(story.created_at);
                if (storyDate >= new Date(oneDayAgo)) {
                    validStories.push(story);
                } else {
                    expiredStoryIds.push(story.id);
                }
            }
            
            // Eski hikayeleri sil (arka planda, hata olsa bile devam et)
            if (expiredStoryIds.length > 0) {
                supabase
                    .from('stories')
                    .delete()
                    .in('id', expiredStoryIds)
                    .then(() => {
                        console.log(`✅ ${expiredStoryIds.length} eski hikaye silindi`);
                    })
                    .catch(err => {
                        console.warn('⚠️ Eski hikaye silme hatası:', err);
                    });
            }
            
            // Sadece geçerli hikayeleri kullan
            stories.length = 0;
            stories.push(...validStories);
        }
        
        if (error) {
            console.error('Hypee hikaye yükleme hatası:', error);
            // Fallback: Eski yöntemle yükle
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: fallbackStories, error: fallbackError } = await supabase
                .from('stories')
                .select('id, user_id, username, avatar_url, media_url, created_at')
                .gt('created_at', oneDayAgo)
                .order('created_at', { ascending: false });
            
            if (fallbackError || !fallbackStories || fallbackStories.length === 0) {
                if (empty) empty.style.display = 'flex';
                return;
            }
            
            // Fallback hikayeleri filtrele (sadece resimler)
            const imageFallbackStories = fallbackStories.filter(story => {
                const mediaUrl = story.media_url.toLowerCase();
                return !mediaUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/);
            });
            
            if (!imageFallbackStories || imageFallbackStories.length === 0) {
                if (empty) empty.style.display = 'flex';
                return;
            }
            
            // Fallback hikayeleri grid'e ekle (sadece resimler)
            displayHypeeStories(imageFallbackStories);
            return;
        }
        
        if (!stories || stories.length === 0) {
            if (empty) empty.style.display = 'flex';
            return;
        }
        
        // 3. Sadece resimleri filtrele (videoları hariç tut)
        const imageStories = stories.filter(story => {
            const mediaUrl = story.media_url.toLowerCase();
            // Video uzantılarını kontrol et
            return !mediaUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/);
        });
        
        if (!imageStories || imageStories.length === 0) {
            if (empty) empty.style.display = 'flex';
            return;
        }
        
        // 4. Hikayeleri grid'e ekle (sadece resimler)
        displayHypeeStories(imageStories);
        
    } catch (error) {
        console.error('Hypee hikaye yükleme hatası:', error);
        if (empty) empty.style.display = 'flex';
    }
}

// Hypee Hikayelerini Grid'e Göster (Optimize Edilmiş - DOM scraping yerine direkt veri kullanımı)
function displayHypeeStories(stories) {
    const grid = document.getElementById('hypee-stories-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Veriyi direkt kullanacağız (DOM scraping yerine)
    stories.forEach((story, index) => {
        // XSS koruması (Sadece görsel basarken gerekli)
        const escapedUsername = (story.username || 'Kullanıcı').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        const storyItem = document.createElement('div');
        storyItem.className = 'hypee-story-item';
        // Data attribute'lara gerek kalmadı çünkü direkt objeyi kullanacağız
        
        // Hypee'de sadece resimler gösterilir (videolar zaten filtrelenmiş)
        const mediaHTML = `<img src="${story.media_url}" alt="${escapedUsername}" loading="lazy">`;
        
        storyItem.innerHTML = `
            ${mediaHTML}
            <div class="hypee-story-overlay">
                <img src="${story.avatar_url || 'https://via.placeholder.com/64'}" 
                     class="hypee-story-avatar"
                     onerror="this.src='https://via.placeholder.com/64'">
                <span class="hypee-story-username">${escapedUsername}</span>
            </div>
        `;
        
        // TIKLAMA OLAYI (Düzeltilmiş Mantık - DOM scraping yerine direkt veri kullanımı)
        storyItem.addEventListener('click', () => {
            // 1. Grid'deki TÜM hikayeleri Viewer formatına çevir
            // (Burada stories dizisini map ediyoruz, DOM'u değil. Daha hızlı ve güvenli)
            const viewerList = stories.map(s => ({
                id: s.id,
                user_id: s.user_id, // user_id'yi ekle (badge için gerekli)
                mediaUrl: s.media_url,
                username: s.username,
                avatar: s.avatar_url, // Avatar bilgisini de taşıyalım
                priorityLevel: s.priority_level || 3,
                created_at: s.created_at, // created_at'i ekle (zaman hesaplaması için)
                time: s.created_at ? getTimeAgo(s.created_at) : 'Az önce' // Gerçek zaman farkı
            }));
            
            // 2. Tıklanan hikayenin index'i zaten elimizde: "index"
            openHypeeStoryViewer(viewerList, index);
        });
        
        grid.appendChild(storyItem);
    });
}

// Hypee Story Viewer'ı Aç (Keşfet'ten gelen hikayeler için)
function openHypeeStoryViewer(storyList, startIndex) {
    // Önce mevcut story viewer'ı kullanacağız
    // stories.js'deki openStoryViewer fonksiyonunu kullanabiliriz
    // Ama önce currentStoriesList'i güncellememiz gerekiyor
    
    // Global değişkenleri güncelle (stories.js'den erişilebilir olmalı)
    if (typeof window !== 'undefined') {
        // stories.js'deki state'i güncelle
        if (window.currentStoriesList !== undefined) {
            window.currentStoriesList = storyList;
        }
        if (window.currentStoryIndex !== undefined) {
            window.currentStoryIndex = startIndex;
        }
        
        // Story viewer'ı aç
        const firstStory = storyList[startIndex];
        
        // İlk hikayeyi izlendi olarak işaretle
        if (firstStory && firstStory.id) {
            markAsViewed(firstStory.id);
        }
        
        if (firstStory && typeof window.openStoryViewer === 'function') {
            window.openStoryViewer({
                id: firstStory.id,
                user_id: firstStory.user_id, // user_id'yi ekle (badge için gerekli)
                mediaUrl: firstStory.mediaUrl,
                username: firstStory.username,
                priorityLevel: firstStory.priorityLevel,
                avatar: firstStory.avatar, // Avatar bilgisini de geçelim
                created_at: firstStory.created_at, // created_at'i ekle (zaman hesaplaması için)
                time: firstStory.time // Zaman bilgisini de geçelim
            });
            
            // Hypee modal'ı kapat
            closeHypeeDiscover();
        } else if (firstStory && typeof viewStory === 'function') {
            // Alternatif: viewStory fonksiyonu varsa onu kullan
            viewStory(firstStory.id, firstStory.mediaUrl, firstStory.username, firstStory.priorityLevel);
            closeHypeeDiscover();
        }
    }
}

// Hype Eşleşmelerini Getir ve Göster
async function loadHypeMatches() {
    const container = document.getElementById('hype-matches-list');
    const loading = document.getElementById('hype-matches-loading');
    const empty = document.getElementById('hype-matches-empty');
    
    if (!container) return;
    
    // Loading göster
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    container.innerHTML = '';
    
    try {
        // 1. Supabase RPC fonksiyonunu çağır (SQL'de yazdığımız)
        const { data: matches, error } = await supabase
            .rpc('get_hype_matches', { match_limit: 10 });
        
        if (error) {
            console.error('Eşleşme hatası:', error);
            if (empty) {
                empty.style.display = 'flex';
                empty.innerHTML = `
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <p style="margin-bottom: 16px; font-size: 16px; color: rgba(255, 255, 255, 0.7);">Eşleşmeler yüklenirken bir hata oluştu.</p>
                `;
            }
            return;
        }
        
        // Loading gizle
        if (loading) loading.style.display = 'none';
        
        // 2. HTML'i temizle ve yeni kartları ekle
        if (matches && matches.length > 0) {
            matches.forEach((match, index) => {
                // match_reason içindeki kullanıcı adını kalın yapalım
                const formattedReason = match.match_reason.replace(
                    match.name, 
                    `<strong>${match.name}</strong>`
                );
                
                const escapedName = (match.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const escapedImageUrl = (match.image_url || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                
                const cardHTML = `
                    <div class="hype-card" style="animation-delay: ${index * 0.1}s;">
                        <div class="hype-avatar" style="cursor: pointer;" onclick="handleProfileClick('${match.user_id}')">
                            <img src="${match.image_url || 'https://via.placeholder.com/48'}" 
                                 alt="${escapedName}" 
                                 onerror="this.src='https://via.placeholder.com/48'">
                        </div>
                        <div class="hype-content" style="cursor: pointer;" onclick="handleProfileClick('${match.user_id}')">
                            <div class="hype-header">
                                <span class="hype-name">${escapedName}</span>
                                <span class="hype-time">%${match.match_score} Eşleşme</span>
                            </div>
                            <div class="hype-text">
                                ${formattedReason}
                            </div>
                        </div>
                        <button class="hype-message-btn" onclick="event.stopPropagation(); handleMessageButtonClick('${match.user_id}', '${escapedName}', '${escapedImageUrl}')" title="Mesaj Gönder">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                    </div>
                `;
                container.innerHTML += cardHTML;
            });
        } else {
            // Eşleşme yoksa
            if (empty) {
                empty.style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Eşleşme yükleme hatası:', error);
        if (empty) {
            empty.style.display = 'flex';
        }
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// Global fonksiyon olarak export et
window.loadHypeMatches = loadHypeMatches;

// Story'den profil detaylarını aç
window.handleStoryProfileClick = async function(storyId, userId) {
    let storyUserId = userId;
    
    // user_id yoksa veritabanından al
    if (!storyUserId && storyId) {
        try {
            const { data: storyData } = await supabase
                .from('stories')
                .select('user_id')
                .eq('id', storyId)
                .single();
            if (storyData && storyData.user_id) {
                storyUserId = storyData.user_id;
            }
        } catch (error) {
            console.error('Story user_id alınamadı:', error);
        }
    }
    
    if (!storyUserId) {
        showAlert('Kullanıcı bilgisi bulunamadı.', 'Bilgi', 'info');
        return;
    }
    
    // user_id'den profile_id'yi bul
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', storyUserId)
            .single();
        
        if (profile && profile.id) {
            // Profil detaylarını aç
            if (typeof handleProfileClick === 'function') {
                handleProfileClick(profile.id);
            } else {
                showAlert('Profil detayları açılamadı.', 'Hata', 'error');
            }
        } else {
            showAlert('Profil bulunamadı.', 'Bilgi', 'info');
        }
    } catch (error) {
        console.error('Profil bulunamadı:', error);
        showAlert('Profil bulunamadı.', 'Bilgi', 'info');
    }
};

// Mesaj butonuna tıklama (Premium kontrolü ile)
window.handleMessageButtonClick = async function(userId, username, avatar) {
    // Premium kontrolü
    const isPremium = await checkUserIsPremium();
    if (!isPremium) {
        showAlert('Mesaj göndermek için Premium üyelik gereklidir. Premium paketlerimize göz atabilirsiniz.', 'Premium Gerekli', 'warning');
        // Premium sayfasına yönlendirme butonu göster
        setTimeout(() => {
            if (confirm('Premium paketlerimizi görmek ister misiniz?')) {
                // Premium modal'ını aç veya sayfaya yönlendir
                if (typeof openPremiumModal === 'function') {
                    openPremiumModal();
                } else {
                    window.location.hash = '#premium';
                }
            }
        }, 500);
        return;
    }
    
    // Premium ise DM modal'ını aç
    openDMModal(userId, username, avatar);
};

// DM Modal Fonksiyonları
let currentDMUserId = null;
let currentDMUsername = null;
let currentDMAvatar = null;
let dmRealtimeChannel = null;
let unreadMessageCheckInterval = null;

// DM Modal'ı Aç
window.openDMModal = async function(userId, username, avatar) {
    const modal = document.getElementById('dm-modal');
    const messagesContainer = document.getElementById('dm-messages-container');
    const dmUsername = document.getElementById('dm-username');
    const dmAvatar = document.getElementById('dm-avatar');
    const messageInput = document.getElementById('dm-message-input');
    const sendBtn = document.getElementById('dm-send-btn');
    
    if (!modal) return;
    
    // Premium kontrolü
    const isPremium = await checkUserIsPremium();
    if (!isPremium) {
        showAlert('Mesaj göndermek için Premium üyelik gereklidir. Premium paketlerimize göz atabilirsiniz.', 'Premium Gerekli', 'warning');
        // Premium sayfasına yönlendirme butonu göster
        setTimeout(() => {
            if (confirm('Premium paketlerimizi görmek ister misiniz?')) {
                // Premium modal'ını aç veya sayfaya yönlendir
                if (typeof openPremiumModal === 'function') {
                    openPremiumModal();
                } else {
                    window.location.hash = '#premium';
                }
            }
        }, 500);
        return;
    }
    
    // Kullanıcı bilgilerini kaydet
    currentDMUserId = userId;
    currentDMUsername = username;
    currentDMAvatar = avatar || 'https://via.placeholder.com/40';
    
    // Modal'ı göster
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Header bilgilerini güncelle
    if (dmUsername) dmUsername.textContent = username;
    if (dmAvatar) {
        dmAvatar.src = currentDMAvatar;
        dmAvatar.alt = username;
    }
    
    // Mesajları yükle
    await loadDMMessages(userId);
    
    // Realtime subscription başlat
    startDMRealtimeSubscription(userId);
    
    // Mesajları okundu işaretle
    markMessagesAsRead(userId);
    
    // Input'a focus ver
    if (messageInput) {
        setTimeout(() => {
            messageInput.focus();
        }, 100);
    }
    
    // Enter tuşu ile mesaj gönderme
    if (messageInput) {
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendDM();
            }
        };
    }
};

// DM Modal'ı Kapat
window.closeDMModal = function() {
    const modal = document.getElementById('dm-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Realtime subscription'ı kapat
    stopDMRealtimeSubscription();
    
    currentDMUserId = null;
    currentDMUsername = null;
    currentDMAvatar = null;
};

// DM Mesajlarını Yükle
async function loadDMMessages(userId) {
    const messagesContainer = document.getElementById('dm-messages-container');
    if (!messagesContainer) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Mesajları Supabase'den çek
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true })
            .limit(100);
        
        if (error) {
            console.error('Mesaj yükleme hatası:', error);
            messagesContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Mesajlar yüklenemedi.</div>';
            return;
        }
        
        // Mesajları göster
        messagesContainer.innerHTML = '';
        
        if (messages && messages.length > 0) {
            const userAvatar = await getCurrentUserAvatar();
            messages.forEach(message => {
                const isSent = message.sender_id === user.id;
                appendMessageToUI(message, isSent, userAvatar);
            });
            
            // En alta scroll
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            // İlk mesaj buz kıranı göster
            showIceBreaker(messagesContainer, userId);
        }
    } catch (error) {
        console.error('Mesaj yükleme hatası:', error);
        messagesContainer.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Mesajlar yüklenemedi.</div>';
    }
}

// Mesaj Gönder
window.sendDM = async function() {
    const messageInput = document.getElementById('dm-message-input');
    const sendBtn = document.getElementById('dm-send-btn');
    const messagesContainer = document.getElementById('dm-messages-container');
    
    if (!messageInput || !currentDMUserId) return;
    
    const messageText = messageInput.value.trim();
    if (!messageText) return;
    
    // Premium kontrolü
    const isPremium = await checkUserIsPremium();
    if (!isPremium) {
        showAlert('Mesaj göndermek için Premium üyelik gereklidir. Premium paketlerimize göz atabilirsiniz.', 'Premium Gerekli', 'warning');
        // Premium sayfasına yönlendirme butonu göster
        setTimeout(() => {
            if (confirm('Premium paketlerimizi görmek ister misiniz?')) {
                // Premium modal'ını aç veya sayfaya yönlendir
                if (typeof openPremiumModal === 'function') {
                    openPremiumModal();
                } else {
                    window.location.hash = '#premium';
                }
            }
        }, 500);
        return;
    }
    
    // Butonu devre dışı bırak
    if (sendBtn) sendBtn.disabled = true;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showAlert('Mesaj göndermek için giriş yapmalısınız.', 'Uyarı', 'warning');
            if (sendBtn) sendBtn.disabled = false;
            return;
        }
        
        // Mesajı Supabase'e kaydet
        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    sender_id: user.id,
                    receiver_id: currentDMUserId,
                    content: messageText
                }
            ])
            .select()
            .single();
        
        if (error) {
            console.error('Mesaj gönderme hatası:', error);
            showAlert('Mesaj gönderilemedi. Lütfen tekrar deneyin.', 'Hata', 'error');
            return;
        }
        
        // Input'u temizle
        messageInput.value = '';
        
        // Mesajı UI'a ekle
        const userAvatar = await getCurrentUserAvatar();
        const messageHTML = `
            <div class="dm-message sent">
                <img src="${userAvatar}" 
                     alt="" 
                     class="dm-message-avatar"
                     onerror="this.src='https://via.placeholder.com/32'">
                <div class="dm-message-content">
                    <div class="dm-message-bubble">${escapeHtml(messageText)}</div>
                    <div class="dm-message-time">${formatMessageTime(new Date().toISOString())}</div>
                </div>
            </div>
        `;
        messagesContainer.innerHTML += messageHTML;
        
        // En alta scroll
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        showAlert('Mesaj gönderilemedi. Lütfen tekrar deneyin.', 'Hata', 'error');
    } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (messageInput) messageInput.focus();
    }
};

// Yardımcı Fonksiyonlar
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} sa önce`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function getCurrentUserAvatar() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'https://via.placeholder.com/32';
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('image_url')
            .eq('user_id', user.id)
            .single();
        
        return profile?.image_url || 'https://via.placeholder.com/32';
    } catch (error) {
        return 'https://via.placeholder.com/32';
    }
}

// Mesajı UI'a ekle (Realtime için)
async function appendMessageToUI(message, isSent, userAvatar) {
    const messagesContainer = document.getElementById('dm-messages-container');
    if (!messagesContainer) return;
    
    const avatar = isSent ? (userAvatar || await getCurrentUserAvatar()) : currentDMAvatar;
    const messageHTML = `
        <div class="dm-message ${isSent ? 'sent' : 'received'}">
            <img src="${avatar}" 
                 alt="" 
                 class="dm-message-avatar"
                 onerror="this.src='https://via.placeholder.com/32'">
            <div class="dm-message-content">
                <div class="dm-message-bubble">${escapeHtml(message.content)}</div>
                <div class="dm-message-time">${formatMessageTime(message.created_at)}</div>
            </div>
        </div>
    `;
    messagesContainer.innerHTML += messageHTML;
    
    // En alta scroll
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// İlk mesaj buz kıranı göster
async function showIceBreaker(container, userId) {
    try {
        // Eşleşme bilgisini al
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Kullanıcının profil bilgilerini al
        const { data: myProfile } = await supabase
            .from('profiles')
            .select('city_name, district')
            .eq('user_id', user.id)
            .single();
        
        // Karşı tarafın profil bilgilerini al
        const { data: otherProfile } = await supabase
            .from('profiles')
            .select('city_name, district')
            .eq('user_id', userId)
            .single();
        
        let iceBreakerText = '';
        let iceBreakerButtons = [];
        
        // Ortak noktaları bul
        if (myProfile && otherProfile) {
            if (myProfile.district && otherProfile.district && myProfile.district === otherProfile.district) {
                iceBreakerText = `Selam! Ortak noktanız: ${myProfile.district} İlçesi 👋`;
                iceBreakerButtons = [
                    { text: '👋 Selam ver', message: 'Selam! 👋' },
                    { text: '📍 Neredesin?', message: `Merhaba! ${myProfile.district}'de misin?` }
                ];
            } else if (myProfile.city_name && otherProfile.city_name && myProfile.city_name === otherProfile.city_name) {
                iceBreakerText = `Selam! Ortak noktanız: ${myProfile.city_name} Şehri 👋`;
                iceBreakerButtons = [
                    { text: '👋 Selam ver', message: 'Selam! 👋' },
                    { text: '📍 Neredesin?', message: `Merhaba! ${myProfile.city_name}'de misin?` }
                ];
            } else {
                iceBreakerText = 'İlk mesajı sen gönder! 👋';
                iceBreakerButtons = [
                    { text: '👋 Selam ver', message: 'Selam! 👋' },
                    { text: '💬 Nasılsın?', message: 'Merhaba! Nasılsın?' }
                ];
            }
        } else {
            iceBreakerText = 'İlk mesajı sen gönder! 👋';
            iceBreakerButtons = [
                { text: '👋 Selam ver', message: 'Selam! 👋' },
                { text: '💬 Nasılsın?', message: 'Merhaba! Nasılsın?' }
            ];
        }
        
        const iceBreakerHTML = `
            <div class="dm-ice-breaker">
                <p class="dm-ice-breaker-text">${iceBreakerText}</p>
                <div class="dm-ice-breaker-buttons">
                    ${iceBreakerButtons.map(btn => `
                        <button class="dm-ice-breaker-btn" onclick="sendIceBreakerMessage('${escapeHtml(btn.message)}')">
                            ${btn.text}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        container.innerHTML = iceBreakerHTML;
    } catch (error) {
        console.error('Ice breaker hatası:', error);
        container.innerHTML = '<div style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">Henüz mesaj yok. İlk mesajı sen gönder!</div>';
    }
}

// Buz kıran mesaj gönder
window.sendIceBreakerMessage = function(message) {
    const messageInput = document.getElementById('dm-message-input');
    if (messageInput) {
        messageInput.value = message;
        sendDM();
    }
};

// Realtime Subscription Başlat
async function startDMRealtimeSubscription(userId) {
    // Önceki subscription'ı kapat
    stopDMRealtimeSubscription();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Yeni channel oluştur
    dmRealtimeChannel = supabase
        .channel(`dm_${userId}_${user.id}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${userId}))`
        }, async (payload) => {
            const newMessage = payload.new;
            const isSent = newMessage.sender_id === user.id;
            
            // Sadece alınan mesajları göster (gönderilenler zaten UI'da)
            if (!isSent && currentDMUserId === userId) {
                const userAvatar = await getCurrentUserAvatar();
                appendMessageToUI(newMessage, false, userAvatar);
                
                // Mesajı okundu işaretle
                markMessagesAsRead(userId);
                
                // Okunmamış mesaj sayısını güncelle
                updateUnreadMessageBadge();
            } else if (!isSent) {
                // Modal kapalıysa badge'i güncelle
                updateUnreadMessageBadge();
            }
        })
        .subscribe();
}

// Realtime Subscription Durdur
function stopDMRealtimeSubscription() {
    if (dmRealtimeChannel) {
        supabase.removeChannel(dmRealtimeChannel);
        dmRealtimeChannel = null;
    }
}

// Mesajları Okundu İşaretle
async function markMessagesAsRead(userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('sender_id', userId)
            .eq('receiver_id', user.id)
            .is('read_at', null);
        
        // Badge'i güncelle
        updateUnreadMessageBadge();
    } catch (error) {
        console.error('Mesaj okundu işaretleme hatası:', error);
    }
}

// Okunmamış Mesaj Badge'ini Güncelle
async function updateUnreadMessageBadge() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            hideUnreadBadge();
            return;
        }
        
        const { data: count, error } = await supabase.rpc('get_unread_message_count');
        
        if (error) {
            console.error('Okunmamış mesaj sayısı hatası:', error);
            return;
        }
        
        const badge = document.getElementById('hypee-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Badge güncelleme hatası:', error);
    }
}

// Badge'i gizle
function hideUnreadBadge() {
    const badge = document.getElementById('hypee-badge');
    if (badge) {
        badge.style.display = 'none';
    }
}

// Periyodik olarak okunmamış mesaj sayısını kontrol et (10 saniyede bir)
function startUnreadMessageChecker() {
    // Önceki interval'i temizle
    if (unreadMessageCheckInterval) {
        clearInterval(unreadMessageCheckInterval);
    }
    
    // İlk kontrolü yap
    updateUnreadMessageBadge();
    
    // Her 10 saniyede bir kontrol et
    unreadMessageCheckInterval = setInterval(() => {
        updateUnreadMessageBadge();
    }, 10000);
}

// Sayfa yüklendiğinde badge kontrolünü başlat
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Kullanıcı giriş yaptıysa kontrolü başlat
        setTimeout(() => {
            startUnreadMessageChecker();
        }, 2000);
    });
}

// Modal dışına tıklanınca kapat
document.addEventListener('click', (e) => {
    const dmModal = document.getElementById('dm-modal');
    if (dmModal && !dmModal.classList.contains('hidden')) {
        if (e.target === dmModal) {
            closeDMModal();
        }
    }
});
