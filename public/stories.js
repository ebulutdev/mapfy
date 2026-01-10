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

// Stories DOM elementlerini al
function initStoriesElements() {
    storiesContainer = document.getElementById('stories-container');
    storiesWrapper = document.getElementById('stories-wrapper');
    myStoryItem = document.getElementById('my-story-item');
    myStoryAvatar = document.getElementById('my-story-avatar');
    storyInput = document.getElementById('storyInput');
    
    // Mouse wheel desteği - Masaüstü için yatay kaydırma
    initStoriesWheelSupport();
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

        // 2. Akıllı Fonksiyonu (RPC) Çağırıyoruz
        // "Benim konumum Bursa/Yıldırım, buna göre sırala getir" diyoruz.
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

// Hikaye Görüntüle (Tam Ekran Modal)
async function viewStory(storyId, mediaUrl, username, priorityLevel = 3) {
    // Tüm hikayeleri bul (storiesWrapper'dan)
    const allStoryItems = Array.from(storiesWrapper.querySelectorAll('.story-item'));
    currentStoriesList = [];
    
    allStoryItems.forEach((item, index) => {
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr) {
            // onclick="viewStory('id', 'url', 'username', priority)" formatından parse et
            const match = onclickAttr.match(/viewStory\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"](?:,\s*(\d+))?\)/);
            if (match) {
                currentStoriesList.push({
                    id: match[1],
                    mediaUrl: match[2],
                    username: match[3],
                    priorityLevel: match[4] ? parseInt(match[4]) : 3,
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
    
    if (!storyViewerModal) return;
    
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
    storyViewerTime.textContent = 'Az önce'; // İleride zaman hesaplanabilir
    
    // Çöp kutusu butonunu kontrol et - Sadece kullanıcının kendi hikayesinde görünsün
    if (storyDeleteBtn) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Hikayenin sahibini kontrol et
                const { data: storyData } = await supabase
                    .from('stories')
                    .select('user_id')
                    .eq('id', story.id)
                    .single();
                
                if (storyData && storyData.user_id === user.id) {
                    // Kullanıcının kendi hikayesi - çöp kutusunu göster
                    storyDeleteBtn.style.display = 'flex';
                    storyDeleteBtn.setAttribute('data-story-id', story.id);
                } else {
                    // Başkasının hikayesi - çöp kutusunu gizle
                    storyDeleteBtn.style.display = 'none';
                    storyDeleteBtn.removeAttribute('data-story-id');
                }
            } else {
                // Giriş yapmamış - çöp kutusunu gizle
                storyDeleteBtn.style.display = 'none';
                storyDeleteBtn.removeAttribute('data-story-id');
            }
        } catch (error) {
            console.error('Hikaye sahibi kontrolü hatası:', error);
            storyDeleteBtn.style.display = 'none';
        }
    }
    
    // Otomatik geçiş timer'ını başlat
    startStoryTimer();
}

// Story Viewer'ı Kapat
function closeStoryViewer() {
    console.log('🔴 closeStoryViewer() çağrıldı!');
    
    const storyViewerModal = document.getElementById('story-viewer-modal');
    console.log('Modal element:', storyViewerModal);
    
    if (storyViewerModal) {
        storyViewerModal.classList.add('hidden');
        document.body.style.overflow = '';
        console.log('✅ Modal gizlendi');
    } else {
        console.error('❌ Modal element bulunamadı!');
    }
    
    // Çöp kutusu butonunu gizle
    const storyDeleteBtn = document.getElementById('story-viewer-delete-btn');
    if (storyDeleteBtn) {
        storyDeleteBtn.style.display = 'none';
        storyDeleteBtn.removeAttribute('data-story-id');
        storyDeleteBtn.disabled = false;
        storyDeleteBtn.style.opacity = '1';
    }
    
    // Timer'ları temizle
    stopStoryTimer();
    
    // State'i sıfırla
    isPaused = false;
    pausedElapsed = 0;
    
    console.log('✅ Story viewer kapatıldı');
}

// Otomatik Geçiş Timer'ı Başlat
function startStoryTimer() {
    stopStoryTimer(); // Önceki timer'ı temizle
    
    const duration = 10000; // 10 saniye
    let elapsed = pausedElapsed; // Kaldığı yerden devam et
    const interval = 50; // Her 50ms'de bir güncelle
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
                pausedElapsed = (currentWidth / 100) * 10000; // 10 saniyenin yüzdesi
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

// Sonraki Hikaye
function nextStory() {
    // Global state'i kontrol et (Hypee'den gelebilir)
    const storiesList = window.currentStoriesList || currentStoriesList;
    if (!storiesList || storiesList.length === 0) return;
    
    pausedElapsed = 0; // Yeni hikayeye geçerken sıfırla
    const currentIdx = window.currentStoryIndex !== undefined ? window.currentStoryIndex : currentStoryIndex;
    const nextIdx = (currentIdx + 1) % storiesList.length;
    
    // State'i güncelle
    window.currentStoryIndex = nextIdx;
    currentStoryIndex = nextIdx;
    
    openStoryViewer(storiesList[nextIdx]);
}

// Önceki Hikaye
function prevStory() {
    // Global state'i kontrol et (Hypee'den gelebilir)
    const storiesList = window.currentStoriesList || currentStoriesList;
    if (!storiesList || storiesList.length === 0) return;
    
    pausedElapsed = 0; // Yeni hikayeye geçerken sıfırla
    const currentIdx = window.currentStoryIndex !== undefined ? window.currentStoryIndex : currentStoryIndex;
    const prevIdx = (currentIdx - 1 + storiesList.length) % storiesList.length;
    
    // State'i güncelle
    window.currentStoryIndex = prevIdx;
    currentStoryIndex = prevIdx;
    
    openStoryViewer(storiesList[prevIdx]);
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
    console.log('🔧 Story Viewer init başlatılıyor...');
    
    const storyViewerClose = document.getElementById('story-viewer-close');
    const storyViewerModal = document.getElementById('story-viewer-modal');
    const storyNavPrev = document.getElementById('story-nav-prev');
    const storyNavNext = document.getElementById('story-nav-next');
    const storyContentWrapper = document.querySelector('.story-content-wrapper');
    
    console.log('Story Viewer Elementler:', {
        closeBtn: !!storyViewerClose,
        modal: !!storyViewerModal,
        navPrev: !!storyNavPrev,
        navNext: !!storyNavNext,
        contentWrapper: !!storyContentWrapper
    });
    
    // Kapat butonu - Hem direkt hem de delegated event listener
    if (storyViewerClose) {
        console.log('✅ Kapat butonu bulundu, event listener ekleniyor...');
        
        // Önce mevcut listener'ları temizle (çift ekleme önleme)
        const newCloseBtn = storyViewerClose.cloneNode(true);
        storyViewerClose.parentNode.replaceChild(newCloseBtn, storyViewerClose);
        
        // Yeni event listener ekle
        document.getElementById('story-viewer-close').addEventListener('click', function(e) {
            console.log('🔴 Kapat butonuna tıklandı!');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeStoryViewer();
            return false;
        }, true); // Capture phase'de çalışsın
        
        // Alternatif: Direkt onclick (yedek)
        document.getElementById('story-viewer-close').onclick = function(e) {
            console.log('🔴 Kapat butonu (onclick) tıklandı!');
            e.preventDefault();
            e.stopPropagation();
            closeStoryViewer();
            return false;
        };
    } else {
        console.error('❌ Kapat butonu bulunamadı!');
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
    
    // Önceki hikaye
    if (storyNavPrev) {
        storyNavPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            prevStory();
        });
    }
    
    // Sonraki hikaye
    if (storyNavNext) {
        storyNavNext.addEventListener('click', (e) => {
            e.stopPropagation();
            nextStory();
        });
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
    
    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
        if (storyViewerModal && !storyViewerModal.classList.contains('hidden')) {
            if (e.key === 'Escape') {
                closeStoryViewer();
            } else if (e.key === 'ArrowLeft') {
                prevStory();
            } else if (e.key === 'ArrowRight') {
                nextStory();
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                // Boşluk tuşu ile durdur/devam et
                e.preventDefault();
                if (isPaused) {
                    resumeStoryTimer();
                } else {
                    pauseStoryTimer();
                }
            }
        }
    });
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
    
    // Loading göster
    if (loading) loading.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    if (grid) grid.innerHTML = '';
    
    // Hikayeleri yükle
    await loadHypeeDiscoverStories();
    
    // Loading gizle
    if (loading) loading.style.display = 'none';
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
        
        // 2. Akıllı Fonksiyonu (RPC) Çağırıyoruz - Tüm hikayeleri öncelik sırasına göre al
        const { data: stories, error } = await supabase
            .rpc('get_nearby_stories', {
                my_city: myCity || null,
                my_district: myDistrict || null
            });
        
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
                mediaUrl: s.media_url,
                username: s.username,
                avatar: s.avatar_url, // Avatar bilgisini de taşıyalım
                priorityLevel: s.priority_level || 3,
                time: s.created_at ? new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Az önce' // Saat bilgisi
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
        if (firstStory && typeof window.openStoryViewer === 'function') {
            window.openStoryViewer({
                id: firstStory.id,
                mediaUrl: firstStory.mediaUrl,
                username: firstStory.username,
                priorityLevel: firstStory.priorityLevel,
                avatar: firstStory.avatar, // Avatar bilgisini de geçelim
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
