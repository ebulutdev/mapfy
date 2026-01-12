// ========================================
// PERFORMANCE OPTIMIZATION - CACHING & PRELOADING
// ========================================
// Bu dosya profil önbellekleme ve hikaye preloading sistemlerini içerir
// Sayfa yüklenme hızını artırmak için RAM önbelleği kullanır

// Supabase import (global window.supabase veya module import)
let supabaseInstance = null;

// Supabase instance'ını al (hem module hem global desteği için)
function getSupabase() {
    if (supabaseInstance) return supabaseInstance;
    
    // Module import denemesi
    if (typeof window !== 'undefined' && window.supabase) {
        supabaseInstance = window.supabase;
        return supabaseInstance;
    }
    
    // Fallback: Dynamic import
    console.warn('⚠️ Supabase instance bulunamadı, performance cache çalışmayabilir');
    return null;
}

// Global Profil Önbelleği (RAM Cache)
// Bir profil bir kez yüklendiğinde, sayfa yenilenene kadar tekrar sunucudan istenmez
const profileCache = new Map();

/**
 * Profil bilgisini önbellekten veya Supabase'den getir
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<Object|null>} Profil bilgisi veya null
 */
async function getProfileCached(userId) {
    if (!userId) return null;
    
    // 1. Eğer hafızada varsa direkt oradan ver (0 sn gecikme)
    if (profileCache.has(userId)) {
        return profileCache.get(userId);
    }

    // 2. Yoksa Supabase'den çek
    const supabase = getSupabase();
    if (!supabase) {
        console.warn('⚠️ Supabase bulunamadı, profil önbellekleme devre dışı');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, user_id, name, image_url, city_name, district')
            .eq('user_id', userId)
            .single();

        if (data && !error) {
            // 3. Hafızaya kaydet
            profileCache.set(userId, data);
            return data;
        }
    } catch (error) {
        console.warn('Profil önbellekleme hatası:', error);
    }
    
    return null;
}

/**
 * Önbelleği temizle (sayfa yenilendiğinde veya logout'ta kullanılabilir)
 */
function clearProfileCache() {
    profileCache.clear();
}

/**
 * Belirli bir kullanıcının profilini önbellekten kaldır
 * @param {string} userId - Kullanıcı ID'si
 */
function removeProfileFromCache(userId) {
    if (userId) {
        profileCache.delete(userId);
    }
}

// Hikaye Medyalarını Preload (Önceden Yükleme)
// Instagram hikayeleri neden hızlı geçer? Çünkü sen 1. hikayeyi izlerken, 
// o arkada gizlice 2. hikayeyi indirir.

const preloadedMedia = new Set(); // Yüklenen medyaları takip et

/**
 * Bir sonraki hikayeyi önceden yükle (preload)
 * @param {number} currentIndex - Mevcut hikaye indeksi
 * @param {Array} allStories - Tüm hikayeler listesi
 */
function preloadNextStory(currentIndex, allStories) {
    if (!allStories || allStories.length === 0) return;
    
    const nextIndex = currentIndex + 1;
    if (nextIndex >= allStories.length) return; // Son hikayede preload yok
    
    const nextStory = allStories[nextIndex];
    if (!nextStory || !nextStory.mediaUrl) return;
    
    // Eğer zaten yüklendiyse tekrar yükleme
    if (preloadedMedia.has(nextStory.mediaUrl)) return;
    
    try {
        // Media URL'ini kontrol et (resim mi video mu?)
        const mediaUrl = nextStory.mediaUrl.toLowerCase();
        const isVideo = mediaUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/);
        
        if (isVideo) {
            // Video için preload
            const video = document.createElement('video');
            video.preload = 'auto';
            video.src = nextStory.mediaUrl;
            video.style.display = 'none';
            document.body.appendChild(video);
            
            video.addEventListener('loadeddata', () => {
                preloadedMedia.add(nextStory.mediaUrl);
                document.body.removeChild(video);
            });
            
            video.addEventListener('error', () => {
                document.body.removeChild(video);
            });
        } else {
            // Resim için preload
            const img = new Image();
            img.src = nextStory.mediaUrl; // Tarayıcı bunu önbelleğe alır
            
            img.onload = () => {
                preloadedMedia.add(nextStory.mediaUrl);
            };
            
            img.onerror = () => {
                // Hata durumunda sessizce devam et
            };
        }
    } catch (error) {
        // Preload hatası olursa sessizce devam et
        console.warn('Hikaye preload hatası:', error);
    }
}

/**
 * Preload önbelleğini temizle
 */
function clearPreloadCache() {
    preloadedMedia.clear();
}

// Export functions (ES6 modules için)
// Eğer app.js veya stories.js'de kullanmak istersen:
// import { getProfileCached, preloadNextStory } from './performance-cache.js';

// Global scope'a da ekle (mevcut kod yapısıyla uyumlu olması için)
if (typeof window !== 'undefined') {
    window.getProfileCached = getProfileCached;
    window.clearProfileCache = clearProfileCache;
    window.removeProfileFromCache = removeProfileFromCache;
    window.preloadNextStory = preloadNextStory;
    window.clearPreloadCache = clearPreloadCache;
}
