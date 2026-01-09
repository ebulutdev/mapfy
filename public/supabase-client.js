// Supabase Client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Environment variables'ı al
// window.ENV objesi HTML'deki async script tarafından set edilir
function getSupabaseConfig() {
    // Production'da (Vercel) API endpoint'ten gelen değerleri kullan
    if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
        return {
            url: window.ENV.SUPABASE_URL,
            key: window.ENV.SUPABASE_ANON_KEY
        };
    }
    
    // Local development için fallback (sadece localhost için)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
        // Local development - environment variables yoksa boş döndür
        // Kullanıcı .env.local dosyası oluşturabilir veya Vercel Environment Variables kullanabilir
        return {
            url: '',
            key: ''
        };
    }
    
    // Production'da environment variable yoksa boş döndür
    return {
        url: '',
        key: ''
    };
}

// Supabase client instance (lazy initialization)
// ÖNEMLİ: Sadece tek bir instance olsun (çift başlatma önleme)
let supabaseInstance = null;
let isInitializing = false;

// Environment variables yüklenene kadar bekle ve client'ı oluştur
function initSupabase() {
    // Çift başlatma önleme
    if (supabaseInstance) {
        return supabaseInstance;
    }
    
    // Eğer zaten başlatılıyorsa bekle
    if (isInitializing) {
        // Başlatma tamamlanana kadar bekle
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (supabaseInstance) {
                    clearInterval(checkInterval);
                    resolve(supabaseInstance);
                }
            }, 50);
        });
    }
    
    isInitializing = true;
    
    const config = getSupabaseConfig();
    
    if (!config.url || !config.key) {
        // Environment variables henüz yüklenmedi, ENV yüklenene kadar bekle
        console.log('⏳ Environment variables bekleniyor...');
        
        // ENV yüklendi event'ini dinle
        const envLoadedHandler = () => {
            const newConfig = getSupabaseConfig();
            if (newConfig.url && newConfig.key) {
                supabaseInstance = createClient(newConfig.url, newConfig.key);
                console.log('✅ Supabase client initialized with environment variables');
                isInitializing = false;
                window.removeEventListener('env-loaded', envLoadedHandler);
            }
        };
        
        window.addEventListener('env-loaded', envLoadedHandler);
        
        // Fallback: Eğer ENV event gelmezse, interval ile kontrol et
        let retryCount = 0;
        const maxRetries = 60; // 6 saniye (60 * 100ms)
        
        const checkInterval = setInterval(() => {
            const newConfig = getSupabaseConfig();
            if (newConfig.url && newConfig.key) {
                clearInterval(checkInterval);
                window.removeEventListener('env-loaded', envLoadedHandler);
                if (!supabaseInstance) {
                    supabaseInstance = createClient(newConfig.url, newConfig.key);
                    console.log('✅ Supabase client initialized (fallback)');
                }
                isInitializing = false;
            } else if (retryCount >= maxRetries) {
                clearInterval(checkInterval);
                window.removeEventListener('env-loaded', envLoadedHandler);
                console.error('❌ SUPABASE_ANON_KEY environment variable bulunamadı!');
                console.error('Vercel Dashboard > Settings > Environment Variables bölümünden SUPABASE_URL ve SUPABASE_ANON_KEY ekleyin.');
                // Boş bir client oluştur (hata yönetimi için)
                supabaseInstance = createClient('', '');
                isInitializing = false;
            }
            retryCount++;
        }, 100);
        
        // İlk kontrolü hemen yap
        const immediateConfig = getSupabaseConfig();
        if (immediateConfig.url && immediateConfig.key) {
            clearInterval(checkInterval);
            window.removeEventListener('env-loaded', envLoadedHandler);
            supabaseInstance = createClient(immediateConfig.url, immediateConfig.key);
            console.log('✅ Supabase client initialized (immediate)');
            isInitializing = false;
        }
    } else {
        supabaseInstance = createClient(config.url, config.key);
        console.log('✅ Supabase client initialized');
        isInitializing = false;
    }
    
    return supabaseInstance;
}

// Initialize - ENV yüklendikten sonra
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // ENV yüklendi event'ini bekle veya hemen başlat
        if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
            initSupabase();
        } else {
            window.addEventListener('env-loaded', () => {
                initSupabase();
            }, { once: true });
        }
    });
} else {
    // DOM zaten yüklü
    if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
        initSupabase();
    } else {
        window.addEventListener('env-loaded', () => {
            initSupabase();
        }, { once: true });
    }
}

// Export supabase client
export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!supabaseInstance) {
            initSupabase();
        }
        return supabaseInstance ? supabaseInstance[prop] : undefined;
    }
});
