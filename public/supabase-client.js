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
let supabaseInstance = null;

// Environment variables yüklenene kadar bekle ve client'ı oluştur
function initSupabase() {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    
    const config = getSupabaseConfig();
    
    if (!config.url || !config.key) {
        // Environment variables henüz yüklenmedi, bir süre bekle
        let retryCount = 0;
        const maxRetries = 30; // 3 saniye (30 * 100ms)
        
        const checkInterval = setInterval(() => {
            const newConfig = getSupabaseConfig();
            if (newConfig.url && newConfig.key) {
                clearInterval(checkInterval);
                supabaseInstance = createClient(newConfig.url, newConfig.key);
                console.log('✅ Supabase client initialized with environment variables');
            } else if (retryCount >= maxRetries) {
                clearInterval(checkInterval);
                console.error('❌ SUPABASE_ANON_KEY environment variable bulunamadı!');
                console.error('Vercel Dashboard > Settings > Environment Variables bölümünden SUPABASE_URL ve SUPABASE_ANON_KEY ekleyin.');
                // Boş bir client oluştur (hata yönetimi için)
                supabaseInstance = createClient('', '');
            }
            retryCount++;
        }, 100);
        
        // İlk kontrolü hemen yap
        const immediateConfig = getSupabaseConfig();
        if (immediateConfig.url && immediateConfig.key) {
            clearInterval(checkInterval);
            supabaseInstance = createClient(immediateConfig.url, immediateConfig.key);
            console.log('✅ Supabase client initialized');
        }
    } else {
        supabaseInstance = createClient(config.url, config.key);
        console.log('✅ Supabase client initialized');
    }
    
    return supabaseInstance;
}

// Initialize immediately
initSupabase();

// Export supabase client
export const supabase = new Proxy({}, {
    get(target, prop) {
        if (!supabaseInstance) {
            initSupabase();
        }
        return supabaseInstance ? supabaseInstance[prop] : undefined;
    }
});
