// Supabase Import
import { supabase } from './supabase-client.js';

// Map state
let mapState = {
    scale: 1,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    selectedCity: null,
    // Momentum/inertia scrolling
    velocityX: 0,
    velocityY: 0,
    lastTouchTime: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    animationFrame: null,
    isMomentumScrolling: false,
    // Touch state
    touchStartTime: 0,
    touchMoved: false,
    pinchDistance: 0,
    pinchCenterX: 0,
    pinchCenterY: 0,
    // Snapchat-style profiles
    profiles: [],
    // Cities from map
    cities: []
};

// DOM elements
const svg = document.getElementById('svg-turkey');
const mapContainer = document.getElementById('map-container');
const loading = document.getElementById('loading');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const resetZoomBtn = document.getElementById('reset-zoom');

// Modal elements
const addProfileBtn = document.getElementById('add-profile-btn');
const addProfileModal = document.getElementById('add-profile-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const photoInput = document.getElementById('photo-input');
const photoUploadArea = document.getElementById('photo-upload-area');
const uploadPreview = document.getElementById('upload-preview');
const cropCanvas = document.getElementById('crop-canvas');
const cropControls = document.getElementById('crop-controls');
const cropApplyBtn = document.getElementById('crop-apply');
const cropCancelBtn = document.getElementById('crop-cancel');
const usernameInput = document.getElementById('username-input');
const cityInput = document.getElementById('city-input');
const citySuggestions = document.getElementById('city-suggestions');
const districtInput = document.getElementById('district-input');
const ageInput = document.getElementById('age-input');
const snapchatInput = document.getElementById('snapchat-input');
const instagramInput = document.getElementById('instagram-input');
const facebookInput = document.getElementById('facebook-input');
const twitterInput = document.getElementById('twitter-input');
const pinterestInput = document.getElementById('pinterest-input');
const profileDetailModal = document.getElementById('profile-detail-modal');
const closeDetailModalBtn = document.getElementById('close-detail-modal');

// Filter elements
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const genderAllBtn = document.getElementById('gender-all');
const genderMaleBtn = document.getElementById('gender-male');
const genderFemaleBtn = document.getElementById('gender-female');
const ageMinInput = document.getElementById('age-min');
const ageMaxInput = document.getElementById('age-max');
const filterCityInput = document.getElementById('filter-city');
const filterDistrictInput = document.getElementById('filter-district');
const citySuggestionsFilter = document.getElementById('city-suggestions-filter');
const filterResultsList = document.getElementById('filter-results-list');
const resultsCount = document.getElementById('results-count');
const searchFilterBtn = document.getElementById('search-filter-btn');
const filterSidebar = document.getElementById('filter-sidebar');
const toggleFilterBtn = document.getElementById('toggle-filter-btn');
const filterResultsArea = document.querySelector('.filter-results-area');
const filterResizeHandle = document.getElementById('filter-resize-handle');
const filterResizeHandleVertical = document.getElementById('filter-resize-handle-vertical');
const filterToggleIcon = document.getElementById('filter-toggle-icon');

// Profile gender buttons
const profileGenderMaleBtn = document.getElementById('profile-gender-male');
const profileGenderFemaleBtn = document.getElementById('profile-gender-female');

// Auth elements (lazy loading - DOMContentLoaded'da set edilecek)
let authModal, closeAuthModalBtn, googleSignInBtn, loginBtn;
let userProfileDropdown, userProfileLink, userAvatar, userName, editProfileBtn, logoutBtn;
let editProfileModal, closeEditModalBtn, cancelEditBtn, saveEditBtn, deleteProfileBtn;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMap();
    setupEventListeners();
    setupModalListeners();
    setupHeroListeners();
    setupNavbarListeners();
    
    // Auth elements - DOM yüklendikten sonra seç
    authModal = document.getElementById('auth-modal');
    closeAuthModalBtn = document.getElementById('close-auth-modal');
    googleSignInBtn = document.getElementById('google-signin-btn');
    loginBtn = document.getElementById('login-btn');
    userProfileDropdown = document.getElementById('user-profile-dropdown');
    userProfileLink = document.getElementById('user-profile-link');
    userAvatar = document.getElementById('user-avatar');
    userName = document.getElementById('user-name');
    editProfileBtn = document.getElementById('edit-profile-btn');
    logoutBtn = document.getElementById('logout-btn');
    
    // Edit profile elements
    editProfileModal = document.getElementById('edit-profile-modal');
    closeEditModalBtn = document.getElementById('close-edit-modal');
    cancelEditBtn = document.getElementById('cancel-edit-btn');
    saveEditBtn = document.getElementById('save-edit-btn');
    deleteProfileBtn = document.getElementById('delete-profile-btn');
    
    // Setup auth and edit profile listeners
    setupAuthListeners();
    setupEditProfileListeners();
    setupHeroListeners();
    
    // Check auth state
    checkAuthState();
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            checkAuthState();
        } else if (event === 'SIGNED_OUT') {
            checkAuthState();
        }
    });
    
    // Initialize filter icon state
    if (filterSidebar && filterToggleIcon) {
        const isCollapsed = filterSidebar.classList.contains('collapsed');
        if (!isCollapsed) {
            filterToggleIcon.classList.add('active');
        }
    }
    
    // Initialize filter gender button state
    if (genderAllBtn) {
        genderAllBtn.classList.add('active');
    }
    
    // Initialize filter visibility
    updateFilterVisibility();
});

// Load SVG Map
async function loadMap() {
    try {
        // Gerçek SVG dosyasını yükle - önce turk.svg, sonra turkey.svg dene
        // Opera uyumluluğu için try-catch ile
        let response;
        let svgText;
        
        try {
            response = await fetch('/turk.svg', {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    'Accept': 'image/svg+xml'
                }
            });
            if (response && response.ok) {
                svgText = await response.text();
            } else {
                throw new Error('turk.svg yüklenemedi: ' + (response ? response.status : 'No response'));
            }
        } catch (e) {
            console.log('turk.svg yüklenemedi, turkey.svg deneniyor...', e);
            try {
                response = await fetch('/turkey.svg', {
                    method: 'GET',
                    cache: 'no-cache',
                    headers: {
                        'Accept': 'image/svg+xml'
                    }
                });
                if (response && response.ok) {
                    svgText = await response.text();
                } else {
                    throw new Error('turkey.svg yüklenemedi: ' + (response ? response.status : 'No response'));
                }
            } catch (e2) {
                console.error('Her iki SVG dosyası da yüklenemedi:', e2);
                throw new Error('SVG dosyası yüklenemedi: ' + (e2.message || 'Bilinmeyen hata'));
            }
        }
        
        if (!svgText || svgText.trim().length === 0) {
            throw new Error('SVG dosyası boş');
        }
        
        // SVG içeriğini parse et - Opera uyumluluğu için
        const parser = new DOMParser();
        let svgDoc;
        try {
            svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        } catch (parseError) {
            // Opera için alternatif parse yöntemi
            console.warn('DOMParser hatası, alternatif yöntem deneniyor:', parseError);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = svgText;
            const svgElement = tempDiv.querySelector('svg');
            if (!svgElement) {
                throw new Error('SVG elementi bulunamadı');
            }
            // SVG'yi manuel olarak parse et
            svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null);
            svgDoc.documentElement.innerHTML = svgElement.innerHTML;
            svgDoc.documentElement.setAttribute('viewBox', svgElement.getAttribute('viewBox') || '0 0 1005 490');
        }
        
        // Parse hatası kontrolü
        const parserError = svgDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('SVG parse hatası: ' + parserError.textContent);
        }
        
        const svgContent = svgDoc.documentElement;
        
        // SVG'nin içeriğini al (viewBox'ı koru)
        const viewBox = svgContent.getAttribute('viewBox') || '0 0 1005 490';
        svg.setAttribute('viewBox', viewBox);
        
        // Stil ekle
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = `
            .province {
                fill: #e8f4f8;
                stroke: #ffffff;
                stroke-width: 1.5;
                cursor: pointer;
                transition: all 0.2s ease;
                vector-effect: non-scaling-stroke;
            }
            .province:hover {
                fill: #FFD700;
                stroke: #FFA500;
                stroke-width: 2;
                filter: drop-shadow(0 5px 15px rgba(255, 215, 0, 0.5));
            }
            .province.selected {
                fill: #4CAF50;
                stroke: #2E7D32;
                stroke-width: 2.5;
                filter: drop-shadow(0 5px 20px rgba(76, 175, 80, 0.6));
            }
        `;
        svg.appendChild(style);
        
        // İçeriği kopyala - turkey grubunu bul
        const turkeyGroup = svgDoc.querySelector('g.turkey');
        if (turkeyGroup) {
            // Defs'e 3D gradient'ler ekle
            let defs = svg.querySelector('defs');
            if (!defs) {
                defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                svg.insertBefore(defs, svg.firstChild);
            }
            
            // 3D kara efekti için gradient
            const landGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
            landGradient.id = 'land-3d-gradient';
            landGradient.setAttribute('x1', '0%');
            landGradient.setAttribute('y1', '0%');
            landGradient.setAttribute('x2', '100%');
            landGradient.setAttribute('y2', '100%');
            
            const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop1.setAttribute('offset', '0%');
            stop1.setAttribute('stop-color', '#3d3d3d');
            stop1.setAttribute('stop-opacity', '1');
            
            const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop2.setAttribute('offset', '50%');
            stop2.setAttribute('stop-color', '#2d2d2d');
            stop2.setAttribute('stop-opacity', '1');
            
            const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
            stop3.setAttribute('offset', '100%');
            stop3.setAttribute('stop-color', '#252525');
            stop3.setAttribute('stop-opacity', '1');
            
            landGradient.appendChild(stop1);
            landGradient.appendChild(stop2);
            landGradient.appendChild(stop3);
            
            // Eğer zaten yoksa ekle
            if (!svg.querySelector('#land-3d-gradient')) {
                defs.appendChild(landGradient);
            }
            
            // Transform grubunu oluştur
            const provincesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            provincesGroup.id = 'turkey-provinces';
            provincesGroup.setAttribute('transform', `translate(${mapState.translateX}, ${mapState.translateY}) scale(${mapState.scale})`);
            
            // Tüm il gruplarını kopyala (id'si olan g elementleri)
            const cityGroups = Array.from(turkeyGroup.children).filter(el => 
                el.tagName === 'g' && el.hasAttribute('id')
            );
            
            // Şehir listesini oluştur
            mapState.cities = [];
            
            cityGroups.forEach(cityGroup => {
                // Her il grubunu kopyala
                const clonedGroup = cityGroup.cloneNode(true);
                const cityId = cityGroup.getAttribute('id');
                clonedGroup.setAttributeNS(null, 'id', cityId);
                
                // Şehir bilgilerini al
                const cityName = cityGroup.getAttribute('data-city-name') || 
                                cityId.charAt(0).toUpperCase() + cityId.slice(1);
                
                // Şehir listesine ekle
                mapState.cities.push({
                    id: cityId.toLowerCase(),
                    name: cityName
                });
                
                // Path'leri bul ve class ekle
                const paths = clonedGroup.querySelectorAll('path');
                paths.forEach(path => {
                    // SVG namespace'inde class ekleme
                    const currentClass = path.getAttribute('class') || '';
                    const newClass = currentClass ? `${currentClass} province` : 'province';
                    path.setAttribute('class', newClass);
                    
                    // 3D efekt için gradient fill
                    path.setAttribute('fill', 'url(#land-3d-gradient)');
                    
                    path.setAttribute('data-name', cityName);
                });
                
                provincesGroup.appendChild(clonedGroup);
            });
            
            // Şehirleri isme göre sırala
            mapState.cities.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
            
            console.log(`${mapState.cities.length} şehir haritadan yüklendi`);
            
            svg.appendChild(provincesGroup);
            
            // Tüm şehir path'lerine event listener ekle
            setTimeout(() => {
                const provinces = svg.querySelectorAll('path.province');
                provinces.forEach(province => {
                    province.addEventListener('click', handleCityClick);
                });
                console.log(`${provinces.length} il yüklendi`);
            }, 100);
            
            // NOT: Profiller hero sayfasındayken yüklenmeyecek
            // Profiller sadece "Haritayı Keşfet" butonuna basıldığında yüklenecek
            console.log('✓ Harita yüklendi. Profiller "Haritayı Keşfet" butonuna basıldığında yüklenecek.');
        } else {
            throw new Error('Turkey grubu bulunamadı');
        }
        
        // Loading'i gizle - Opera uyumluluğu için hem class hem style
        if (loading) {
        loading.classList.add('hidden');
            loading.style.display = 'none';
        }
    } catch (error) {
        console.error('SVG yükleme hatası:', error);
        console.error('Hata detayları:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        if (loading) {
        loading.textContent = 'Harita yüklenirken hata oluştu: ' + error.message;
        }
        
        // Fallback: eski yöntemi kullan
        try {
            const svgContent = generateTurkeyMapSVG();
            svg.innerHTML = svgContent;
            
            // Fallback için şehir listesini oluştur
            const fallbackProvinces = getAllProvincePaths();
            mapState.cities = [
                { id: 'istanbul', name: 'İstanbul' },
                { id: 'ankara', name: 'Ankara' },
                { id: 'izmir', name: 'İzmir' },
                { id: 'antalya', name: 'Antalya' },
                { id: 'bursa', name: 'Bursa' },
                { id: 'adana', name: 'Adana' },
                { id: 'gaziantep', name: 'Gaziantep' },
                { id: 'konya', name: 'Konya' },
                { id: 'trabzon', name: 'Trabzon' },
                { id: 'samsun', name: 'Samsun' },
                { id: 'eskisehir', name: 'Eskişehir' },
                { id: 'kayseri', name: 'Kayseri' },
                { id: 'mugla', name: 'Muğla' },
                { id: 'denizli', name: 'Denizli' },
                { id: 'mardin', name: 'Mardin' }
            ];
            mapState.cities.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
            
            const provinces = svg.querySelectorAll('.province');
            provinces.forEach(province => {
                province.addEventListener('click', handleCityClick);
            });
            
            // Loading'i gizle - fallback başarılı sonrası
            if (loading) {
            loading.classList.add('hidden');
                loading.style.display = 'none';
            }
        } catch (fallbackError) {
            console.error('Fallback de başarısız:', fallbackError);
            // Son çare: Loading'i gizle ve hata mesajı göster
            if (loading) {
                loading.textContent = 'Harita yüklenemedi. Lütfen sayfayı yenileyin.';
                loading.style.color = '#ff4444';
                // 5 saniye sonra gizle
                setTimeout(() => {
                    if (loading) {
                        loading.classList.add('hidden');
                        loading.style.display = 'none';
                    }
                }, 5000);
            }
        }
    }
}

// Generate Turkey Map SVG with all provinces
function generateTurkeyMapSVG() {
    return `
        <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
            </linearGradient>
        </defs>
        
        <linearGradient id="land-3d-gradient-fallback" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3d3d3d;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#2d2d2d;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#252525;stop-opacity:1" />
        </linearGradient>
        
        <style>
            .province {
                fill: url(#land-3d-gradient-fallback);
                stroke: #FFD700;
                stroke-width: 1.8;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                vector-effect: non-scaling-stroke;
                filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.4))
                        drop-shadow(0 2px 6px rgba(255, 215, 0, 0.3));
            }
            .province:hover {
                stroke: #FFD700;
                stroke-width: 2.5;
                filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.6))
                        drop-shadow(0 4px 12px rgba(255, 215, 0, 0.5));
            }
            .province.selected {
                stroke: #FFD700;
                stroke-width: 3;
                filter: drop-shadow(0 8px 25px rgba(0, 0, 0, 0.7))
                        drop-shadow(0 6px 15px rgba(255, 215, 0, 0.7));
            }
        </style>

        <g id="turkey-provinces" transform="translate(${mapState.translateX}, ${mapState.translateY}) scale(${mapState.scale})">
            ${getAllProvincePaths()}
        </g>

        <g id="cyprus-island">
            <path id="kibris" data-name="Kıbrıs" class="province" 
                  d="M172.5,58.7l-4.8-1.5l-3.3,1.2l-2.4-0.6l-2.7-3l-5.1-0.9l-1.8,1.2l-3.6-0.3l-2.7,2.1l-6.3-0.3l-3.9,2.4l-2.4-1.2l-3-4.8l-1.8-0.9l-4.8,2.1l-2.7,3.9l-4.5,1.2l-1.5,2.4l2.1,1.5l0.6,3.6l4.2,0.9l1.8,3.9l6,1.2l1.8-0.9l2.7,1.2l5.1-0.6l3.3,1.8l3,1.2l3.9-1.2l2.4,0.9l2.4-0.9l3.3-3.6l3.3,0.3l2.4-1.8l3.6-0.9l3.3,0.9l3.3-1.8l2.4-0.3l1.8-2.4L172.5,58.7z">
            </path>
        </g>
    `;
}

// Get all province paths (Türkiye'nin tüm illeri)
function getAllProvincePaths() {
    // Türkiye'nin ana şehirleri için detaylı SVG path'ler
    const provinces = [
        { 
            id: 'istanbul', 
            name: 'İstanbul', 
            path: 'M420,85l15,3l18,8l12,15l-5,22l-15,18l-20,8l-25,2l-18,-8l-12,-15l-3,-20l8,-15l15,-10l18,-5z' 
        },
        { 
            id: 'ankara', 
            name: 'Ankara', 
            path: 'M370,185l25,8l20,12l15,18l-5,25l-20,18l-25,8l-22,-5l-15,-18l-3,-22l10,-18l18,-12l18,-5z' 
        },
        { 
            id: 'izmir', 
            name: 'İzmir', 
            path: 'M250,215l22,8l18,12l10,20l-8,25l-18,20l-25,10l-22,-8l-15,-18l-5,-22l12,-20l20,-10l20,-5z' 
        },
        { 
            id: 'antalya', 
            name: 'Antalya', 
            path: 'M310,320l25,10l20,15l12,22l-10,28l-22,22l-28,12l-25,-10l-18,-22l-5,-25l15,-25l25,-12l22,-8z' 
        },
        { 
            id: 'bursa', 
            name: 'Bursa', 
            path: 'M395,135l20,5l15,10l10,18l-8,22l-18,15l-22,8l-20,-5l-12,-18l-3,-20l10,-18l18,-8l18,-3z' 
        },
        { 
            id: 'adana', 
            name: 'Adana', 
            path: 'M400,315l28,8l22,15l15,22l-12,28l-25,25l-30,12l-28,-10l-20,-22l-5,-28l18,-28l28,-15l25,-10z' 
        },
        { 
            id: 'gaziantep', 
            name: 'Gaziantep', 
            path: 'M490,295l30,10l25,18l18,25l-15,30l-28,28l-32,15l-30,-12l-22,-25l-8,-30l20,-32l32,-18l28,-12z' 
        },
        { 
            id: 'konya', 
            name: 'Konya', 
            path: 'M340,255l28,10l25,15l18,22l-12,30l-25,25l-30,12l-28,-10l-20,-22l-5,-28l15,-28l28,-15l26,-10z' 
        },
        { 
            id: 'trabzon', 
            name: 'Trabzon', 
            path: 'M560,155l25,8l18,12l12,20l-10,25l-20,20l-25,10l-22,-8l-15,-18l-5,-22l12,-20l22,-10l20,-5z' 
        },
        { 
            id: 'samsun', 
            name: 'Samsun', 
            path: 'M480,125l22,8l18,10l12,18l-10,22l-18,18l-22,10l-20,-8l-15,-18l-5,-20l12,-20l20,-10l18,-5z' 
        },
        { 
            id: 'eskisehir', 
            name: 'Eskişehir', 
            path: 'M350,165l22,8l18,10l12,18l-10,22l-18,15l-22,8l-20,-8l-12,-18l-3,-20l10,-18l18,-8l18,-3z' 
        },
        { 
            id: 'kayseri', 
            name: 'Kayseri', 
            path: 'M420,235l25,10l20,12l15,20l-12,25l-22,22l-27,10l-25,-10l-18,-20l-5,-25l15,-25l25,-12l22,-8z' 
        },
        { 
            id: 'mugla', 
            name: 'Muğla', 
            path: 'M280,285l22,10l18,12l12,20l-10,25l-20,20l-25,10l-22,-10l-15,-20l-5,-22l12,-22l22,-12l20,-8z' 
        },
        { 
            id: 'denizli', 
            name: 'Denizli', 
            path: 'M300,250l22,8l18,10l12,18l-10,22l-18,18l-22,10l-20,-8l-15,-18l-5,-20l12,-20l20,-10l18,-5z' 
        },
        { 
            id: 'mardin', 
            name: 'Mardin', 
            path: 'M540,350l28,12l22,18l18,25l-15,30l-28,28l-32,15l-30,-15l-22,-25l-8,-30l18,-32l32,-20l28,-15z' 
        },
    ];

    return provinces.map(p => 
        `<path id="${p.id}" data-name="${p.name}" class="province" d="${p.path}"></path>`
    ).join('');
}

// Event Listeners
function setupEventListeners() {
    // Mouse drag (desktop)
    mapContainer.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // Touch events (mobile) - unified handler
    mapContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    mapContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
    mapContainer.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Zoom buttons with haptic feedback simulation
    zoomInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = mapContainer.getBoundingClientRect();
        zoom(1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    zoomOutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = mapContainer.getBoundingClientRect();
        zoom(0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    resetZoomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetView();
    });

    // Mouse wheel zoom
    mapContainer.addEventListener('wheel', handleWheel, { passive: false });

    // Keyboard shortcuts (desktop only)
    document.addEventListener('keydown', handleKeyboard);
}

// Navbar Event Listeners
function setupNavbarListeners() {
    // Logo - Ana sayfaya dön
    const navbarBrand = document.querySelector('.navbar-brand');
    if (navbarBrand) {
        navbarBrand.addEventListener('click', (e) => {
            e.preventDefault();
            showHeroSection();
        });
    }
    
    // Keşfet linki - Haritaya git
    const navDiscover = document.getElementById('nav-discover');
    if (navDiscover) {
        navDiscover.addEventListener('click', (e) => {
            e.preventDefault();
            showMapView();
        });
    }
    
    // Nasıl Çalışır? linki - Scroll to pricing section
    const navHowItWorks = document.getElementById('nav-how-it-works');
    if (navHowItWorks) {
        navHowItWorks.addEventListener('click', (e) => {
            e.preventDefault();
            const pricingSection = document.querySelector('.pricing-section');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    // Premium linki - Scroll to pricing section
    const navPremium = document.getElementById('nav-premium');
    if (navPremium) {
        navPremium.addEventListener('click', (e) => {
            e.preventDefault();
            const pricingSection = document.querySelector('.pricing-section');
            if (pricingSection) {
                pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    // Ücretsiz Başla butonu
    const signupBtn = document.getElementById('signup-btn');
    if (signupBtn) {
        signupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const user = await getCurrentUser();
            if (!user) {
                openAuthModal();
            } else {
                // Kullanıcı zaten giriş yapmış, profil oluşturma modalını aç
                const hasProfile = await checkUserHasProfile(user.id);
                if (hasProfile) {
                    await showAlert('Zaten bir profiliniz var. Profil ayarlarından düzenleyebilirsiniz.', 'Bilgi', 'info');
                    openEditProfileModal();
                } else {
                    openAddProfileModal();
                }
            }
        });
    }
    
    // Yardım dropdown linkleri
    const helpLink = document.getElementById('help-link');
    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLegalModal('faq');
        });
    }
    
    // Gizlilik Politikası
    const privacyLink = document.getElementById('privacy-link');
    if (privacyLink) {
        privacyLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLegalModal('privacy');
        });
    }
    
    // Çerezler
    const cookiesLink = document.getElementById('cookies-link');
    if (cookiesLink) {
        cookiesLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLegalModal('cookies');
        });
    }
    
    // Şartlar (Kullanım Koşulları)
    const termsLink = document.getElementById('terms-link');
    if (termsLink) {
        termsLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLegalModal('terms');
        });
    }
    
    // Topluluk Kuralları
    const communityLink = document.getElementById('community-link');
    if (communityLink) {
        communityLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLegalModal('community');
        });
    }
    
    // İade Politikası
    const refundLink = document.getElementById('refund-link');
    if (refundLink) {
        refundLink.addEventListener('click', (e) => {
            e.preventDefault();
            openLegalModal('refund');
        });
    }
    
    // Şikayet
    const reportLink = document.getElementById('report-link');
    if (reportLink) {
        reportLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Şikayet modalı açılabilir veya sayfa yönlendirmesi yapılabilir
            showAlert('Şikayet formu yakında eklenecek.', 'Bilgi', 'info');
        });
    }
}

// Modal Event Listeners
function setupModalListeners() {
    // Add profile button - önce auth kontrolü yap
    if (addProfileBtn) {
        addProfileBtn.addEventListener('click', async () => {
            const user = await getCurrentUser();
            if (!user) {
                openAuthModal();
            } else {
                // Kullanıcının zaten profili var mı kontrol et
                const hasProfile = await checkUserHasProfile(user.id);
                if (hasProfile) {
                    await showAlert('Zaten bir profiliniz var. Profil ayarlarından düzenleyebilirsiniz.', 'Bilgi', 'info');
                    openEditProfileModal();
                } else {
                    openAddProfileModal();
                }
            }
        });
    }
    
    // Close modal buttons
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeAddProfileModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeAddProfileModal);
    }
    if (closeDetailModalBtn) {
        closeDetailModalBtn.addEventListener('click', closeProfileDetailModal);
    }
    
    // Geri Butonları
    const backAddProfileBtn = document.getElementById('back-add-profile');
    const backProfileDetailBtn = document.getElementById('back-profile-detail');
    const backAuthModalBtn = document.getElementById('back-auth-modal');
    const backEditProfileBtn = document.getElementById('back-edit-profile');
    const backReportModalBtn = document.getElementById('back-report-modal');
    const backLegalModalBtn = document.getElementById('back-legal-modal');
    const backFilterBtn = document.getElementById('back-filter');
    
    if (backAddProfileBtn) {
        backAddProfileBtn.addEventListener('click', closeAddProfileModal);
    }
    if (backProfileDetailBtn) {
        backProfileDetailBtn.addEventListener('click', closeProfileDetailModal);
    }
    if (backAuthModalBtn) {
        backAuthModalBtn.addEventListener('click', closeAuthModal);
    }
    if (backEditProfileBtn) {
        backEditProfileBtn.addEventListener('click', closeEditProfileModal);
    }
    if (backReportModalBtn) {
        backReportModalBtn.addEventListener('click', closeReportModal);
    }
    if (backLegalModalBtn) {
        backLegalModalBtn.addEventListener('click', closeLegalModal);
    }
    if (backFilterBtn) {
        backFilterBtn.addEventListener('click', () => {
            // Filtre sidebar'ı kapat
            const filterSidebar = document.getElementById('filter-sidebar');
            if (filterSidebar) {
                filterSidebar.style.width = '0px';
                filterSidebar.style.display = 'none';
            }
        });
    }
    
    // Report modal
    const closeReportBtn = document.getElementById('close-report-modal');
    const submitReportBtn = document.getElementById('submit-report-btn');
    const reportModal = document.getElementById('report-modal');
    
    if (closeReportBtn) {
        closeReportBtn.addEventListener('click', closeReportModal);
    }
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', submitReport);
    }
    if (reportModal) {
        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) {
                closeReportModal();
            }
        });
    }
    
    // Legal modal
    const closeLegalBtn = document.getElementById('close-legal-modal');
    const legalModal = document.getElementById('legal-modal');
    
    if (closeLegalBtn) {
        closeLegalBtn.addEventListener('click', closeLegalModal);
    }
    if (legalModal) {
        legalModal.addEventListener('click', (e) => {
            if (e.target === legalModal) {
                closeLegalModal();
            }
        });
    }
    
    // Ana Sayfaya Git Butonu
    const goToHomepageBtn = document.getElementById('go-to-homepage-btn');
    if (goToHomepageBtn) {
        goToHomepageBtn.addEventListener('click', () => {
            // Modalı kapat
            closeProfileDetailModal();
            
            // URL'i temizle
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Hero section'ı göster (eğer gizliyse)
            const heroSection = document.getElementById('hero-section');
            if (heroSection && heroSection.classList.contains('hidden')) {
                showHeroSection();
            }
            
            // Haritayı başlangıç konumuna getir
            mapState.scale = 1;
            mapState.translateX = 0;
            mapState.translateY = 0;
            updateTransform();
        });
    }
    
    // Modal overlay click to close
    if (addProfileModal) {
        addProfileModal.addEventListener('click', (e) => {
            if (e.target === addProfileModal) {
                closeAddProfileModal();
            }
        });
    }
    if (profileDetailModal) {
        profileDetailModal.addEventListener('click', (e) => {
            if (e.target === profileDetailModal) {
                closeProfileDetailModal();
            }
        });
    }
    
    // Photo upload
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoSelect);
    }
    if (photoUploadArea) {
        photoUploadArea.addEventListener('click', () => photoInput?.click());
    }
    
    // Crop controls
    if (cropApplyBtn) {
        cropApplyBtn.addEventListener('click', applyCrop);
    }
    if (cropCancelBtn) {
        cropCancelBtn.addEventListener('click', cancelCrop);
    }
    
    // Profile gender selection
    if (profileGenderMaleBtn) {
        profileGenderMaleBtn.addEventListener('click', () => selectProfileGender('male'));
    }
    if (profileGenderFemaleBtn) {
        profileGenderFemaleBtn.addEventListener('click', () => selectProfileGender('female'));
    }
    
    // Filter listeners
    if (genderAllBtn) {
        genderAllBtn.addEventListener('click', () => selectFilterGender('all'));
    }
    if (genderMaleBtn) {
        genderMaleBtn.addEventListener('click', () => selectFilterGender('male'));
    }
    if (genderFemaleBtn) {
        genderFemaleBtn.addEventListener('click', () => selectFilterGender('female'));
    }
    
    if (ageMinInput) {
        ageMinInput.addEventListener('input', applyFilters);
    }
    if (ageMaxInput) {
        ageMaxInput.addEventListener('input', applyFilters);
    }
    if (filterCityInput) {
        filterCityInput.addEventListener('input', handleFilterCityInput);
    }
    if (filterDistrictInput) {
        filterDistrictInput.addEventListener('input', applyFilters);
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    
    // Search filter button
    if (searchFilterBtn) {
        searchFilterBtn.addEventListener('click', applyFilters);
    }
    
    // Filter toggle icon (open/close sidebar from map)
    if (filterToggleIcon) {
        filterToggleIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (filterSidebar) {
                // Mobilde expanded class'ını kontrol et
                if (window.innerWidth <= 768) {
                    const isExpanded = filterSidebar.classList.contains('expanded');
                    if (isExpanded) {
                        // Kapat
                        filterSidebar.classList.remove('expanded');
                        filterSidebar.style.height = '0';
                        filterToggleIcon.classList.remove('active');
                        if (toggleFilterBtn) toggleFilterBtn.textContent = 'Göster';
                        const mobileBtn = document.getElementById('mobile-filter-toggle');
                        if (mobileBtn) {
                            const span = mobileBtn.querySelector('span');
                            if (span) span.textContent = 'Filtrele';
                        }
                    } else {
                        // Aç
                        filterSidebar.classList.add('expanded');
                        filterSidebar.style.height = '45vh';
                        filterToggleIcon.classList.add('active');
                        if (toggleFilterBtn) toggleFilterBtn.textContent = 'Gizle';
                        const mobileBtn = document.getElementById('mobile-filter-toggle');
                        if (mobileBtn) {
                            const span = mobileBtn.querySelector('span');
                            if (span) span.textContent = 'Kapat';
                        }
                    }
                } else {
                    // Desktop'ta collapsed class'ını kontrol et
                    const isCollapsed = filterSidebar.classList.contains('collapsed');
                    if (isCollapsed) {
                        filterSidebar.classList.remove('collapsed');
                        filterSidebar.style.width = '380px';
                        filterToggleIcon.classList.add('active');
                        if (toggleFilterBtn) toggleFilterBtn.textContent = 'Gizle';
                    } else {
                        filterSidebar.classList.add('collapsed');
                        // Tamamen gizlemek için genişliği sıfırla
                        filterSidebar.style.width = '0px';
                        filterToggleIcon.classList.remove('active');
                        if (toggleFilterBtn) toggleFilterBtn.textContent = 'Göster';
                    }
                }
            }
        });
    }
    
    // Mobil Filtre Toggle
    const mobileFilterBtn = document.getElementById('mobile-filter-toggle');
    if (mobileFilterBtn && filterSidebar) {
        mobileFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = filterSidebar.classList.contains('expanded');
            if (isExpanded) {
                filterSidebar.classList.remove('expanded');
                filterSidebar.style.height = '0';
                const span = mobileFilterBtn.querySelector('span');
                if (span) span.textContent = 'Filtrele';
                if (toggleFilterBtn) toggleFilterBtn.textContent = 'Göster';
                if (filterToggleIcon) filterToggleIcon.classList.remove('active');
            } else {
                filterSidebar.classList.add('expanded');
                filterSidebar.style.height = '45vh';
                const span = mobileFilterBtn.querySelector('span');
                if (span) span.textContent = 'Kapat';
                if (toggleFilterBtn) toggleFilterBtn.textContent = 'Gizle';
                if (filterToggleIcon) filterToggleIcon.classList.add('active');
            }
        });
    }
    
    // Haritaya tıklayınca filtreyi kapat (Mobilde)
    if (mapContainer && filterSidebar) {
        mapContainer.addEventListener('click', (e) => {
            // Tıklanan yer filtre butonu veya filtre paneli değilse kapat
            if (!e.target.closest('.filter-sidebar') && 
                !e.target.closest('#mobile-filter-toggle') && 
                !e.target.closest('#filter-toggle-icon') &&
                window.innerWidth <= 768) {
                filterSidebar.classList.remove('expanded');
                filterSidebar.style.height = '0';
                const mobileBtn = document.getElementById('mobile-filter-toggle');
                if (mobileBtn) {
                    const span = mobileBtn.querySelector('span');
                    if (span) span.textContent = 'Filtrele';
                }
                if (toggleFilterBtn) toggleFilterBtn.textContent = 'Göster';
                if (filterToggleIcon) filterToggleIcon.classList.remove('active');
            }
        });
    }
    
    // Filter toggle button (collapse/expand from sidebar)
    if (toggleFilterBtn) {
        toggleFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (filterSidebar) {
                // Mobilde expanded class'ını kontrol et
                if (window.innerWidth <= 768) {
                    const isExpanded = filterSidebar.classList.contains('expanded');
                    if (isExpanded) {
                        // Kapat
                        filterSidebar.classList.remove('expanded');
                        filterSidebar.style.height = '0';
                        toggleFilterBtn.textContent = 'Göster';
                        if (filterToggleIcon) filterToggleIcon.classList.remove('active');
                    } else {
                        // Aç
                        filterSidebar.classList.add('expanded');
                        filterSidebar.style.height = '45vh'; // Varsayılan yükseklik
                        toggleFilterBtn.textContent = 'Gizle';
                        if (filterToggleIcon) filterToggleIcon.classList.add('active');
                    }
                } else {
                    // Desktop'ta collapsed class'ını kontrol et
                    const isCollapsed = filterSidebar.classList.contains('collapsed');
                    if (isCollapsed) {
                        filterSidebar.classList.remove('collapsed');
                        filterSidebar.style.width = '380px';
                        toggleFilterBtn.textContent = 'Gizle';
                        if (filterToggleIcon) filterToggleIcon.classList.add('active');
                    } else {
                        filterSidebar.classList.add('collapsed');
                        // Tamamen gizlemek için genişliği sıfırla
                        filterSidebar.style.width = '0px';
                        toggleFilterBtn.textContent = 'Göster';
                        if (filterToggleIcon) filterToggleIcon.classList.remove('active');
                    }
                }
            }
        });
    }
    
    // Resize handle for dragging sidebar width
    if (filterResizeHandle && filterSidebar) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        filterResizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = filterSidebar.offsetWidth;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const diff = startX - e.clientX; // Reverse because sidebar is on the right
            const newWidth = startWidth + diff;
            const minWidth = 250;
            const maxWidth = 600;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                filterSidebar.style.width = newWidth + 'px';
                filterSidebar.classList.remove('collapsed');
            } else if (newWidth < minWidth) {
                filterSidebar.classList.add('collapsed');
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
        
        // Touch support for mobile
        filterResizeHandle.addEventListener('touchstart', (e) => {
            isResizing = true;
            startX = e.touches[0].clientX;
            startWidth = filterSidebar.offsetWidth;
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            
            const diff = startX - e.touches[0].clientX;
            const newWidth = startWidth + diff;
            const minWidth = 250;
            const maxWidth = 600;
            
            if (newWidth >= minWidth && newWidth <= maxWidth) {
                filterSidebar.style.width = newWidth + 'px';
                filterSidebar.classList.remove('collapsed');
            } else if (newWidth < minWidth) {
                filterSidebar.classList.add('collapsed');
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            isResizing = false;
        });
    }
    
    // Vertical Resize (Mobil için yukarı-aşağı sürükleme)
    if (filterResizeHandleVertical && filterSidebar) {
        let isVerticalResizing = false;
        let startY = 0;
        let startHeight = 0;
        
        const handleMouseMove = (e) => {
            if (!isVerticalResizing || window.innerWidth > 768) return;
            
            const diff = startY - e.clientY; // Yukarı çekince yükseklik artar
            const newHeight = startHeight + diff;
            const minHeight = 300;
            const maxHeight = window.innerHeight * 0.9; // Ekranın %90'ı
            
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                filterSidebar.style.height = newHeight + 'px';
                filterSidebar.classList.add('expanded'); // Açık tut
            } else if (newHeight < minHeight) {
                // Minimum yüksekliğin altına düşerse kapat
                filterSidebar.classList.remove('expanded');
                filterSidebar.style.height = '0';
                if (toggleFilterBtn) toggleFilterBtn.textContent = 'Göster';
                if (filterToggleIcon) filterToggleIcon.classList.remove('active');
            }
        };
        
        const handleMouseUp = () => {
            if (isVerticalResizing) {
                isVerticalResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        
        const handleTouchMove = (e) => {
            if (!isVerticalResizing || window.innerWidth > 768) return;
            
            const diff = startY - e.touches[0].clientY; // Yukarı çekince yükseklik artar
            const newHeight = startHeight + diff;
            const minHeight = 300;
            const maxHeight = window.innerHeight * 0.9;
            
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                filterSidebar.style.height = newHeight + 'px';
                filterSidebar.classList.add('expanded'); // Açık tut
            } else if (newHeight < minHeight) {
                // Minimum yüksekliğin altına düşerse kapat
                filterSidebar.classList.remove('expanded');
                filterSidebar.style.height = '0';
                if (toggleFilterBtn) toggleFilterBtn.textContent = 'Göster';
                if (filterToggleIcon) filterToggleIcon.classList.remove('active');
            }
            
            e.preventDefault();
        };
        
        const handleTouchEnd = () => {
            if (isVerticalResizing) {
                isVerticalResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        
        filterResizeHandleVertical.addEventListener('mousedown', (e) => {
            if (window.innerWidth > 768) return;
            isVerticalResizing = true;
            startY = e.clientY;
            startHeight = filterSidebar.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        filterResizeHandleVertical.addEventListener('touchstart', (e) => {
            if (window.innerWidth > 768) return;
            isVerticalResizing = true;
            startY = e.touches[0].clientY;
            startHeight = filterSidebar.offsetHeight;
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
    }
    
    // Drag to scroll for filter results area
    const filterResultsArea = document.querySelector('.filter-results-area');
    if (filterResultsArea) {
        let isDragging = false;
        let startY = 0;
        let scrollTop = 0;
        
        filterResultsArea.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.pageY - filterResultsArea.offsetTop;
            scrollTop = filterResultsArea.scrollTop;
            filterResultsArea.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        filterResultsArea.addEventListener('mouseleave', () => {
            isDragging = false;
            filterResultsArea.style.cursor = 'grab';
        });
        
        filterResultsArea.addEventListener('mouseup', () => {
            isDragging = false;
            filterResultsArea.style.cursor = 'grab';
        });
        
        filterResultsArea.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const y = e.pageY - filterResultsArea.offsetTop;
            const walk = (y - startY) * 2; // Scroll speed multiplier
            filterResultsArea.scrollTop = scrollTop - walk;
        });
        
        // Touch support for mobile
        let touchStartY = 0;
        let touchScrollTop = 0;
        
        filterResultsArea.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].pageY - filterResultsArea.offsetTop;
            touchScrollTop = filterResultsArea.scrollTop;
        }, { passive: true });
        
        filterResultsArea.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].pageY - filterResultsArea.offsetTop;
            const walk = (touchY - touchStartY) * 1.5;
            filterResultsArea.scrollTop = touchScrollTop - walk;
        }, { passive: true });
        
        // Set initial cursor
        filterResultsArea.style.cursor = 'grab';
    }
    
    // City autocomplete
    if (cityInput) {
        cityInput.addEventListener('input', handleCityInput);
        cityInput.addEventListener('focus', handleCityInput);
    }
    
    // Save profile
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
}

// Touch handlers with momentum scrolling
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        // Single touch - prepare for drag
        const touch = e.touches[0];
        mapState.isDragging = false;
        mapState.touchStartTime = Date.now();
        mapState.touchMoved = false;
        mapState.startX = touch.clientX - mapState.translateX;
        mapState.startY = touch.clientY - mapState.translateY;
        mapState.lastTouchX = touch.clientX;
        mapState.lastTouchY = touch.clientY;
        mapState.lastTouchTime = Date.now();
        mapState.velocityX = 0;
        mapState.velocityY = 0;
        
        // Cancel momentum scrolling
        if (mapState.animationFrame) {
            cancelAnimationFrame(mapState.animationFrame);
            mapState.animationFrame = null;
            mapState.isMomentumScrolling = false;
        }
    } else if (e.touches.length === 2) {
        // Two touches - pinch to zoom
        mapState.isDragging = false;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        mapState.pinchDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        mapState.pinchCenterX = (touch1.clientX + touch2.clientX) / 2;
        mapState.pinchCenterY = (touch1.clientY + touch2.clientY) / 2;
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 1 && !mapState.pinchDistance) {
        // Single touch drag
        e.preventDefault();
        const touch = e.touches[0];
        const now = Date.now();
        const deltaTime = now - mapState.lastTouchTime;
        
        if (deltaTime > 0) {
            // Calculate velocity for momentum
            mapState.velocityX = (touch.clientX - mapState.lastTouchX) / deltaTime * 16;
            mapState.velocityY = (touch.clientY - mapState.lastTouchY) / deltaTime * 16;
        }
        
        mapState.translateX = touch.clientX - mapState.startX;
        mapState.translateY = touch.clientY - mapState.startY;
        
        mapState.isDragging = true;
        mapState.touchMoved = true;
        mapContainer.classList.add('dragging');
        
        updateTransform();
        
        mapState.lastTouchX = touch.clientX;
        mapState.lastTouchY = touch.clientY;
        mapState.lastTouchTime = now;
    } else if (e.touches.length === 2) {
        // Pinch to zoom
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        if (mapState.pinchDistance > 0) {
            const scaleFactor = currentDistance / mapState.pinchDistance;
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            zoom(scaleFactor, centerX, centerY);
            mapState.pinchDistance = currentDistance;
        }
    }
}

function handleTouchEnd(e) {
    mapState.pinchDistance = 0;
    
    if (mapState.isDragging && mapState.touchMoved) {
        // Start momentum scrolling if velocity is significant
        const velocityThreshold = 0.1;
        if (Math.abs(mapState.velocityX) > velocityThreshold || Math.abs(mapState.velocityY) > velocityThreshold) {
            startMomentumScrolling();
        }
    }
    
    // Check if it was a tap (not a drag)
    const touchDuration = Date.now() - mapState.touchStartTime;
    if (!mapState.touchMoved && touchDuration < 300) {
        // This was a tap - don't prevent click on province
        setTimeout(() => {
            mapState.isDragging = false;
            mapContainer.classList.remove('dragging');
        }, 50);
    } else {
        mapState.isDragging = false;
        mapContainer.classList.remove('dragging');
    }
    
    mapState.touchMoved = false;
    mapState.velocityX = 0;
    mapState.velocityY = 0;
}

// Momentum scrolling for smooth mobile experience
function startMomentumScrolling() {
    if (mapState.isMomentumScrolling) return;
    
    mapState.isMomentumScrolling = true;
    const friction = 0.92; // Friction factor
    
    function animate() {
        if (!mapState.isMomentumScrolling) return;
        
        mapState.velocityX *= friction;
        mapState.velocityY *= friction;
        
        mapState.translateX += mapState.velocityX;
        mapState.translateY += mapState.velocityY;
        
        updateTransform();
        
        // Stop if velocity is very small
        if (Math.abs(mapState.velocityX) < 0.05 && Math.abs(mapState.velocityY) < 0.05) {
            mapState.isMomentumScrolling = false;
            mapState.animationFrame = null;
        } else {
            mapState.animationFrame = requestAnimationFrame(animate);
        }
    }
    
    mapState.animationFrame = requestAnimationFrame(animate);
}

// Mouse drag functions (desktop)
function startDrag(e) {
    if (e.button !== 0) return; // Only left mouse button
    mapState.isDragging = true;
    mapContainer.classList.add('dragging');
    mapState.startX = e.clientX - mapState.translateX;
    mapState.startY = e.clientY - mapState.translateY;
}

function drag(e) {
    if (!mapState.isDragging) return;
    e.preventDefault();
    mapState.translateX = e.clientX - mapState.startX;
    mapState.translateY = e.clientY - mapState.startY;
    updateTransform();
}

function endDrag() {
    mapState.isDragging = false;
    mapContainer.classList.remove('dragging');
}

// Zoom functions
function zoom(factor, centerX = null, centerY = null) {
    const minScale = 0.7; // Minimum zoom - harita çok küçültülemez
    const maxScale = 8;
    const oldScale = mapState.scale;
    const newScale = Math.max(minScale, Math.min(maxScale, mapState.scale * factor));
    
    // Zoom merkezine göre yapılırsa
    if (centerX !== null && centerY !== null) {
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;
        
        // SVG koordinat sisteminde mouse pozisyonunu hesapla
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = (mouseX - mapState.translateX) / oldScale;
        svgPoint.y = (mouseY - mapState.translateY) / oldScale;
        
        // Yeni scale ile translate'i ayarla (zoom merkezi sabit kalmalı)
        mapState.translateX = mouseX - svgPoint.x * newScale;
        mapState.translateY = mouseY - svgPoint.y * newScale;
    }
    
    mapState.scale = newScale;
    updateTransform();
}

function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoom(delta, e.clientX, e.clientY);
}

function resetView() {
    // Smooth reset animation
    const startScale = mapState.scale;
    const startX = mapState.translateX;
    const startY = mapState.translateY;
    const duration = 300;
    const startTime = Date.now();
    
    // Cancel momentum scrolling
    if (mapState.animationFrame) {
        cancelAnimationFrame(mapState.animationFrame);
        mapState.isMomentumScrolling = false;
    }
    
    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        mapState.scale = startScale + (1 - startScale) * easeOut;
        mapState.translateX = startX * (1 - easeOut);
        mapState.translateY = startY * (1 - easeOut);
        
        updateTransform();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            mapState.scale = 1;
            mapState.translateX = 0;
            mapState.translateY = 0;
            updateTransform();
            updateFilterVisibility();
        }
    }
    
    requestAnimationFrame(animate);
}

function updateTransform() {
    const turkeyProvinces = document.getElementById('turkey-provinces');
    const profilesGroup = document.getElementById('profiles-group');
    
    if (turkeyProvinces) {
        // Use CSS transform for better performance on mobile
        const transform = `translate(${mapState.translateX}px, ${mapState.translateY}px) scale(${mapState.scale})`;
        turkeyProvinces.style.transform = transform;
        turkeyProvinces.setAttribute('transform', 
            `translate(${mapState.translateX}, ${mapState.translateY}) scale(${mapState.scale})`);
    }
    
    // Update profiles group transform - Profillerin şehirlerle birlikte scale edilmesi için
    // Profiller şehirlerle aynı transform'u almalı ki zoom'da yerinden oynamasınlar
    if (profilesGroup) {
        // CSS transform ile SVG transform'u senkronize et
        const transform = `translate(${mapState.translateX}px, ${mapState.translateY}px) scale(${mapState.scale})`;
        profilesGroup.style.transform = transform;
        // SVG transform attribute'u da ekle (fallback için)
        profilesGroup.setAttribute('transform', 
            `translate(${mapState.translateX}, ${mapState.translateY}) scale(${mapState.scale})`);
    }
    
    // Profil boyutlarını zoom seviyesine göre güncelle
    updateProfileSizes();
    
    // Filtre görünürlüğünü zoom seviyesine göre güncelle
    updateFilterVisibility();
}

// City click handler
function handleCityClick(e) {
    // Prevent click if user was dragging
    if (mapState.touchMoved || mapState.isDragging) {
        return;
    }
    
    // Eğer tıklanan element bir profil veya profil içindeyse, şehir tıklamasını iptal et
    const clickedElement = e.target;
    const isProfileClick = clickedElement.closest('.snap-profile') || 
                          clickedElement.classList.contains('snap-profile') ||
                          clickedElement.classList.contains('profile-click-area') ||
                          clickedElement.classList.contains('profile-image') ||
                          clickedElement.classList.contains('profile-border');
    
    if (isProfileClick) {
        // Bu bir profil tıklaması, şehir tıklamasını iptal et
        return;
    }
    
    e.stopPropagation();
    e.preventDefault();
    
    const province = e.currentTarget;
    let cityName = province.getAttribute('data-name');
    
    // Eğer data-name yoksa, parent g elementinden al
    if (!cityName) {
        const parentGroup = province.closest('g[id]');
        if (parentGroup) {
            cityName = parentGroup.getAttribute('data-city-name') || parentGroup.id;
        } else {
            cityName = province.id;
        }
    }

    // Remove previous selection
    document.querySelectorAll('.province.selected').forEach(p => {
        p.classList.remove('selected');
    });

    // Add selection to clicked province
    province.classList.add('selected');
    
    // Aynı ilin tüm path'lerini seçili yap
    const cityGroup = province.closest('g[id]');
    if (cityGroup) {
        const allPaths = cityGroup.querySelectorAll('path.province');
        allPaths.forEach(p => p.classList.add('selected'));
    }
    
    mapState.selectedCity = cityName;
}

// Keyboard shortcuts
function handleKeyboard(e) {
    if (e.key === '+' || (e.key === '=' && e.shiftKey)) {
        const rect = mapContainer.getBoundingClientRect();
        zoom(1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    if (e.key === '-' || e.key === '_') {
        const rect = mapContainer.getBoundingClientRect();
        zoom(0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
    if (e.key === '0' || e.key === 'Home') resetView();
}

// Snapchat-style Profile Functions
// Not: Artık profiller Supabase'den yükleniyor, bu fonksiyon kullanılmıyor
async function addSampleProfiles() {
    // Örnek profil ekleme (test amaçlı)
    // Gerçek kullanımda profiller Supabase'den yüklenecek
    console.log('Profiller Supabase\'den yüklenecek...');
}

// Şehir sınırları içinde şık konum bul (mevcut profillerden uzakta)
// ==================== SPIRAL (SUNFLOWER) DISTRIBUTION ALGORITHM ====================
// Eski findPositionInCity ve findPositionInCityWithSeed fonksiyonları kaldırıldı
// Artık sadece spiral algoritması kullanılıyor

// Şehrin merkezini ve sınırlarını bulur
function getCityGeometry(cityId) {
    if (!cityId || !svg) {
        console.warn(`Geçersiz cityId veya SVG yok: ${cityId}`);
        return null;
    }
    
    // Şehri bul (ID eşleşmesi ile)
    let cityGroup = svg.querySelector(`g[id*="${cityId}" i]`);
    if (!cityGroup) {
        // Tüm grupları kontrol et
        const allGroups = svg.querySelectorAll('g[id]');
        cityGroup = Array.from(allGroups).find(g => {
            const id = g.id.toLowerCase();
            const searchId = cityId.toLowerCase();
            return id === searchId || id.includes(searchId) || searchId.includes(id);
        });
    }
    
    if (!cityGroup) {
        console.warn(`⚠ Şehir bulunamadı: "${cityId}"`);
        // Mevcut tüm şehir ID'lerini logla (debug için)
        const allCityIds = Array.from(svg.querySelectorAll('g[id]')).map(g => g.id);
        console.log('Mevcut şehir ID\'leri:', allCityIds.slice(0, 10), '... (toplam', allCityIds.length, 'şehir)');
        return null;
    }
    
    const path = cityGroup.querySelector('path');
    if (!path) {
        console.warn(`⚠ Şehir path'i bulunamadı: ${cityId}`);
        return null;
    }
    
    try {
        const bbox = path.getBBox();
        
        // Bbox değerlerini kontrol et
        if (!bbox || bbox.width <= 0 || bbox.height <= 0) {
            console.warn(`⚠ Geçersiz bbox: ${cityId}`, bbox);
            return null;
        }
        
        const center = {
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
        };
        
        return {
            pathElement: path,
            bbox: bbox,
            center: center
        };
    } catch (e) {
        console.error(`❌ Bbox hesaplama hatası (${cityId}):`, e);
        return null;
    }
}

// Spiral (Salyangoz) Dağılım Hesaplayıcı - GÜNCELLENMİŞ VERSİYON
// isPointInFill yerine bounding box ve merkezden uzaklaşma mantığı kullanılır.
// index arttıkça merkezden dışarı doğru spiral şeklinde dağılım sağlar
function calculateSpiralPosition(index, center, bbox, pathElement) {
    // 1. İlk kişi her zaman merkeze yakın olsun
    if (index === 0) {
        // Hafif bir sapma (jitter) ekle ki tam üst üste binmesinler
        const jitterX = (Math.random() - 0.5) * 5; 
        const jitterY = (Math.random() - 0.5) * 5;
        return { x: center.x + jitterX, y: center.y + jitterY };
    }

    // 2. Spiral Ayarları
    // Altın oran açısı (~137.5 derece) - Doğal dağılım sağlar
    const angleStep = 2.39996; 
    // Her adımda merkezden ne kadar uzaklaşacağı (pixel)
    const distanceStep = 14; 

    let currentAngle = index * angleStep;
    let currentRadius = 10 + (index * 5); // İlk halka 10px, sonra genişler

    let finalX = center.x;
    let finalY = center.y;
    
    // Güvenlik: Sonsuz döngüden kaçınmak için max deneme
    let attempts = 0;
    const maxAttempts = 50;
    let isValidPosition = false;

    while (!isValidPosition && attempts < maxAttempts) {
        // Polar -> Kartezyen dönüşümü
        const dx = Math.cos(currentAngle) * currentRadius;
        const dy = Math.sin(currentAngle) * currentRadius;

        finalX = center.x + dx;
        finalY = center.y + dy;

        // KONTROL: Şehir sınırları (Bounding Box) içinde mi?
        // bbox: {x, y, width, height}
        // Sınırlara çok yaklaşmasın diye 'padding' kullanıyoruz
        const padding = 5; 
        
        if (finalX >= bbox.x + padding && 
            finalX <= bbox.x + bbox.width - padding &&
            finalY >= bbox.y + padding && 
            finalY <= bbox.y + bbox.height - padding) {
            
            // Eğer kutunun içindeyse kabul et.
            // isPointInFill kullanmıyoruz çünkü tarayıcı desteği zayıf ve hata veriyor.
            isValidPosition = true;
        } else {
            // Sınıra çarptıysa, bir sonraki deneme için açıyı değiştir ve yarıçapı azalt
            currentAngle += 1; 
            currentRadius *= 0.9; // Yarıçapı biraz küçült (içeri çek)
            attempts++;
        }
    }

    // Eğer 50 denemede kutu içinde bir yer bulamazsa (çok dar/küçük bir şehir olabilir)
    // Yine de hesaplanan son noktayı veya merkeze yakın bir yeri döndür
    if (!isValidPosition) {
        console.warn(`⚠ Spiral pozisyon tam oturmadı (index: ${index}), merkeze yakın nokta kullanılıyor`);
        return { 
            x: center.x + (Math.random() - 0.5) * 15, 
            y: center.y + (Math.random() - 0.5) * 15 
        };
    }

    return { x: finalX, y: finalY };
}

function addProfileToMap(profile) {
    // Debug: Profil eklenirken kontrol et
    if (!profile || !profile.x || !profile.y || isNaN(profile.x) || isNaN(profile.y)) {
        console.error('❌ Geçersiz profil verisi:', profile);
        return;
    }
    
    if (!profile.imageUrl) {
        console.error('❌ Profil görseli yok:', profile.id, profile.name);
        return;
    }
    
    // SVG'nin mevcut olduğundan emin ol
    if (!svg) {
        console.error('❌ SVG elementi bulunamadı');
        return;
    }
    
    // Profil grubunu bul veya oluştur
    let profilesGroup = svg.querySelector('#profiles-group');
    
    if (!profilesGroup) {
        profilesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        profilesGroup.id = 'profiles-group';
        profilesGroup.setAttribute('style', 'transform-style: flat; isolation: isolate;');
        svg.appendChild(profilesGroup);
        console.log('✓ Profiles group oluşturuldu');
    } else {
        // [ÖNEMLİ] Zaten varsa, onu DOM'un en sonuna taşı ki haritanın üstünde görünsün
        if (svg.lastElementChild !== profilesGroup) {
            svg.appendChild(profilesGroup);
        }
    }
    
    // Profile base size (küçük Snapchat-style - şık görünüm için)
    const baseSize = 10; // İlk açılışta daha küçük boyut
    profile.baseSize = baseSize;
    
    // Create clip path for circular image
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }
    
    const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
    clipPath.id = `clip-${profile.id}`;
    clipPath.setAttribute('clipPathUnits', 'objectBoundingBox'); // Image koordinatlarına göre
    
    const clipCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clipCircle.setAttribute('cx', '0.5'); // Merkez (0-1 arası)
    clipCircle.setAttribute('cy', '0.5'); // Merkez (0-1 arası)
    clipCircle.setAttribute('r', '0.5'); // Yarıçap (0-1 arası, tam yuvarlak)
    clipPath.appendChild(clipCircle);
    defs.appendChild(clipPath);
    
    // Create profile group
    const profileGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    profileGroup.id = profile.id;
    profileGroup.classList.add('snap-profile');
    profileGroup.setAttribute('data-base-x', profile.x);
    profileGroup.setAttribute('data-base-y', profile.y);
    profileGroup.setAttribute('data-base-size', baseSize);
    
    // Create profile image - yuvarlak kırpılmış
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', profile.imageUrl);
    image.setAttribute('clip-path', `url(#clip-${profile.id})`); // Yuvarlak clip path uygula
    image.setAttribute('class', 'profile-image');
    // Başlangıç pozisyonları - updateProfileSizes() çağrılana kadar görünür olması için
    const imageX = profile.x - baseSize / 2;
    const imageY = profile.y - baseSize / 2;
    image.setAttribute('x', imageX);
    image.setAttribute('y', imageY);
    image.setAttribute('width', baseSize);
    image.setAttribute('height', baseSize);
    // Yüksek kalite için preserveAspectRatio optimize edildi
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice'); // Görseli yuvarlak içine tam oturt
    // Yüksek kalite için image-rendering optimize edildi
    // SVG image için kalite ayarları - pixelated kaldırıldı (kaliteyi düşürüyor)
    // Daha canlı ve net görünüm için filter efektleri eklendi
    image.setAttribute('style', 'image-rendering: -webkit-optimize-contrast; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges; image-rendering: auto; filter: contrast(1.2) saturate(1.25) brightness(1.08); -webkit-filter: contrast(1.2) saturate(1.25) brightness(1.08);');
    
    // Site temasına uyumlu çizgi (yeşil ton)
    const borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    borderCircle.setAttribute('class', 'profile-border');
    borderCircle.setAttribute('fill', 'none'); // İçi boş
    borderCircle.setAttribute('stroke', '#3ECF8E'); // Site temasına uyumlu yeşil çizgi
    borderCircle.setAttribute('stroke-width', '0.35'); // Daha ince çizgi
    borderCircle.setAttribute('opacity', '0.8'); // Hafif şeffaflık
    // Başlangıç pozisyonları
    borderCircle.setAttribute('cx', profile.x);
    borderCircle.setAttribute('cy', profile.y);
    borderCircle.setAttribute('r', baseSize / 2);
    
    // Create invisible clickable circle - sadece profil görselinin boyutu kadar
    // Etrafına basılınca profil açılmasın, sadece profil görseline basılınca açılsın
    const clickArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clickArea.setAttribute('cx', profile.x);
    clickArea.setAttribute('cy', profile.y);
    clickArea.setAttribute('r', baseSize / 2); // Sadece profil görselinin yarıçapı kadar - etrafına basılınca açılmasın
    clickArea.setAttribute('fill', 'transparent');
    clickArea.setAttribute('class', 'profile-click-area');
    clickArea.style.cursor = 'pointer';
    
    profileGroup.appendChild(image);
    profileGroup.appendChild(borderCircle);
    profileGroup.appendChild(clickArea); // Click area en üstte
    
    // Günlük mesaj kutusu ekle (eğer bugünkü mesaj varsa)
    if (profile.daily_message && profile.message_date) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında bugünün tarihi
        const messageDate = new Date(profile.message_date).toISOString().split('T')[0];
        
        // Sadece bugünkü mesajı göster
        if (messageDate === today) {
            const messageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            messageGroup.id = `message-group-${profile.id}`;
            messageGroup.classList.add('profile-message-group');
            
            // Başlangıçta gizli olsun (Zoom kontrolü açacak)
            messageGroup.style.display = 'none'; 
            messageGroup.style.opacity = '0';

            const messageBox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            messageBox.setAttribute('class', 'profile-message-box');
            
            // Native SVG Text kullanıyoruz (iOS Safari için)
            const messageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            messageText.setAttribute('class', 'profile-message-text');
            messageText.textContent = profile.daily_message;
            messageText.setAttribute('text-anchor', 'middle');
            messageText.setAttribute('dominant-baseline', 'middle');
            messageText.setAttribute('dy', '1'); // Optik dikey ortalama için 1px aşağı it
            
            messageGroup.appendChild(messageBox);
            messageGroup.appendChild(messageText);
            profileGroup.appendChild(messageGroup);
        }
    }
    
    // Sadece profil görseline (image, border, click area) tıklanınca açılsın
    // Profile group'a click handler ekleme - sadece direkt elementlere tıklanınca çalışsın
    
    // Image için click handler - sadece profil görseline basılınca
    image.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Profil tıklandı (image):', profile.id, profile.name);
        handleProfileClick(profile.id);
    });
    
    // Border için click handler - sadece profil border'ına basılınca
    borderCircle.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Profil tıklandı (border):', profile.id, profile.name);
        handleProfileClick(profile.id);
    });
    
    // Click area için handler - sadece profil görselinin içine basılınca (etrafına değil)
    // Click area boyutu sadece profil görselinin yarıçapı kadar, zoom'da da aynı
    clickArea.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Profil tıklandı (click area):', profile.id, profile.name);
        handleProfileClick(profile.id);
    });
    
    profilesGroup.appendChild(profileGroup);
    
    // Debug: Profil eklendiğini logla
    console.log(`✓ Profil haritaya eklendi:`, {
        id: profile.id,
        name: profile.name,
        x: profile.x,
        y: profile.y,
        imageX: imageX,
        imageY: imageY,
        baseSize: baseSize,
        profilesGroupExists: !!profilesGroup,
        svgExists: !!svg
    });
    
    // SVG'de görünür olup olmadığını kontrol et
    if (profilesGroup.parentNode !== svg) {
        console.error('❌ Profiles group SVG içinde değil!');
        svg.appendChild(profilesGroup);
    }
    
    // İlk boyutlandırmayı yap - transform uygulandıktan sonra pozisyonları güncelle
    // updateTransform çağrılmalı ki profiles-group transform'u ayarlansın
    if (profilesGroup && profilesGroup.parentNode) {
        // Profiles-group transform'unun ayarlandığından emin ol
        updateTransform();
        // Profil boyutlarını da güncelle
        updateProfileSizes();
    } else {
        // Fallback: sadece profil boyutlarını güncelle
        updateProfileSizes();
    }
}

// Profil ve Mesaj boyutlarını zoom seviyesine göre güncelle
// Profil ve Mesaj boyutlarını güncelle (Netlik için Counter-Scale Yöntemi)
function updateProfileSizes() {
    const profilesGroup = svg.querySelector('#profiles-group');
    if (!profilesGroup) return;
    
    const profiles = profilesGroup.querySelectorAll('.snap-profile');
    
    // Mobil algılama
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // [AYAR] Görünürlük Eşiği (Çok fazla zoom yapıldığında göster)
    const MESSAGE_VISIBILITY_ZOOM_THRESHOLD = isMobile ? 3.5 : 4.0; 
    const showMessages = mapState.scale >= MESSAGE_VISIBILITY_ZOOM_THRESHOLD;

    // [AYAR] Profil Boyutları (Zoom'a göre hafif değişir)
    // Harita büyüdükçe profil boyutu biraz küçülür ama yok olmaz.
    const currentProfileSize = Math.max(6, Math.min(20, 24 / Math.pow(mapState.scale, 0.6)));

    // [AYAR] Mesaj Kutusu Sabit Değerleri (Küçültülmüş boyutlar)
    // Bunları scale ile çarpmıyoruz! Net kalması için sabit tutuyoruz.
    const msgConfig = {
        fontSize: isMobile ? 11 : 10,       // Küçültülmüş font
        height: isMobile ? 24 : 22,         // Küçültülmüş kutu yüksekliği
        padding: isMobile ? 10 : 8,        // Küçültülmüş yan boşluklar
        arrowSize: isMobile ? 5 : 4,        // Küçültülmüş ok boyutu
        borderRadius: isMobile ? 6 : 5,     // Küçültülmüş yuvarlak köşeler
        minWidth: 32,
        maxWidth: 130
    };

    // Mesaj kutusu için ters ölçek (Counter-Scale)
    // Harita ne kadar büyürse, kutuyu o oranda küçültüyoruz ki ekranda sabit kalsın.
    const counterScale = 1 / mapState.scale;
    
    profiles.forEach(profileGroup => {
        // Profilin orijinal koordinatları
        const baseX = parseFloat(profileGroup.getAttribute('data-base-x')) || 0;
        const baseY = parseFloat(profileGroup.getAttribute('data-base-y')) || 0;

        // 1. PROFİL GÖRSELİNİ GÜNCELLE
        const image = profileGroup.querySelector('.profile-image');
        if (image) {
            image.setAttribute('x', baseX - currentProfileSize / 2);
            image.setAttribute('y', baseY - currentProfileSize / 2);
            image.setAttribute('width', currentProfileSize);
            image.setAttribute('height', currentProfileSize);
        }
        
        const borderCircle = profileGroup.querySelector('.profile-border');
        if (borderCircle) {
            borderCircle.setAttribute('cx', baseX);
            borderCircle.setAttribute('cy', baseY);
            borderCircle.setAttribute('r', currentProfileSize / 2);
            // Çizgi kalınlığını scale'e göre ayarla ki çok kalınlaşmasın
            borderCircle.setAttribute('stroke-width', Math.max(0.5, 1.5 * counterScale));
        }
        
        const clickArea = profileGroup.querySelector('.profile-click-area');
        if (clickArea) {
            clickArea.setAttribute('cx', baseX);
            clickArea.setAttribute('cy', baseY);
            clickArea.setAttribute('r', currentProfileSize / 1.2);
        }

        // 2. MESAJ KUTUSUNU GÜNCELLE
        const messageGroup = profileGroup.querySelector('.profile-message-group');
        
        if (messageGroup) {
            if (!showMessages) {
                messageGroup.style.display = 'none';
                messageGroup.style.opacity = '0';
            } else {
                messageGroup.style.display = 'block';
                requestAnimationFrame(() => { messageGroup.style.opacity = '1'; });

                const messageBox = messageGroup.querySelector('.profile-message-box');
                const messageText = messageGroup.querySelector('.profile-message-text');

                if (messageBox && messageText) {
                    // --- KRİTİK NOKTA: TRANSFORM ---
                    // Grubu profilin tam üzerine taşıyoruz ve scale'i tersine çeviriyoruz.
                    // Böylece içindeki her şeyi normal pixel boyutunda (örn 14px) çizebiliriz.
                    
                    // Pozisyon: Profilin biraz üstü
                    const verticalOffset = (currentProfileSize / 2) + (5 * counterScale); // Profil ile kutu arası boşluk
                    
                    // Transform uygula: Koordinata git -> Ters ölçekle
                    // Bu sayede grubun içi "Zoom 1x" dünyası gibi davranır
                    messageGroup.setAttribute('transform', 
                        `translate(${baseX}, ${baseY - verticalOffset}) scale(${counterScale})`
                    );

                    // --- İÇERİK ÇİZİMİ (Artık sabit pixel değerleri kullanıyoruz) ---
                    
                    // 1. Önce Ham Metni Al (Orijinal metni hafızada tutalım)
                    let rawMessage = profileGroup.__rawMessage || messageText.textContent || '';
                    if (!profileGroup.__rawMessage) {
                        profileGroup.__rawMessage = rawMessage;
                    }
                    
                    // 2. Karakter Genişliği Tahmini
                    const charWidth = msgConfig.fontSize * 0.6; // Ortalama karakter genişliği
                    
                    // 3. Maksimum Karakter Sayısını Hesapla
                    const maxChars = Math.floor((msgConfig.maxWidth - msgConfig.padding) / charWidth);
                    
                    // 4. Metni KES (Truncate) - ÖNCE KES, SONRA ÖLÇ
                    let displayMessage = rawMessage;
                    if (rawMessage.length > maxChars) {
                        displayMessage = rawMessage.substring(0, maxChars) + '...';
                    }
                    
                    // 5. Genişliği KESİLMİŞ METNE göre hesapla
                    const textWidth = displayMessage.length * charWidth;
                    const totalWidth = Math.max(
                        msgConfig.minWidth, 
                        Math.min(msgConfig.maxWidth, textWidth + (msgConfig.padding * 2))
                    );

                    // Koordinatlar (0,0 noktası artık profilin hemen üstü)
                    // Kutuyu X ekseninde ortala, Y ekseninde yukarı doğru çiz
                    const boxLeft = -(totalWidth / 2);
                    const boxBottom = -msgConfig.arrowSize; // Okun başladığı yer
                    const boxTop = -(msgConfig.height + msgConfig.arrowSize);

                    // Modern Baloncuk Path'i (Squircle + Ok)
                    const r = msgConfig.borderRadius;
                    const ah = msgConfig.arrowSize; // Arrow Height
                    const aw = msgConfig.arrowSize * 1.5; // Arrow Width

                    const d = `
                        M ${boxLeft + r},${boxTop}
                        H ${boxLeft + totalWidth - r}
                        Q ${boxLeft + totalWidth},${boxTop} ${boxLeft + totalWidth},${boxTop + r}
                        V ${boxBottom - r}
                        Q ${boxLeft + totalWidth},${boxBottom} ${boxLeft + totalWidth - r},${boxBottom}
                        
                        H ${aw / 2}
                        L 0,0
                        L ${-aw / 2},${boxBottom}
                        
                        H ${boxLeft + r}
                        Q ${boxLeft},${boxBottom} ${boxLeft},${boxBottom - r}
                        V ${boxTop + r}
                        Q ${boxLeft},${boxTop} ${boxLeft + r},${boxTop}
                        Z
                    `;

                    // SVG Özelliklerini Güncelle
                    messageBox.setAttribute('d', d.replace(/\s+/g, ' ').trim());
                    // Çizgi kalınlığı sabit kalsın (zaten counter-scale içindeyiz)
                    messageBox.setAttribute('stroke-width', '0.5'); 

                    // SVG Text Konumlandırma - Kutunun tam ortasına
                    const textCenterX = 0; // Transform'dan dolayı 0,0 merkez
                    const textCenterY = boxTop + (msgConfig.height / 2) + (1 * counterScale); // Optik düzeltme

                    messageText.setAttribute('x', textCenterX);
                    messageText.setAttribute('y', textCenterY);
                    
                    // Font boyutunu direkt attribute olarak veriyoruz
                    messageText.setAttribute('font-size', msgConfig.fontSize);
                    
                    // 6. Metni SVG'ye işle (Zaten kesilmiş halini yazıyoruz)
                    messageText.textContent = displayMessage;
                }
            }
        }
    });
}

// Mesaj kutuları arasındaki çakışmaları çöz
function resolveMessageBoxCollisions(messageBoxes) {
    if (messageBoxes.length < 2 || !svg) return;
    
    // Her mesaj kutusunu kontrol et
    for (let i = 0; i < messageBoxes.length; i++) {
        const current = messageBoxes[i];
        let offsetY = 0;
        
        // Mevcut mesaj kutusunun gerçek yüksekliğini al
        const messageGroup = svg.querySelector(`#${current.id}`);
        if (!messageGroup) continue;
        
        const messageBox = messageGroup.querySelector('.profile-message-box');
        if (!messageBox) continue;
        
        // Path kullandığımız için yükseklik artık current.height'da (ok dahil)
        const actualHeight = current.height;
        
        // Diğer mesaj kutuları ile karşılaştır
        for (let j = 0; j < messageBoxes.length; j++) {
            if (i === j) continue;
            
            const other = messageBoxes[j];
            
            // Diğer mesaj kutusunun gerçek yüksekliğini al
            const otherMessageGroup = svg.querySelector(`#${other.id}`);
            if (!otherMessageGroup) continue;
            
            const otherMessageBox = otherMessageGroup.querySelector('.profile-message-box');
            if (!otherMessageBox) continue;
            
            // Path kullandığımız için yükseklik artık other.height'da (ok dahil)
            const otherActualHeight = other.height;
            
            // Çakışma kontrolü: iki dikdörtgen çakışıyor mu?
            const horizontalOverlap = !(current.x + current.width < other.x || other.x + other.width < current.x);
            const verticalOverlap = !(current.y + actualHeight < other.y || other.y + otherActualHeight < current.y);
            
            if (horizontalOverlap && verticalOverlap) {
                // Çakışma var - mevcut mesaj kutusunu yukarı kaydır
                // Hangi mesaj kutusu daha aşağıda ise onu yukarı kaydır
                if (current.y > other.y) {
                    const overlapHeight = Math.min(current.y + actualHeight - other.y, other.y + otherActualHeight - current.y);
                    offsetY = Math.min(offsetY, -overlapHeight - 10 * mapState.scale); // 10px boşluk
                }
            }
        }
        
        // Pozisyonu güncelle (eğer çakışma varsa)
        // Path kullandığımız için tüm path'i yeniden oluşturmalıyız
        if (offsetY < 0 && messageBox) {
            const messageText = messageGroup.querySelector('.profile-message-text');
            
            if (messageText) {
                // Mevcut path'i parse et ve yeni pozisyonla yeniden oluştur
                const pathData = messageBox.getAttribute('d');
                if (pathData) {
                    // Path'teki tüm Y koordinatlarını offsetY kadar kaydır
                    const newPath = pathData.replace(/([\d.]+),([\d.]+)/g, (match, x, y) => {
                        // Sadece Y koordinatlarını (ikinci sayı) güncelle
                        const newY = parseFloat(y) + offsetY;
                        return `${x},${newY}`;
                    });
                    messageBox.setAttribute('d', newPath);
                    
                    // SVG Text pozisyonunu da güncelle
                    const currentTextY = parseFloat(messageText.getAttribute('y')) || 0;
                    messageText.setAttribute('y', currentTextY + offsetY);
                }
            }
        }
    }
}

// ==================== SUPABASE INTEGRATION ====================

// ==================== PROFİL İSTATİSTİKLERİ ====================

// Profil tıklama sayısını artır (RPC ile güvenli)
async function incrementClickCount(profileId) {
    try {
        const { error } = await supabase.rpc('increment_click_count', {
            row_id: profileId
        });
        
        if (error) {
            console.error('Click count RPC hatası, alternatif yöntem deneniyor:', error);
            // Alternatif: Direct update (RPC yoksa veya hata varsa)
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    click_count: supabase.raw('COALESCE(click_count, 0) + 1') 
                })
                .eq('id', profileId);
            
            if (updateError) {
                console.error('Click count artırma hatası:', updateError);
            }
        }
    } catch (err) {
        console.error('Click count artırma hatası:', err);
    }
}

// Profil görüntülenme sayısını artır (RPC ile güvenli)
async function incrementViewCount(profileId) {
    try {
        const { error } = await supabase.rpc('increment_view_count', {
            row_id: profileId
        });
        
        if (error) {
            console.error('View count RPC hatası, alternatif yöntem deneniyor:', error);
            // Alternatif: Direct update
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    view_count: supabase.raw('COALESCE(view_count, 0) + 1') 
                })
                .eq('id', profileId);
            
            if (updateError) {
                console.error('View count artırma hatası:', updateError);
            }
        }
    } catch (err) {
        console.error('View count artırma hatası:', err);
    }
}

// Profil paylaşım sayısını artır (RPC ile güvenli)
async function incrementShareCount(profileId) {
    try {
        const { error } = await supabase.rpc('increment_share_count', {
            row_id: profileId
        });
        
        if (error) {
            console.error('Share count RPC hatası, alternatif yöntem deneniyor:', error);
            // Alternatif: Direct update
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    share_count: supabase.raw('COALESCE(share_count, 0) + 1') 
                })
                .eq('id', profileId);
            
            if (updateError) {
                console.error('Share count artırma hatası:', updateError);
            }
        }
    } catch (err) {
        console.error('Share count artırma hatası:', err);
    }
}

// Profil istatistiklerini modalda göster
function displayProfileStats(profile) {
    // İstatistikler için HTML elementi oluştur veya mevcut elementi bul
    let statsElement = document.getElementById('profile-stats');
    
    if (!statsElement) {
        // Eğer HTML'de yoksa oluştur
        statsElement = document.createElement('div');
        statsElement.id = 'profile-stats';
        statsElement.className = 'profile-stats';
        
        // Profil detay modalının body'sine ekle
        const detailBody = document.querySelector('.profile-detail-body');
        if (detailBody) {
            detailBody.insertBefore(statsElement, detailBody.firstChild);
        }
    }
    
    // İstatistikleri göster
    const clickCount = profile.click_count || 0;
    const viewCount = profile.view_count || 0;
    const shareCount = profile.share_count || 0;
    
    statsElement.innerHTML = `
        <div class="stats-container">
            <div class="stat-item">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                <span class="stat-label">Tıklanma</span>
                <span class="stat-value">${clickCount}</span>
            </div>
            <div class="stat-item">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="stat-label">Görüntülenme</span>
                <span class="stat-value">${viewCount}</span>
            </div>
            <div class="stat-item">
                <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
                <span class="stat-label">Paylaşım</span>
                <span class="stat-value">${shareCount}</span>
            </div>
        </div>
    `;
}

// ==================== SUPABASE INTEGRATION ====================

// Supabase'den tüm profilleri yükle ve Spiral Dağıt
async function loadProfilesFromSupabase() {
    try {
        // SVG'nin hazır olduğundan emin ol
        if (!svg || !svg.querySelector('#turkey-provinces')) {
            console.warn('⚠ SVG henüz hazır değil, profiller yüklenemedi. Hero sayfasından haritaya geçiş yapmalısınız.');
            return;
        }
        
        console.log('📡 Supabase\'den profiller yükleniyor...');
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Supabase profil yükleme hatası:', error);
            // Kullanıcıya hata mesajı gösterme (sessizce devam et)
            return;
        }
        
        console.log('Profiller yükleniyor:', data);
        
        if (data && data.length > 0) {
            // Mevcut profilleri temizle
            mapState.profiles = [];
            const profilesGroup = svg.querySelector('#profiles-group');
            if (profilesGroup) {
                profilesGroup.innerHTML = '';
            }
            
            // 1. Profilleri şehirlere göre grupla
            const profilesByCity = {};
            data.forEach(profileData => {
                const cityId = String(profileData.city_id || '').toLowerCase().trim();
                if (!cityId) {
                    console.warn('Profil city_id boş:', profileData.id, profileData.name);
                    return; // city_id boş olan profilleri atla
                }
                if (!profilesByCity[cityId]) {
                    profilesByCity[cityId] = [];
                }
                profilesByCity[cityId].push(profileData);
            });
            
            console.log('Şehirlere göre gruplanmış profiller:', Object.keys(profilesByCity).length, 'şehir');
            
            let profilesAdded = 0;
            let profilesRepositioned = 0;
            
            // 2. Her şehir grubunu işle
            for (const cityId in profilesByCity) {
                const cityProfiles = profilesByCity[cityId];
                
                // Şehrin merkezini ve sınırlarını bul
                const cityInfo = getCityGeometry(cityId);
                
                if (!cityInfo) {
                    console.error(`❌ Şehir geometrisi bulunamadı: ${cityId}, ${cityProfiles.length} profil atlanıyor`);
                    console.log('Mevcut şehir grupları:', Array.from(svg.querySelectorAll('g[id]')).map(g => g.id));
                } else {
                    console.log(`✓ Şehir geometrisi bulundu: ${cityId}`, {
                        center: cityInfo.center,
                        bbox: cityInfo.bbox,
                        profileCount: cityProfiles.length
                    });
                }
                
                if (cityInfo) {
                    // Bu şehirdeki profilleri spiral dağılım ile ekle
                    cityProfiles.forEach((profileData, index) => {
                        // Spiral konum hesapla
                        const pos = calculateSpiralPosition(
                            index,              // Kaçıncı kişi olduğu
                            cityInfo.center,    // Şehir merkezi
                            cityInfo.bbox,      // Şehir sınırları
                            cityInfo.pathElement // SVG path'i (içeride mi kontrolü için)
                        );
                        
                        // Debug: Pozisyon değerlerini kontrol et
                        if (!pos || isNaN(pos.x) || isNaN(pos.y) || !isFinite(pos.x) || !isFinite(pos.y)) {
                            console.error(`❌ Geçersiz pozisyon hesaplandı:`, {
                                profileId: profileData.id,
                                profileName: profileData.name,
                                cityId: cityId,
                                pos: pos,
                                center: cityInfo.center,
                                bbox: cityInfo.bbox
                            });
                            // Geçersiz pozisyon varsa merkezi kullan
                            pos.x = cityInfo.center.x;
                            pos.y = cityInfo.center.y;
                        }
                        
                        // Eğer veritabanındaki pozisyon farklıysa güncelle
                        const originalX = parseFloat(profileData.position_x);
                        const originalY = parseFloat(profileData.position_y);
                        const needsUpdate = Math.abs(pos.x - originalX) > 1 || Math.abs(pos.y - originalY) > 1;
                        
                        if (needsUpdate) {
                            profilesRepositioned++;
                            // Veritabanını güncelle
                            updateProfilePositionInSupabase(profileData.id, pos.x, pos.y).catch(err => {
                                console.error(`Profil pozisyonu güncellenemedi (${profileData.id}):`, err);
                            });
                        }
                        
                        // Profil nesnesini oluştur
                        const profile = {
                            id: profileData.id,
                            user_id: profileData.user_id,
                            name: profileData.name,
                            imageUrl: profileData.image_url,
                            cityId: profileData.city_id,
                            city: profileData.city_name,
                            x: pos.x,
                            y: pos.y,
                            snapchat_username: profileData.snapchat_username || null,
                            instagram_username: profileData.instagram_username || null,
                            facebook_username: profileData.facebook_username || null,
                            twitter_username: profileData.twitter_username || null,
                            pinterest_username: profileData.pinterest_username || null,
                            age: profileData.age || null,
                            district: profileData.district || null,
                            gender: profileData.gender || null,
                            daily_message: profileData.daily_message || null,
                            message_date: profileData.message_date || null,
                        };
                        
                        // Debug: Profil oluşturulduğunu logla
                        console.log(`✓ Profil oluşturuluyor:`, {
                            id: profile.id,
                            name: profile.name,
                            city: profile.city,
                            x: profile.x,
                            y: profile.y,
                            imageUrl: profile.imageUrl ? 'Var' : 'Yok'
                        });
                        
                        // State'e ve haritaya ekle
                        mapState.profiles.push(profile);
                        addProfileToMap(profile);
                        profilesAdded++;
            });
                } else {
                    console.warn(`⚠ Şehir geometrisi bulunamadı: ${cityId}, ${cityProfiles.length} profil atlanıyor`);
                }
            }
            
            console.log(`✓ ${profilesAdded} profil başarıyla yüklendi ve spiral dağılım ile yerleştirildi (${profilesRepositioned} profil yeniden konumlandırıldı)`);
            
            // Apply filters after loading and show results
            applyFilters();
            updateFilterVisibility();
            renderFilterResults(mapState.profiles);
            renderFilterResults(mapState.profiles);
            renderFilterResults(mapState.profiles);
            
            // [YENİ] Deep Link Kontrolü
            checkUrlForDeepLink();
        } else {
            // Veri yoksa sessizce devam et (normal durum)
            console.log('Henüz profil bulunmuyor.');
        }
    } catch (error) {
        // Network veya bağlantı hatalarını sessizce yakala
        if (error.message && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_CONNECTION_CLOSED') ||
            error.message.includes('ERR_INTERNET_DISCONNECTED')
        )) {
            console.warn('Bağlantı hatası: Supabase\'e şu anda erişilemiyor. İnternet bağlantınızı kontrol edin.');
        } else {
        console.error('Profil yükleme hatası:', error);
        }
        // Hata durumunda sessizce devam et, uygulama çalışmaya devam etsin
    }
}

// Profil ekle (Supabase'e kaydet) - Updated with platforms
async function saveProfileToSupabase(profile) {
    try {
        // Kullanıcı ID'sini al
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('Kullanıcı giriş yapmamış');
        }
        
        // Kullanıcının zaten profili var mı kontrol et
        const hasProfile = await checkUserHasProfile(user.id);
        if (hasProfile) {
            throw new Error('Zaten bir profiliniz var. Profil ayarlarından düzenleyebilirsiniz.');
        }
        
        const { data, error } = await supabase
            .from('profiles')
            .insert([
                {
                    user_id: user.id,
                    name: profile.name,
                    image_url: profile.imageUrl,
                    city_id: profile.cityId,
                    city_name: profile.city,
                    position_x: profile.x,
                    position_y: profile.y,
                    snapchat_username: profile.snapchat_username || null,
                    instagram_username: profile.instagram_username || null,
                    facebook_username: profile.facebook_username || null,
                    twitter_username: profile.twitter_username || null,
                    pinterest_username: profile.pinterest_username || null,
                    age: profile.age || null,
                    district: profile.district || null,
                    gender: profile.gender || null,
                }
            ])
            .select()
            .single();
        
        if (error) {
            console.error('Supabase profil ekleme hatası:', error);
            throw error;
        }
        
        // Eklenen profil ID'sini güncelle
        profile.id = data.id;
        console.log('Profil Supabase\'e eklendi:', data);
        return data;
    } catch (error) {
        console.error('Profil kaydetme hatası:', error);
        throw error;
    }
}

// Profil pozisyonunu güncelle (Supabase'de)
async function updateProfilePositionInSupabase(profileId, x, y) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                position_x: x,
                position_y: y,
                updated_at: new Date().toISOString()
            })
            .eq('id', profileId);
        
        if (error) {
            console.error('Profil pozisyonu güncelleme hatası:', error);
            throw error;
        }
        
        console.log(`Profil pozisyonu güncellendi: ${profileId} -> (${x.toFixed(2)}, ${y.toFixed(2)})`);
        return true;
    } catch (error) {
        console.error('Pozisyon güncelleme hatası:', error);
        throw error;
    }
}

// Profil sil (Supabase'den sil)
async function deleteProfileFromSupabase(profileId) {
    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profileId);
        
        if (error) {
            console.error('Supabase profil silme hatası:', error);
            throw error;
        }
        
        console.log('Profil Supabase\'den silindi:', profileId);
    } catch (error) {
        // Network hatalarını daha iyi yakala
        if (error.message && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_CONNECTION_CLOSED')
        )) {
            console.warn('Bağlantı hatası: Profil silinemedi. İnternet bağlantınızı kontrol edin.');
            throw new Error('İnternet bağlantısı hatası. Lütfen tekrar deneyin.');
        }
        console.error('Profil silme hatası:', error);
        throw error;
    }
}

// Görseli Supabase Storage'a yükle
async function uploadImageToSupabase(file, fileName) {
    try {
        const fileExt = fileName.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
            .from('profile-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Supabase görsel yükleme hatası:', error);
            // Network hatalarını kontrol et
            if (error.message && (
                error.message.includes('Failed to fetch') || 
                error.message.includes('NetworkError') ||
                error.message.includes('ERR_CONNECTION_CLOSED')
            )) {
                throw new Error('İnternet bağlantısı hatası. Görsel yüklenemedi. Lütfen tekrar deneyin.');
            }
            throw error;
        }
        
        // Public URL al
        const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(data.path);
        
        console.log('Görsel Supabase Storage\'a yüklendi:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
        // Network hatalarını daha iyi yakala
        if (error.message && (
            error.message.includes('Failed to fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('ERR_CONNECTION_CLOSED')
        )) {
            console.warn('Bağlantı hatası: Görsel yüklenemedi. İnternet bağlantınızı kontrol edin.');
            throw new Error('İnternet bağlantısı hatası. Lütfen tekrar deneyin.');
        }
        console.error('Görsel yükleme hatası:', error);
        throw error;
    }
}

// ==================== MODAL FUNCTIONS ====================

// Modal state
let modalState = {
    selectedFile: null,
    croppedImage: null,
    selectedCity: null,
    cropStartX: 0,
    cropStartY: 0,
    cropEndX: 0,
    cropEndY: 0,
    isCropping: false,
    cropImageSrc: null, // Crop için kullanılan görsel kaynağı
    selectedGender: null
};

// Edit Modal state
let editModalState = {
    selectedFile: null,
    croppedImage: null,
    cropStartX: 0,
    cropStartY: 0,
    cropEndX: 0,
    cropEndY: 0,
    cropImageSrc: null
};

// Filter state
let filterState = {
    gender: 'all',
    ageMin: null,
    ageMax: null,
    city: '',
    district: ''
};

// Open add profile modal
function openAddProfileModal() {
    if (addProfileModal) {
        addProfileModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        resetModalForm();
    }
}

// Close add profile modal
function closeAddProfileModal() {
    if (addProfileModal) {
        addProfileModal.classList.add('hidden');
        document.body.style.overflow = '';
        resetModalForm();
    }
}

// Reset modal form
function resetModalForm() {
    modalState.selectedFile = null;
    modalState.croppedImage = null;
    modalState.selectedCity = null;
    
    if (photoInput) photoInput.value = '';
    if (uploadPreview) {
        uploadPreview.innerHTML = '<span class="upload-icon">📷</span><span class="upload-text">Fotoğraf Seç</span>';
    }
    if (cropControls) cropControls.classList.add('hidden');
    if (cropCanvas) {
        cropCanvas.classList.add('hidden');
        const ctx = cropCanvas.getContext('2d');
        ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    }
    if (usernameInput) usernameInput.value = '';
    if (cityInput) cityInput.value = '';
    if (citySuggestions) {
        citySuggestions.classList.add('hidden');
        citySuggestions.innerHTML = '';
    }
}

// Handle photo selection
function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showAlert('Lütfen bir resim dosyası seçin', 'Hata', 'error');
        return;
    }
    
    modalState.selectedFile = file;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Show preview
            if (uploadPreview) {
                uploadPreview.innerHTML = `<img src="${event.target.result}" alt="Preview" class="preview-image">`;
            }
            
            // Setup crop canvas
            setupCropCanvas(img, event.target.result);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Setup crop canvas
function setupCropCanvas(img, imageSrc) {
    if (!cropCanvas) return;
    
    const maxSize = 400;
    let width = img.width;
    let height = img.height;
    
    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = width * ratio;
        height = height * ratio;
    }
    
    cropCanvas.width = width;
    cropCanvas.height = height;
    cropCanvas.classList.remove('hidden');
    cropCanvas.style.cursor = 'crosshair'; // Tıklama için cursor
    
    // Görsel kaynağını sakla (handleCropClick için)
    modalState.cropImageSrc = imageSrc;
    
    const ctx = cropCanvas.getContext('2d');
    
    // Önce fotoğrafı çiz (karartma yok)
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    // Show crop controls
    if (cropControls) {
        cropControls.classList.remove('hidden');
    }
    
    // Başlangıçta merkez kare (biraz küçük)
    const size = Math.min(width, height) * 0.8;
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    
    // Draw crop overlay
    drawCropOverlay(ctx, width, height, x, y, size);
    
    // Store crop coordinates
    modalState.cropStartX = x;
    modalState.cropStartY = y;
    modalState.cropEndX = x + size;
    modalState.cropEndY = y + size;
    
    // Fotoğraf üzerine tıklanınca kareyi oraya taşı
    cropCanvas.removeEventListener('click', handleCropClick); // Önceki listener'ı temizle
    cropCanvas.removeEventListener('mousemove', handleCropHover); // Önceki listener'ı temizle
    cropCanvas.addEventListener('click', handleCropClick);
    cropCanvas.addEventListener('mousemove', handleCropHover);
}

// Draw crop overlay - karartma kaldırıldı, sadece kare çizgisi gösteriliyor
function drawCropOverlay(ctx, canvasWidth, canvasHeight, x, y, size) {
    // Karartma kaldırıldı - fotoğraf net görünsün
    // Sadece kare çizgisi çiziliyor
    
    // Draw crop border - yeşil renk (Supabase teması)
    ctx.strokeStyle = '#3ECF8E';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, size, size);
    
    // Köşelerde küçük kareler (daha profesyonel görünüm)
    const cornerSize = 15;
    ctx.fillStyle = '#3ECF8E';
    
    // Sol üst
    ctx.fillRect(x - 2, y - 2, cornerSize, 3);
    ctx.fillRect(x - 2, y - 2, 3, cornerSize);
    
    // Sağ üst
    ctx.fillRect(x + size - cornerSize + 2, y - 2, cornerSize, 3);
    ctx.fillRect(x + size - 1, y - 2, 3, cornerSize);
    
    // Sol alt
    ctx.fillRect(x - 2, y + size - 1, cornerSize, 3);
    ctx.fillRect(x - 2, y + size - cornerSize + 2, 3, cornerSize);
    
    // Sağ alt
    ctx.fillRect(x + size - cornerSize + 2, y + size - 1, cornerSize, 3);
    ctx.fillRect(x + size - 1, y + size - cornerSize + 2, 3, cornerSize);
}

// Crop canvas'a tıklanınca - fotoğraf üzerine tıklanınca kareyi oraya taşı
function handleCropClick(e) {
    if (!cropCanvas || !modalState.selectedFile) return;
    
    const rect = cropCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Canvas koordinatlarını hesapla (scale dikkate alınarak)
    const scaleX = cropCanvas.width / rect.width;
    const scaleY = cropCanvas.height / rect.height;
    const canvasX = clickX * scaleX;
    const canvasY = clickY * scaleY;
    
    // Kare boyutunu hesapla
    const size = Math.min(cropCanvas.width, cropCanvas.height) * 0.8;
    const x = Math.max(0, Math.min(canvasX - size / 2, cropCanvas.width - size));
    const y = Math.max(0, Math.min(canvasY - size / 2, cropCanvas.height - size));
    
    // Fotoğrafı yeniden çiz - görsel yüklenmesini engellemek için mevcut canvas'tan kullan
    const ctx = cropCanvas.getContext('2d');
    
    // Mevcut görseli yeniden çiz (overlay'i kaldırmak için)
    // cropImageSrc data URL olduğu için yeni yükleme yapmaz
    if (modalState.cropImageSrc) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            ctx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
            
            // Yeni kareyi çiz
            drawCropOverlay(ctx, cropCanvas.width, cropCanvas.height, x, y, size);
            
            // Store crop coordinates
            modalState.cropStartX = x;
            modalState.cropStartY = y;
            modalState.cropEndX = x + size;
            modalState.cropEndY = y + size;
        };
        // Data URL kullan (yeni yükleme yapmaz, tarayıcı görseli açmaz)
        img.src = modalState.cropImageSrc;
    } else {
        // Fallback: preview img'den kullan (zaten yüklenmiş)
        const previewImg = uploadPreview.querySelector('img');
        if (previewImg && previewImg.complete) {
            ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            ctx.drawImage(previewImg, 0, 0, cropCanvas.width, cropCanvas.height);
            
            // Yeni kareyi çiz
            drawCropOverlay(ctx, cropCanvas.width, cropCanvas.height, x, y, size);
            
            // Store crop coordinates
            modalState.cropStartX = x;
            modalState.cropStartY = y;
            modalState.cropEndX = x + size;
            modalState.cropEndY = y + size;
        }
    }
}

// Hover efekti - kareyi göstermek için
function handleCropHover(e) {
    if (!cropCanvas) return;
    cropCanvas.style.cursor = 'crosshair';
}

// Apply crop
function applyCrop() {
    if (!cropCanvas || !modalState.selectedFile) return;
    
    // Kullanıcının seçtiği kareyi kullan
    const size = modalState.cropEndX - modalState.cropStartX;
    const x = modalState.cropStartX;
    const y = modalState.cropStartY;
    
    // Orijinal görseli yükle ve crop uygula
    const img = new Image();
    img.onload = () => {
        // Orijinal görseli canvas'a çiz (overlay olmadan)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropCanvas.width;
        tempCanvas.height = cropCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
        
        // Get cropped image data from temp canvas
        const imageData = tempCtx.getImageData(x, y, size, size);
        
        // Create new canvas for cropped image
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = size;
        croppedCanvas.height = size;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.putImageData(imageData, 0, 0);
        
        // Convert to blob
        croppedCanvas.toBlob((blob) => {
            modalState.croppedImage = blob;
            
            // Update preview - kırpılmış görseli göster, fotoğraf yükleme alanını tekrar gösterme
            if (uploadPreview) {
                uploadPreview.innerHTML = `<img src="${croppedCanvas.toDataURL()}" alt="Cropped" class="preview-image">`;
            }
            
            // Hide crop controls ve canvas
            if (cropControls) cropControls.classList.add('hidden');
            if (cropCanvas) {
                cropCanvas.classList.add('hidden');
                // Event listener'ları temizle
                cropCanvas.removeEventListener('click', handleCropClick);
                cropCanvas.removeEventListener('mousemove', handleCropHover);
            }
            
            // photo-upload-area'yı gizleme - preview zaten gösteriliyor
            // Kullanıcı kırpılmış görseli görebilir, tekrar fotoğraf yükleme alanı çıkmaz
        }, 'image/png', 0.95);
    };
    
    // Görsel kaynağını kullan
    if (modalState.cropImageSrc) {
        img.src = modalState.cropImageSrc;
    } else {
        const previewImg = uploadPreview.querySelector('img');
        if (previewImg) {
            img.src = previewImg.src;
        } else {
            img.src = modalState.selectedFile ? URL.createObjectURL(modalState.selectedFile) : '';
        }
    }
}

// Cancel crop
function cancelCrop() {
    if (cropControls) cropControls.classList.add('hidden');
    if (cropCanvas) {
        cropCanvas.classList.add('hidden');
        const ctx = cropCanvas.getContext('2d');
        ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        // Event listener'ları temizle
        cropCanvas.removeEventListener('click', handleCropClick);
        cropCanvas.removeEventListener('mousemove', handleCropHover);
    }
    modalState.croppedImage = null;
    modalState.cropImageSrc = null;
    // Fotoğraf yükleme alanını tekrar gösterme - mevcut preview'ı koru
    // uploadPreview'ı sıfırlamıyoruz, kullanıcı zaten fotoğraf seçmiş
}

// Handle city input (autocomplete) - Uses cities from the map
function handleCityInput(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!citySuggestions) return;
    
    if (query.length < 1) {
        citySuggestions.classList.add('hidden');
        citySuggestions.innerHTML = '';
        modalState.selectedCity = null;
        return;
    }
    
    // Normalize query for Turkish character matching
    const normalizeQuery = (str) => {
        return str.toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
    };
    
    const normalizedQuery = normalizeQuery(query);
    
    // Use cities from map (haritadaki şehirler)
    const cities = mapState.cities || [];
    
    if (cities.length === 0) {
        // Eğer harita henüz yüklenmediyse, fallback olarak cities.json kullan
        fetch('/data/cities.json')
            .then(res => res.json())
            .then(jsonCities => {
                const matches = jsonCities.filter(city => {
                    const normalizedName = normalizeQuery(city.name);
                    return normalizedName.includes(normalizedQuery);
                }).slice(0, 8);
                
                showCitySuggestions(matches);
            })
            .catch(err => {
                console.error('Şehir listesi yüklenemedi:', err);
            });
        return;
    }
    
    // Haritadaki şehirlerden eşleşenleri bul
    const matches = cities.filter(city => {
        const normalizedName = normalizeQuery(city.name);
        const normalizedId = normalizeQuery(city.id);
        return normalizedName.includes(normalizedQuery) || 
               normalizedId.includes(normalizedQuery);
    }).slice(0, 8); // En fazla 8 öneri göster
    
    showCitySuggestions(matches);
}

// Show city suggestions
function showCitySuggestions(matches) {
    if (!citySuggestions) return;
    
    if (matches.length > 0) {
        citySuggestions.innerHTML = matches.map(city => {
            return `<div class="city-suggestion" data-city-id="${city.id}" data-city-name="${city.name}">
                <span class="city-name">${city.name}</span>
            </div>`;
        }).join('');
        citySuggestions.classList.remove('hidden');
        
        // Add click listeners
        citySuggestions.querySelectorAll('.city-suggestion').forEach(item => {
            item.addEventListener('click', () => {
                const cityId = item.getAttribute('data-city-id');
                const cityName = item.getAttribute('data-city-name');
                if (cityInput) {
                    cityInput.value = cityName;
                }
                modalState.selectedCity = { id: cityId, name: cityName };
                citySuggestions.classList.add('hidden');
            });
        });
    } else {
        citySuggestions.classList.add('hidden');
        citySuggestions.innerHTML = '';
    }
}

// Save profile
// Profil ekle (Supabase'e kaydet ve Haritaya Ekle)
async function saveProfile() {
    // 1. Validasyonlar
    if (!modalState.croppedImage && !modalState.selectedFile) {
        showAlert('Lütfen bir profil fotoğrafı seçin', 'Eksik Bilgi', 'warning');
        return;
    }
    
    if (!usernameInput || !usernameInput.value.trim()) {
        showAlert('Lütfen kullanıcı adınızı girin', 'Eksik Bilgi', 'warning');
        return;
    }
    
    if (!modalState.selectedCity) {
        showAlert('Lütfen bir şehir seçin', 'Eksik Bilgi', 'warning');
        return;
    }
    
    // Yaş kontrolü (18+)
    if (ageInput && ageInput.value) {
        const ageValue = parseInt(ageInput.value);
        if (ageValue < 18) {
            await showAlert('Yasal sebeplerden dolayı uygulamayı sadece 18 yaş ve üzeri kullanıcılar kullanabilir.', 'Yaş Sınırı', 'warning');
            return;
        }
    }
    
    // Kaydet butonunu kilitle
    if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = '<span>Kaydediliyor...</span>';
    }
    
    try {
        // 2. Görseli Yükle
        let imageUrl;
        if (modalState.croppedImage) {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            imageUrl = await uploadImageToSupabase(modalState.croppedImage, fileName);
        } else if (modalState.selectedFile) {
            imageUrl = await uploadImageToSupabase(modalState.selectedFile, modalState.selectedFile.name);
        }
        
        // 3. Şehir Geometrisini Al
        const cityId = modalState.selectedCity.id;
        const cityInfo = getCityGeometry(cityId);
        
        if (!cityInfo) {
            throw new Error('Şehir geometrisi bulunamadı');
        }

        // 4. KONUM HESAPLAMA (Kritik Nokta)
        // O şehirdeki mevcut profilleri say (Böylece sıradaki index'i buluruz)
        const existingProfilesInCity = mapState.profiles.filter(p => 
            String(p.cityId).toLowerCase().trim() === String(cityId).toLowerCase().trim()
        );

        // Yeni profilin index'i (Örn: 5 kişi varsa, yeni kişi 6. olacak)
        const nextIndex = existingProfilesInCity.length;

        // Spiraldeki konumu hesapla
        const position = calculateSpiralPosition(
            nextIndex, 
            cityInfo.center, 
            cityInfo.bbox, 
            cityInfo.pathElement
        );
        
        if (!position) {
            throw new Error('Konum hesaplanamadı');
        }
        
        // 5. Profil Objesini Oluştur
        const profile = {
            name: usernameInput.value.trim(),
            imageUrl: imageUrl,
            cityId: cityId,
            city: modalState.selectedCity.name,
            x: position.x,
            y: position.y,
            snapchat_username: snapchatInput ? snapchatInput.value.trim() : '',
            instagram_username: instagramInput ? instagramInput.value.trim() : '',
            facebook_username: facebookInput ? facebookInput.value.trim() : '',
            twitter_username: twitterInput ? twitterInput.value.trim() : '',
            pinterest_username: pinterestInput ? pinterestInput.value.trim() : '',
            age: ageInput && ageInput.value ? parseInt(ageInput.value) : null,
            district: districtInput ? districtInput.value.trim() : '',
            gender: modalState.selectedGender,
        };
        
        // 6. Supabase'e Kaydet
        const savedProfile = await saveProfileToSupabase(profile);
        
        // 7. Haritaya Ekle (State güncelle)
        profile.id = savedProfile.id;
        mapState.profiles.push(profile); // Listeye ekle
        addProfileToMap(profile); // Görsel olarak ekle
        
        // Modalı kapat
        closeAddProfileModal();
        
        // Başarı mesajı
        showAlert('Profil başarıyla eklendi!', 'Başarılı', 'success');
        
        // Update filters and results
        applyFilters();
        
    } catch (error) {
        console.error('Profil kaydetme hatası:', error);
        showAlert('Hata: ' + error.message, 'Hata', 'error');
    } finally {
        // Re-enable save button
        if (saveProfileBtn) {
            saveProfileBtn.disabled = false;
            saveProfileBtn.innerHTML = '<span>Kaydet</span>';
        }
    }
}

// Duplicate functions removed:
// - saveProfileToSupabase already defined at line 1317
// - loadProfilesFromSupabase already defined at line 1272

// Günlük mesaj güncelle (günde bir kez)
async function updateDailyMessage(profileId, message) {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında bugünün tarihi
        
        const { error } = await supabase
            .from('profiles')
            .update({
                daily_message: message,
                message_date: today,
                updated_at: new Date().toISOString()
            })
            .eq('id', profileId);
        
        if (error) {
            console.error('Günlük mesaj güncelleme hatası:', error);
            showAlert('Mesaj güncellenirken bir hata oluştu: ' + error.message, 'Hata', 'error');
            return;
        }
        
        // Profil state'ini güncelle
        const profile = mapState.profiles.find(p => p.id === profileId);
        if (profile) {
            profile.daily_message = message;
            profile.message_date = today;
        }
        
        // Haritadaki mesaj kutusunu güncelle
        updateProfileMessageOnMap(profileId, message);
        
        // Modal'daki mesajı güncelle ve görüntüleme moduna geç
        const messageDisplay = document.getElementById('detail-message-display');
        const messageInputContainer = document.getElementById('detail-message-input-container');
        const editMessageBtn = document.getElementById('edit-daily-message-btn');
        
        if (messageDisplay) {
            messageDisplay.textContent = message;
            messageDisplay.style.display = 'block';
        }
        
        if (messageInputContainer) {
            messageInputContainer.style.display = 'none';
        }
        
        if (editMessageBtn) {
            editMessageBtn.style.display = 'flex';
        }
        
        showAlert('Günlük mesaj başarıyla kaydedildi!', 'Başarılı', 'success');
    } catch (error) {
        console.error('Günlük mesaj güncelleme hatası:', error);
        showAlert('Mesaj güncellenirken bir hata oluştu.', 'Hata', 'error');
    }
}

// Haritadaki profil mesaj kutusunu güncelle
function updateProfileMessageOnMap(profileId, message) {
    const profile = mapState.profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    // Mevcut mesaj grubunu bul ve kaldır
    const profileGroup = svg.querySelector(`#${profileId}`);
    if (profileGroup) {
        const existingMessageGroup = profileGroup.querySelector(`#message-group-${profileId}`);
        if (existingMessageGroup) {
            existingMessageGroup.remove();
        }
        
        // Yeni mesaj kutusunu ekle
        const today = new Date().toISOString().split('T')[0];
        profile.daily_message = message;
        profile.message_date = today;
        
        // Mesaj kutusunu yeniden oluştur (profil group içinde, transform ile scale edilecek)
        const messageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        messageGroup.id = `message-group-${profileId}`;
        messageGroup.classList.add('profile-message-group');
        
        // Başlangıçta gizli olsun (Zoom kontrolü açacak)
        messageGroup.style.display = 'none'; 
        messageGroup.style.opacity = '0';
        
        const messageBox = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        messageBox.setAttribute('class', 'profile-message-box');
        
        // Native SVG Text kullanıyoruz (iOS Safari için)
        const messageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        messageText.setAttribute('class', 'profile-message-text');
        messageText.textContent = message;
        messageText.setAttribute('text-anchor', 'middle');
        messageText.setAttribute('dominant-baseline', 'middle');
        messageText.setAttribute('dy', '1'); // Optik dikey ortalama için 1px aşağı it
        
        messageGroup.appendChild(messageBox);
        messageGroup.appendChild(messageText);
        profileGroup.appendChild(messageGroup);
        
        // Orijinal mesajı hafızada tut (truncation için)
        profileGroup.__rawMessage = message;
        
        // Mesaj kutusunu güncelle (zoom seviyesine göre) - Kutu boyutunu yeni metne göre hesapla
        updateProfileSizes(); // Mesaj kutularını güncelle
    }
}

// Profile click handler - show detail modal
function handleProfileClick(profileId) {
    const profile = mapState.profiles.find(p => p.id === profileId);
    if (!profile) {
        console.warn('Profil bulunamadı:', profileId);
        return;
    }
    
    // ✅ SPAM KONTROLÜ (SessionStorage ile aynı oturumda tekrar sayma)
    const viewedKey = `viewed_${profileId}`;
    const clickedKey = `clicked_${profileId}`;
    const hasViewed = sessionStorage.getItem(viewedKey);
    const hasClicked = sessionStorage.getItem(clickedKey);
    
    // Click Count: Sadece ilk tıklamada artır
    if (!hasClicked) {
        incrementClickCount(profileId);
        sessionStorage.setItem(clickedKey, 'true');
        // UI'da anlık geri bildirim için local state'i güncelle
        if (profile.click_count !== undefined) {
            profile.click_count = (profile.click_count || 0) + 1;
        }
    }
    
    // View Count: Sadece ilk görüntülemede artır
    if (!hasViewed) {
        incrementViewCount(profileId);
        sessionStorage.setItem(viewedKey, 'true');
        // UI'da anlık geri bildirim için local state'i güncelle
        if (profile.view_count !== undefined) {
            profile.view_count = (profile.view_count || 0) + 1;
        }
    }
    
    // Show profile detail modal
    if (profileDetailModal) {
        const detailImage = document.getElementById('detail-image');
        const detailName = document.getElementById('detail-name');
        const detailCity = document.getElementById('detail-city');
        const detailDistrict = document.getElementById('detail-district');
        const detailAge = document.getElementById('detail-age');
        const detailSocial = document.getElementById('detail-social');
        
        if (detailImage) {
            detailImage.innerHTML = `<img src="${profile.imageUrl}" alt="${profile.name}">`;
        }
        if (detailName) {
            detailName.textContent = profile.name;
        }
        if (detailCity) {
            detailCity.textContent = `📍 ${profile.city}`;
        }
        if (detailDistrict) {
            detailDistrict.textContent = profile.district ? `🏘️ ${profile.district}` : '';
        }
        if (detailAge) {
            detailAge.textContent = profile.age ? `🎂 ${profile.age} yaşında` : '';
        }
        if (detailSocial) {
            let socialHTML = '';
            if (profile.snapchat_username) {
                socialHTML += `<div class="social-link-item">
                    <svg class="social-icon snapchat-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.003 1.83c-2.628 0-4.962 1.487-5.592 4.417-.052.269-.536.538-.85.492-.472-.047-1.155.223-1.206.852-.053.539.367 1.032.577 1.301.21.27.105.763-.105 1.167-.314.583-.943 1.526-.943 2.536 0 1.256 1.048 2.019 1.415 2.243.052.045.157.09.157.224 0 .179-.157.673-.996.852-1.625.314-1.258 2.288-.367 2.602.472.18 1.573-.224 2.831-.224 1.258 0 1.94.942 5.035.942 3.094 0 3.777-.942 5.035-.942 1.258 0 2.306.404 2.831.224.891-.314 1.206-2.288-.367-2.602-.839-.179-.996-.673-.996-.852 0-.134.105-.179.157-.224.367-.224 1.415-.987 1.415-2.243 0-1.01-.629-1.953-.943-2.536-.21-.404-.315-.897-.105-1.167.21-.269.629-.762.577-1.301-.052-.629-.734-.899-1.206-.852-.315.046-.798-.223-.85-.492-.63-2.93-2.964-4.417-5.592-4.417z"/>
                    </svg>
                    <span class="social-text">${profile.snapchat_username}</span>
                </div>`;
            }
            if (profile.instagram_username) {
                socialHTML += `<div class="social-link-item">
                    <svg class="social-icon instagram-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                    <span class="social-text">${profile.instagram_username}</span>
                </div>`;
            }
            if (profile.facebook_username) {
                socialHTML += `<div class="social-link-item">
                    <svg class="social-icon facebook-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.971.956-2.971 3.594v.376h3.428l-.582 3.667h-2.846l-.009 7.977c6.109-.586 10.798-5.835 10.798-12.028a12.335 12.335 0 0 0-12.336-12.333 12.335 12.335 0 0 0-12.336 12.334c0 6.192 4.688 11.44 10.798 12.028z"/>
                    </svg>
                    <span class="social-text">${profile.facebook_username}</span>
                </div>`;
            }
            if (profile.twitter_username) {
                socialHTML += `<div class="social-link-item">
                    <svg class="social-icon x-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span class="social-text">${profile.twitter_username}</span>
                </div>`;
            }
            if (profile.pinterest_username) {
                socialHTML += `<div class="social-link-item">
                    <svg class="social-icon pinterest-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.399.165-1.495-.69-2.433-2.864-2.433-4.607 0-3.77 2.748-7.229 7.93-7.229 4.173 0 6.91 2.978 6.91 6.898 0 4.113-2.595 7.42-6.199 7.42-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.62 0 12.017 0z"/>
                    </svg>
                    <span class="social-text">${profile.pinterest_username}</span>
                </div>`;
            }
            detailSocial.innerHTML = socialHTML || '<div class="no-social">Sosyal medya hesabı eklenmemiş</div>';
        }
        
        // Günlük mesaj bölümünü göster/gizle ve doldur
        const messageSection = document.getElementById('detail-message-section');
        const messageDisplay = document.getElementById('detail-message-display');
        const messageInputContainer = document.getElementById('detail-message-input-container');
        const dailyMessageInput = document.getElementById('daily-message-input');
        const saveMessageBtn = document.getElementById('save-daily-message-btn');
        const cancelMessageBtn = document.getElementById('cancel-daily-message-btn');
        const editMessageBtn = document.getElementById('edit-daily-message-btn');
        
        if (messageSection && messageDisplay && messageInputContainer) {
            // Kullanıcının kendi profilini kontrol et
            getCurrentUser().then(user => {
                const isOwnProfile = user && profile.user_id === user.id;
                
                // Bugünkü mesaj var mı kontrol et
                const today = new Date().toISOString().split('T')[0];
                const messageDate = profile.message_date ? new Date(profile.message_date).toISOString().split('T')[0] : null;
                const hasTodayMessage = profile.daily_message && messageDate === today;
                
                if (hasTodayMessage || isOwnProfile) {
                    messageSection.style.display = 'block';
                    
                    if (isOwnProfile) {
                        // Kendi profili - başlangıçta görüntüleme modu
                        if (hasTodayMessage) {
                            messageDisplay.textContent = profile.daily_message;
                            messageDisplay.style.display = 'block';
                            messageInputContainer.style.display = 'none';
                            // Düzenle butonunu göster
                            if (editMessageBtn) {
                                editMessageBtn.style.display = 'flex';
                            }
                        } else {
                            // Mesaj yoksa direkt düzenleme modu
                            messageDisplay.style.display = 'none';
                            messageInputContainer.style.display = 'block';
                            dailyMessageInput.value = '';
                            if (editMessageBtn) {
                                editMessageBtn.style.display = 'none';
                            }
                        }
                        
                        // Düzenle butonu
                        if (editMessageBtn) {
                            const newEditBtn = editMessageBtn.cloneNode(true);
                            editMessageBtn.parentNode.replaceChild(newEditBtn, editMessageBtn);
                            newEditBtn.addEventListener('click', () => {
                                // Düzenleme moduna geç
                                messageDisplay.style.display = 'none';
                                messageInputContainer.style.display = 'block';
                                dailyMessageInput.value = profile.daily_message || '';
                                dailyMessageInput.focus();
                                newEditBtn.style.display = 'none';
                            });
                        }
                        
                        // İptal butonu
                        if (cancelMessageBtn) {
                            const newCancelBtn = cancelMessageBtn.cloneNode(true);
                            cancelMessageBtn.parentNode.replaceChild(newCancelBtn, cancelMessageBtn);
                            newCancelBtn.addEventListener('click', () => {
                                // Görüntüleme moduna geri dön
                                messageDisplay.style.display = 'block';
                                messageInputContainer.style.display = 'none';
                                dailyMessageInput.value = profile.daily_message || '';
                                if (editMessageBtn) {
                                    editMessageBtn.style.display = 'flex';
                                }
                            });
                        }
                        
                        // Mesaj kaydetme butonu
                        if (saveMessageBtn) {
                            const newSaveBtn = saveMessageBtn.cloneNode(true);
                            saveMessageBtn.parentNode.replaceChild(newSaveBtn, saveMessageBtn);
                            newSaveBtn.addEventListener('click', async () => {
                                const messageText = dailyMessageInput.value.trim();
                                if (messageText.length > 0 && messageText.length <= 100) {
                                    await updateDailyMessage(profile.id, messageText);
                                    // Görüntüleme moduna geç
                                    messageDisplay.style.display = 'block';
                                    messageInputContainer.style.display = 'none';
                                    messageDisplay.textContent = messageText;
                                    if (editMessageBtn) {
                                        editMessageBtn.style.display = 'flex';
                                    }
                                } else {
                                    showAlert('Mesaj 1-100 karakter arasında olmalıdır.', 'Uyarı', 'warning');
                                }
                            });
                        }
                    } else {
                        // Başkasının profili - sadece mesajı göster
                        messageDisplay.style.display = 'block';
                        messageInputContainer.style.display = 'none';
                        messageDisplay.textContent = profile.daily_message;
                        if (editMessageBtn) {
                            editMessageBtn.style.display = 'none';
                        }
                    }
                } else {
                    messageSection.style.display = 'none';
                }
            });
        }
        
        // Paylaş Butonunu Bul ve Bağla
        const shareBtn = document.getElementById('share-profile-btn');
        if (shareBtn) {
            // Önceki listener'ları temizlemek için klonlama yöntemi
            const newShareBtn = shareBtn.cloneNode(true);
            shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
            
            newShareBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Modalın kapanmasını engelle
                shareProfile(profile.id);
            });
        }
        
        // Şikayet Butonunu Bul ve Bağla
        const reportBtn = document.getElementById('report-profile-btn');
        if (reportBtn) {
            const newReportBtn = reportBtn.cloneNode(true);
            reportBtn.parentNode.replaceChild(newReportBtn, reportBtn);
            
            newReportBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openReportModal(profile.id);
            });
        }
        
        // ✅ İstatistikleri göster
        displayProfileStats(profile);
        
        profileDetailModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        console.warn('Profile detail modal bulunamadı');
    }
}

// Close profile detail modal
function closeProfileDetailModal() {
    if (profileDetailModal) {
        profileDetailModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // URL'de deep link parametresi varsa temizle
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('u') || urlParams.get('id')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// Update filter visibility based on zoom level - Artık kullanılmıyor, scroll ile kontrol ediliyor
function updateFilterVisibility() {
    // Filtre artık harita dışında ve scroll ile kontrol ediliyor
    // Bu fonksiyon boş bırakıldı, eski kod uyumluluğu için
}

// Select profile gender (in add profile modal)
function selectProfileGender(gender) {
    modalState.selectedGender = gender;
    
    if (profileGenderMaleBtn && profileGenderFemaleBtn) {
        if (gender === 'male') {
            profileGenderMaleBtn.classList.add('active');
            profileGenderFemaleBtn.classList.remove('active');
        } else if (gender === 'female') {
            profileGenderFemaleBtn.classList.add('active');
            profileGenderMaleBtn.classList.remove('active');
        }
    }
}

// Select filter gender
function selectFilterGender(gender) {
    filterState.gender = gender;
    
    if (genderAllBtn) {
        genderAllBtn.classList.toggle('active', gender === 'all');
    }
    if (genderMaleBtn) {
        genderMaleBtn.classList.toggle('active', gender === 'male');
    }
    if (genderFemaleBtn) {
        genderFemaleBtn.classList.toggle('active', gender === 'female');
    }
    
    applyFilters();
}

// Get all 81 cities from cities.json
async function getAllCities() {
    try {
        const response = await fetch('/data/cities.json');
        if (!response.ok) {
            throw new Error('Şehir listesi yüklenemedi');
        }
        const cities = await response.json();
        return cities.map(city => ({
            id: city.name.toLowerCase().replace(/\s+/g, '-').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c'),
            name: city.name
        }));
    } catch (error) {
        console.error('Şehir listesi yüklenirken hata:', error);
        return [];
    }
}

// Handle filter city input - 81 ilden autocomplete
async function handleFilterCityInput(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!citySuggestionsFilter) return;
    
    if (query.length < 1) {
        citySuggestionsFilter.classList.add('hidden');
        citySuggestionsFilter.innerHTML = '';
        filterState.city = '';
        return;
    }
    
    const normalizeQuery = (str) => {
        return str.toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
    };
    
    const normalizedQuery = normalizeQuery(query);
    
    // 81 ilden şehirleri al
    const allCities = await getAllCities();
    
    // Eşleşen şehirleri bul - en uygun olanı önce göster
    const matches = allCities.filter(city => {
        const normalizedName = normalizeQuery(city.name);
        return normalizedName.includes(normalizedQuery);
    }).sort((a, b) => {
        // Tam eşleşme öncelikli
        const aStarts = normalizeQuery(a.name).startsWith(normalizedQuery);
        const bStarts = normalizeQuery(b.name).startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name, 'tr');
    }).slice(0, 8);
    
    if (matches.length > 0) {
        citySuggestionsFilter.innerHTML = matches.map(city => {
            return `<div class="city-suggestion" data-city-id="${city.id}" data-city-name="${city.name}">
                ${city.name}
            </div>`;
        }).join('');
        citySuggestionsFilter.classList.remove('hidden');
        
        // Add click listeners
        citySuggestionsFilter.querySelectorAll('.city-suggestion').forEach(item => {
            item.addEventListener('click', () => {
                const cityId = item.getAttribute('data-city-id');
                const cityName = item.getAttribute('data-city-name');
                filterState.city = cityName;
                if (filterCityInput) {
                    filterCityInput.value = cityName;
                }
                citySuggestionsFilter.classList.add('hidden');
            });
        });
    } else {
        citySuggestionsFilter.classList.add('hidden');
    }
}


// Apply filters
function applyFilters() {
    // Update filter state from inputs
    if (ageMinInput) {
        filterState.ageMin = ageMinInput.value ? parseInt(ageMinInput.value) : null;
    }
    if (ageMaxInput) {
        filterState.ageMax = ageMaxInput.value ? parseInt(ageMaxInput.value) : null;
    }
    if (filterCityInput) {
        filterState.city = filterCityInput.value.trim();
    }
    if (filterDistrictInput) {
        filterState.district = filterDistrictInput.value.trim().toLowerCase();
    }
    
    // Filter profiles
    const filteredProfiles = mapState.profiles.filter(profile => {
        // Gender filter
        if (filterState.gender !== 'all' && profile.gender !== filterState.gender) {
            return false;
        }
        
        // Age filter
        if (filterState.ageMin !== null && (!profile.age || profile.age < filterState.ageMin)) {
            return false;
        }
        if (filterState.ageMax !== null && (!profile.age || profile.age > filterState.ageMax)) {
            return false;
        }
        
        // City filter
        if (filterState.city && profile.city) {
            const normalizeQuery = (str) => {
                return str.toLowerCase()
                    .replace(/ı/g, 'i')
                    .replace(/ğ/g, 'g')
                    .replace(/ü/g, 'u')
                    .replace(/ş/g, 's')
                    .replace(/ö/g, 'o')
                    .replace(/ç/g, 'c');
            };
            const normalizedCity = normalizeQuery(profile.city);
            const normalizedFilter = normalizeQuery(filterState.city);
            if (!normalizedCity.includes(normalizedFilter)) {
                return false;
            }
        }
        
        // District filter
        if (filterState.district && profile.district) {
            const normalizedDistrict = profile.district.toLowerCase();
            const normalizedFilter = filterState.district.toLowerCase();
            if (!normalizedDistrict.includes(normalizedFilter)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Update map visibility
    mapState.profiles.forEach(profile => {
        const profileElement = document.getElementById(profile.id);
        if (profileElement) {
            const isVisible = filteredProfiles.some(p => p.id === profile.id);
            profileElement.style.display = isVisible ? 'block' : 'none';
        }
    });
    
    // Render filter results list
    renderFilterResults(filteredProfiles);
}

// Render filter results - Yeni Grid Tasarım
function renderFilterResults(profiles) {
    if (!filterResultsList || !resultsCount) return;

    resultsCount.textContent = profiles.length;
    filterResultsList.innerHTML = '';

    if (profiles.length === 0) {
        filterResultsList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 30px; color: #666;">
                <p>😞</p>
                <p>Sonuç bulunamadı.</p>
            </div>`;
        return;
    }

    profiles.forEach(profile => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.onclick = () => {
            // Haritada profile git
            zoomToProfile(profile);
            // Detayı aç
            handleProfileClick(profile.id);
        };

        // Eğer resim yoksa varsayılan avatar
        const imgUrl = profile.imageUrl || 'https://via.placeholder.com/150';

        card.innerHTML = `
            <img src="${imgUrl}" alt="${profile.name}" class="result-avatar">
            <div class="result-name">${profile.name || ''}</div>
            <div class="result-city">${profile.city || ''}</div>
        `;
        
        filterResultsList.appendChild(card);
    });
}

// Profile Zoom Fonksiyonu
function zoomToProfile(profile) {
    if(!profile.x || !profile.y) return;

    // Haritayı profilin konumuna kaydır
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;
    
    // Zoom seviyesini artır
    mapState.scale = 2.5; 
    
    // Merkezleme hesabı: (EkranMerkezi - (ProfilKonumu * Scale))
    mapState.translateX = (containerWidth / 2) - (profile.x * mapState.scale);
    mapState.translateY = (containerHeight / 2) - (profile.y * mapState.scale);
    
    updateTransform();
}

// Clear all filters
function clearAllFilters() {
    filterState = {
        gender: 'all',
        ageMin: null,
        ageMax: null,
        city: '',
        district: ''
    };
    
    if (genderAllBtn) genderAllBtn.classList.add('active');
    if (genderMaleBtn) genderMaleBtn.classList.remove('active');
    if (genderFemaleBtn) genderFemaleBtn.classList.remove('active');
    
    if (ageMinInput) ageMinInput.value = '';
    if (ageMaxInput) ageMaxInput.value = '';
    if (filterCityInput) filterCityInput.value = '';
    if (filterDistrictInput) filterDistrictInput.value = '';
    
    applyFilters();
}

// ==================== AUTH FUNCTIONS ====================

// Get current user (Güvenli versiyon)
async function getCurrentUser() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Session hatası:', error);
            return null;
        }
        return session?.user || null;
    } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
        return null;
    }
}

// Check if user has a profile
async function checkUserHasProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Profil kontrolü hatası:', error);
            return false;
        }
        
        return !!data;
    } catch (error) {
        console.error('Profil kontrolü hatası:', error);
        return false;
    }
}

// Google ile giriş
async function signInWithGoogle() {
    try {
        // Vercel production için: Supabase otomatik olarak doğru URL'ye yönlendirecek
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) {
            console.error("Google giriş hatası:", error.message);
            showAlert('Giriş yapılırken bir hata oluştu: ' + error.message, 'Giriş Hatası', 'error');
        }
    } catch (error) {
        console.error("Google giriş hatası:", error);
        showAlert('Giriş yapılırken bir hata oluştu.', 'Giriş Hatası', 'error');
    }
}

// Çıkış yap
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Çıkış hatası:', error);
            showAlert('Çıkış yapılırken bir hata oluştu.', 'Hata', 'error');
        } else {
            checkAuthState();
            closeEditProfileModal();
        }
    } catch (error) {
        console.error('Çıkış hatası:', error);
    }
}

// Auth state kontrolü
async function checkAuthState() {
    const user = await getCurrentUser();
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    
    if (user) {
        // Kullanıcı giriş yapmış
        if (userProfileDropdown) userProfileDropdown.style.display = 'block';
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        
        // Kullanıcı bilgilerini göster
        if (userAvatar) {
            userAvatar.src = user.user_metadata?.avatar_url || 'https://via.placeholder.com/32';
            userAvatar.style.display = 'block';
        }
        if (userName) {
            userName.textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı';
        }
    } else {
        // Kullanıcı giriş yapmamış
        if (userProfileDropdown) userProfileDropdown.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
    }
}

// Auth modal aç
function openAuthModal() {
    if (authModal) {
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Auth modal kapat
function closeAuthModal() {
    if (authModal) {
        authModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Setup auth listeners
function setupAuthListeners() {
    if (closeAuthModalBtn) {
        closeAuthModalBtn.addEventListener('click', closeAuthModal);
    }
    
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', signInWithGoogle);
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
    }
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeAuthModal();
            openEditProfileModal();
        });
    }
    
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }
}

// ==================== EDIT PROFILE FUNCTIONS ====================

// Edit profile modal aç
async function openEditProfileModal() {
    const user = await getCurrentUser();
    if (!user) {
        openAuthModal();
        return;
    }
    
    // Kullanıcının profilini yükle
    const profile = await loadUserProfile(user.id);
    if (!profile) {
        showAlert('Profil bulunamadı.', 'Hata', 'error');
        return;
    }
    
    // Form alanlarını doldur
    if (document.getElementById('edit-username-input')) {
        document.getElementById('edit-username-input').value = profile.name || '';
    }
    if (document.getElementById('edit-city-input')) {
        document.getElementById('edit-city-input').value = profile.city_name || '';
    }
    if (document.getElementById('edit-district-input')) {
        document.getElementById('edit-district-input').value = profile.district || '';
    }
    if (document.getElementById('edit-age-input')) {
        document.getElementById('edit-age-input').value = profile.age || '';
    }
    if (document.getElementById('edit-snapchat-input')) {
        document.getElementById('edit-snapchat-input').value = profile.snapchat_username || '';
    }
    if (document.getElementById('edit-instagram-input')) {
        document.getElementById('edit-instagram-input').value = profile.instagram_username || '';
    }
    if (document.getElementById('edit-twitter-input')) {
        document.getElementById('edit-twitter-input').value = profile.twitter_username || '';
    }
    if (document.getElementById('edit-facebook-input')) {
        document.getElementById('edit-facebook-input').value = profile.facebook_username || '';
    }
    if (document.getElementById('edit-pinterest-input')) {
        document.getElementById('edit-pinterest-input').value = profile.pinterest_username || '';
    }
    
    // Cinsiyet seçimi
    if (profile.gender === 'male' && document.getElementById('edit-gender-male')) {
        document.getElementById('edit-gender-male').classList.add('active');
        document.getElementById('edit-gender-female')?.classList.remove('active');
    } else if (profile.gender === 'female' && document.getElementById('edit-gender-female')) {
        document.getElementById('edit-gender-female').classList.add('active');
        document.getElementById('edit-gender-male')?.classList.remove('active');
    }
    
    // Mevcut fotoğrafı göster
    if (profile.image_url && document.getElementById('edit-current-photo')) {
        document.getElementById('edit-current-photo').src = profile.image_url;
        document.getElementById('edit-current-photo').style.display = 'block';
    }
    
    if (editProfileModal) {
        editProfileModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Edit profile modal kapat
function closeEditProfileModal() {
    if (editProfileModal) {
        editProfileModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Edit modal state'i temizle
        editModalState.selectedFile = null;
        editModalState.croppedImage = null;
        editModalState.cropImageSrc = null;
        
        // Crop canvas ve controls'ü temizle
        const editCropCanvas = document.getElementById('edit-crop-canvas');
        const editCropControls = document.getElementById('edit-crop-controls');
        if (editCropCanvas) {
            editCropCanvas.classList.add('hidden');
            const ctx = editCropCanvas.getContext('2d');
            ctx.clearRect(0, 0, editCropCanvas.width, editCropCanvas.height);
        }
        if (editCropControls) {
            editCropControls.classList.add('hidden');
        }
    }
}

// Kullanıcının profilini yükle
async function loadUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.error('Profil yükleme hatası:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Profil yükleme hatası:', error);
        return null;
    }
}

// Profil güncelle
async function updateProfile() {
    const user = await getCurrentUser();
    if (!user) {
        showAlert('Giriş yapmanız gerekiyor.', 'Giriş Gerekli', 'warning');
        return;
    }
    
    const profile = await loadUserProfile(user.id);
    if (!profile) {
        showAlert('Profil bulunamadı.', 'Hata', 'error');
        return;
    }
    
    // Form verilerini al
    const name = document.getElementById('edit-username-input')?.value.trim();
    const city = document.getElementById('edit-city-input')?.value.trim();
    const district = document.getElementById('edit-district-input')?.value.trim();
    const age = document.getElementById('edit-age-input')?.value ? parseInt(document.getElementById('edit-age-input').value) : null;
    const snapchat = document.getElementById('edit-snapchat-input')?.value.trim() || null;
    const instagram = document.getElementById('edit-instagram-input')?.value.trim() || null;
    const twitter = document.getElementById('edit-twitter-input')?.value.trim() || null;
    const facebook = document.getElementById('edit-facebook-input')?.value.trim() || null;
    const pinterest = document.getElementById('edit-pinterest-input')?.value.trim() || null;
    
    const genderMale = document.getElementById('edit-gender-male');
    const gender = genderMale?.classList.contains('active') ? 'male' : 
                  (document.getElementById('edit-gender-female')?.classList.contains('active') ? 'female' : null);
    
    // Fotoğraf güncelleme (eğer yeni fotoğraf seçildiyse)
    let imageUrl = profile.image_url;
    
    // Önce kırpılmış resmi kontrol et
    if (editModalState.croppedImage) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        imageUrl = await uploadImageToSupabase(editModalState.croppedImage, fileName);
    } else if (editModalState.selectedFile) {
        // Kırpılmamış ama seçilmiş dosya varsa onu yükle
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
        imageUrl = await uploadImageToSupabase(editModalState.selectedFile, fileName);
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                name: name,
                image_url: imageUrl,
                city_name: city,
                district: district,
                age: age,
                snapchat_username: snapchat,
                instagram_username: instagram,
                twitter_username: twitter,
                facebook_username: facebook,
                pinterest_username: pinterest,
                gender: gender,
                updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);
        
        if (error) {
            console.error('Profil güncelleme hatası:', error);
            showAlert('Profil güncellenirken bir hata oluştu: ' + error.message, 'Hata', 'error');
        } else {
            showAlert('Profil başarıyla güncellendi!', 'Başarılı', 'success');
            closeEditProfileModal();
            // Profilleri yeniden yükle
            loadProfilesFromSupabase();
        }
    } catch (error) {
        console.error('Profil güncelleme hatası:', error);
        showAlert('Profil güncellenirken bir hata oluştu.', 'Hata', 'error');
    }
}

// Profil sil
async function deleteProfile() {
    const confirmed = await showConfirm('Hesabı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', 'Hesabı Sil', 'warning');
    if (!confirmed) {
        return;
    }
    
    const user = await getCurrentUser();
    if (!user) {
        showAlert('Giriş yapmanız gerekiyor.', 'Giriş Gerekli', 'warning');
        return;
    }
    
    const profile = await loadUserProfile(user.id);
    if (!profile) {
        showAlert('Profil bulunamadı.', 'Hata', 'error');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.id);
        
        if (error) {
            console.error('Profil silme hatası:', error);
            showAlert('Profil silinirken bir hata oluştu: ' + error.message, 'Hata', 'error');
        } else {
            showAlert('Profil başarıyla silindi!', 'Başarılı', 'success');
            closeEditProfileModal();
            // Profilleri yeniden yükle
            loadProfilesFromSupabase();
        }
    } catch (error) {
        console.error('Profil silme hatası:', error);
        showAlert('Profil silinirken bir hata oluştu.', 'Hata', 'error');
    }
}

// Setup edit profile listeners
function setupEditProfileListeners() {
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeEditProfileModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', closeEditProfileModal);
    }
    
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', updateProfile);
    }
    
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', deleteProfile);
    }
    
    if (editProfileModal) {
        editProfileModal.addEventListener('click', (e) => {
            if (e.target === editProfileModal) {
                closeEditProfileModal();
            }
        });
    }
    
    // Edit photo upload
    const editPhotoInput = document.getElementById('edit-photo-input');
    const editPhotoUploadArea = document.getElementById('edit-photo-upload-area');
    if (editPhotoInput && editPhotoUploadArea) {
        editPhotoUploadArea.addEventListener('click', () => editPhotoInput.click());
        editPhotoInput.addEventListener('change', handleEditPhotoSelect);
    }
    
    // Edit crop buttons
    const editCropApply = document.getElementById('edit-crop-apply');
    const editCropCancel = document.getElementById('edit-crop-cancel');
    if (editCropApply) {
        editCropApply.addEventListener('click', applyEditCrop);
    }
    if (editCropCancel) {
        editCropCancel.addEventListener('click', cancelEditCrop);
    }
    
    // Edit gender selection
    const editGenderMale = document.getElementById('edit-gender-male');
    const editGenderFemale = document.getElementById('edit-gender-female');
    if (editGenderMale) {
        editGenderMale.addEventListener('click', () => {
            editGenderMale.classList.add('active');
            editGenderFemale?.classList.remove('active');
        });
    }
    if (editGenderFemale) {
        editGenderFemale.addEventListener('click', () => {
            editGenderFemale.classList.add('active');
            editGenderMale?.classList.remove('active');
        });
    }
}

// ==================== HERO SECTION FUNCTIONS ====================

// Setup hero section listeners
function setupHeroListeners() {
    const heroStartBtn = document.getElementById('hero-start-btn');
    if (heroStartBtn) {
        heroStartBtn.addEventListener('click', () => {
            // Direkt hero section'ı gizle, haritayı göster
            hideHeroSection();
        });
    }
}

// Hide hero section
function hideHeroSection() {
    const heroSection = document.getElementById('hero-section');
    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    
    if (heroSection) {
        heroSection.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    // Haritayı göster
    if (mainContent) {
        mainContent.classList.add('visible');
    }
    
    // App container'a map-view class'ı ekle (navbar'ı sadeleştirmek için)
    if (appContainer) {
        appContainer.classList.add('map-view');
    }
    
    // "Haritayı Keşfet" butonuna basıldığında profilleri yükle
    // SVG'nin hazır olduğundan emin ol
    if (svg && svg.querySelector('#turkey-provinces')) {
        console.log('✓ Hero bölümü gizlendi, profiller yükleniyor...');
        loadProfilesFromSupabase();
    } else {
        console.warn('⚠ SVG henüz hazır değil, profiller yüklenemedi. Kısa bir süre sonra tekrar deneniyor...');
        // SVG hazır olana kadar bekle
        setTimeout(() => {
            if (svg && svg.querySelector('#turkey-provinces')) {
                console.log('✓ SVG hazır, profiller yükleniyor...');
                loadProfilesFromSupabase();
            } else {
                console.error('❌ SVG yüklenemedi, profiller gösterilemiyor');
            }
        }, 500);
    }
}

// Show hero section (if needed)
function showHeroSection() {
    const heroSection = document.getElementById('hero-section');
    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    
    if (heroSection) {
        heroSection.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    // Haritayı gizle
    if (mainContent) {
        mainContent.classList.remove('visible');
    }
    
    // App container'dan map-view class'ını kaldır (navbar'ı tam göster)
    if (appContainer) {
        appContainer.classList.remove('map-view');
    }
}

// ==================== DEEP LINKING SYSTEM ====================

// 1. URL'de Profil ID'si Var mı Kontrol Et (Karşılama)
function checkUrlForDeepLink() {
    // URL'den 'u' veya 'id' parametresini al
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('u') || urlParams.get('id');

    if (profileId) {
        console.log("🔗 Deep Link Tespit Edildi:", profileId);
        // Hero bölümünü gizle ki modal üstte görünsün
        // hideHeroSection içinde profiller yüklenecek
        hideHeroSection();
        
        // Profillerin yüklenmesini bekle (hideHeroSection içinde profiller yüklenecek)
        // Profiller yüklendikten sonra modalı aç
        let checkAttempts = 0;
        const maxAttempts = 10; // Maksimum 5 saniye bekle (10 * 500ms)
        
        const checkProfile = setInterval(() => {
            checkAttempts++;
            const profile = mapState.profiles.find(p => String(p.id) === String(profileId));
            
            if (profile) {
                clearInterval(checkProfile);
                console.log("✓ Profil bulundu, detay modalı açılıyor:", profile.name);
                // Sadece detay modalını aç (zoom yok)
                handleProfileClick(profile.id);
                
                // İsteğe bağlı: URL'yi temizle (kullanıcı gezinmeye devam ederse)
                // window.history.replaceState({}, document.title, window.location.pathname);
            } else if (checkAttempts >= maxAttempts) {
                clearInterval(checkProfile);
                console.warn("⚠ Profil yüklenemedi veya bulunamadı:", profileId);
                showToast("Aradığın profil bulunamadı veya silinmiş.");
            }
            // Eğer profil henüz bulunamadıysa ve max deneme sayısına ulaşılmadıysa, devam et
        }, 500); // Her 500ms'de bir kontrol et
        
        // Maksimum bekleme süresi sonunda temizle
        setTimeout(() => {
            clearInterval(checkProfile);
        }, maxAttempts * 500);
    }
}

// 2. Profili Paylaş (Link Oluştur ve Kopyala)
async function shareProfile(profileId) {
    if (!profileId) return;

    // ✅ SPAM KONTROLÜ (SessionStorage ile aynı oturumda tekrar sayma)
    const sharedKey = `shared_${profileId}`;
    const hasShared = sessionStorage.getItem(sharedKey);

    // Link formatı: https://mapfy.vercel.app/?u=PROFIL_ID
    const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `${window.location.origin}${window.location.pathname}` 
        : 'https://mapfy.vercel.app';
    const shareUrl = `${baseUrl}?u=${profileId}`;

    // Mobil Cihazlar İçin Native Paylaşım Menüsü
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'MapHypee Profilim',
                text: 'Beni haritada bul!',
                url: shareUrl
            });
            
            // ✅ Paylaşım başarılı oldu - Share Count artır
            if (!hasShared) {
                incrementShareCount(profileId);
                sessionStorage.setItem(sharedKey, 'true');
                // UI'da anlık geri bildirim için local state'i güncelle
                const profile = mapState.profiles.find(p => p.id === profileId);
                if (profile && profile.share_count !== undefined) {
                    profile.share_count = (profile.share_count || 0) + 1;
                    // Modal açıksa istatistikleri güncelle
                    displayProfileStats(profile);
                }
            }
            return;
        } catch (err) {
            // Paylaşım iptal edilirse veya hata olursa panoya kopyalamayı dene
            // İptal edilirse sayacı artırma
            if (err.name !== 'AbortError') {
                // Hata varsa sayacı artır (sadece gerçek paylaşımda)
                if (!hasShared) {
                    incrementShareCount(profileId);
                    sessionStorage.setItem(sharedKey, 'true');
                }
            }
        }
    }

    // Masaüstü İçin Panoya Kopyalama
    try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Profil linki kopyalandı! 🔗");
        
        // ✅ Panoya kopyalama başarılı - Share Count artır
        if (!hasShared) {
            incrementShareCount(profileId);
            sessionStorage.setItem(sharedKey, 'true');
            // UI'da anlık geri bildirim için local state'i güncelle
            const profile = mapState.profiles.find(p => p.id === profileId);
            if (profile && profile.share_count !== undefined) {
                profile.share_count = (profile.share_count || 0) + 1;
                // Modal açıksa istatistikleri güncelle
                displayProfileStats(profile);
            }
        }
    } catch (err) {
        console.error('Link kopyalanamadı:', err);
        // Fallback: Linki göster ve kopyalama talimatı ver
        showAlert(`Linki kopyalamak için: ${shareUrl}`, 'Linki Kopyala', 'info');
    }
}

// 3. Bildirim Göster (Toast)
function showToast(message) {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<span>✅</span> ${message}`;
    
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== EDIT PROFILE PHOTO CROPPING ====================

// Handle edit photo select
function handleEditPhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showAlert('Lütfen bir resim dosyası seçin', 'Hata', 'error');
        return;
    }
    
    editModalState.selectedFile = file;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const editUploadPreview = document.getElementById('edit-upload-preview');
        const editCropCanvas = document.getElementById('edit-crop-canvas');
        const editCropControls = document.getElementById('edit-crop-controls');
        
        if (!editUploadPreview || !editCropCanvas) return;
        
        // Hide preview, show canvas
        editUploadPreview.classList.add('hidden');
        editCropCanvas.classList.remove('hidden');
        
        const img = new Image();
        img.onload = () => {
            const maxWidth = 400;
            const maxHeight = 400;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = width * ratio;
                height = height * ratio;
            }
            
            editCropCanvas.width = width;
            editCropCanvas.height = height;
            
            const imageSrc = event.target.result;
            editModalState.cropImageSrc = imageSrc;
            
            const ctx = editCropCanvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            // Show crop controls
            if (editCropControls) {
                editCropControls.classList.remove('hidden');
            }
            
            // Initial crop square
            const size = Math.min(width, height) * 0.8;
            const x = (width - size) / 2;
            const y = (height - size) / 2;
            
            drawCropOverlay(ctx, width, height, x, y, size);
            
            editModalState.cropStartX = x;
            editModalState.cropStartY = y;
            editModalState.cropEndX = x + size;
            editModalState.cropEndY = y + size;
            
            // Add click handler
            editCropCanvas.removeEventListener('click', handleEditCropClick);
            editCropCanvas.addEventListener('click', handleEditCropClick);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Handle edit crop click
function handleEditCropClick(e) {
    const editCropCanvas = document.getElementById('edit-crop-canvas');
    if (!editCropCanvas) return;
    
    const rect = editCropCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const size = Math.min(editCropCanvas.width, editCropCanvas.height) * 0.8;
    const x = Math.max(0, Math.min(clickX - size / 2, editCropCanvas.width - size));
    const y = Math.max(0, Math.min(clickY - size / 2, editCropCanvas.height - size));
    
    if (editModalState.cropImageSrc) {
        const img = new Image();
        img.onload = () => {
            const ctx = editCropCanvas.getContext('2d');
            ctx.clearRect(0, 0, editCropCanvas.width, editCropCanvas.height);
            ctx.drawImage(img, 0, 0, editCropCanvas.width, editCropCanvas.height);
            
            drawCropOverlay(ctx, editCropCanvas.width, editCropCanvas.height, x, y, size);
            
            editModalState.cropStartX = x;
            editModalState.cropStartY = y;
            editModalState.cropEndX = x + size;
            editModalState.cropEndY = y + size;
        };
        img.src = editModalState.cropImageSrc;
    }
}

// Apply edit crop
function applyEditCrop() {
    const editCropCanvas = document.getElementById('edit-crop-canvas');
    const editCropControls = document.getElementById('edit-crop-controls');
    const editUploadPreview = document.getElementById('edit-upload-preview');
    
    if (!editCropCanvas || !editModalState.selectedFile) return;
    
    const cropX = editModalState.cropStartX;
    const cropY = editModalState.cropStartY;
    const cropWidth = editModalState.cropEndX - editModalState.cropStartX;
    const cropHeight = editModalState.cropEndY - editModalState.cropStartY;
    
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
        croppedCtx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
        );
        
        croppedCanvas.toBlob((blob) => {
            editModalState.croppedImage = blob;
            
            // Hide canvas and controls, show preview
            if (editCropControls) editCropControls.classList.add('hidden');
            if (editCropCanvas) {
                editCropCanvas.classList.add('hidden');
                editCropCanvas.removeEventListener('click', handleEditCropClick);
            }
            
            if (editUploadPreview) {
                editUploadPreview.classList.remove('hidden');
                editUploadPreview.innerHTML = `<img src="${croppedCanvas.toDataURL()}" style="max-width: 100%; max-height: 120px; border-radius: 8px;">`;
            }
        }, 'image/png');
    };
    
    if (editModalState.cropImageSrc) {
        img.src = editModalState.cropImageSrc;
    }
}

// Cancel edit crop
function cancelEditCrop() {
    const editCropControls = document.getElementById('edit-crop-controls');
    const editCropCanvas = document.getElementById('edit-crop-canvas');
    const editUploadPreview = document.getElementById('edit-upload-preview');
    
    if (editCropControls) editCropControls.classList.add('hidden');
    if (editCropCanvas) {
        editCropCanvas.classList.add('hidden');
        const ctx = editCropCanvas.getContext('2d');
        ctx.clearRect(0, 0, editCropCanvas.width, editCropCanvas.height);
        editCropCanvas.removeEventListener('click', handleEditCropClick);
    }
    
    editModalState.croppedImage = null;
    editModalState.cropImageSrc = null;
    
    // Show preview again
    if (editUploadPreview && editModalState.selectedFile) {
        editUploadPreview.classList.remove('hidden');
        const reader = new FileReader();
        reader.onload = (e) => {
            editUploadPreview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 120px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(editModalState.selectedFile);
    }
}

// ==================== LEGAL/FOOTER SYSTEM ====================

// Legal modal içerikleri
const legalContents = {
    terms: {
        title: "Kullanıcı Sözleşmesi",
        content: `
            <h2>1. Genel Hükümler</h2>
            <p>Bu Kullanıcı Sözleşmesi ("Sözleşme"), MapHypee platformunu ("Platform", "Servis", "Site") kullanımınızı düzenler. Platformu kullanarak bu sözleşmenin tüm koşullarını kabul etmiş sayılırsınız.</p>
            
            <h3>1.1. Tanımlar</h3>
            <ul>
                <li><strong>MapHypee:</strong> Sosyal harita platformu</li>
                <li><strong>Kullanıcı:</strong> Platformu kullanan kişi</li>
                <li><strong>Profil:</strong> Kullanıcının oluşturduğu harita üzerindeki görünümü</li>
                <li><strong>İçerik:</strong> Platforma yüklenen tüm veri, fotoğraf ve bilgiler</li>
            </ul>
            
            <h2>2. Yaş Sınırı ve Kullanım Koşulları</h2>
            <p>Platformu kullanmak için <strong>18 yaş ve üzeri</strong> olmanız gerekmektedir. 18 yaş altındaki kişilerin platformu kullanması kesinlikle yasaktır.</p>
            
            <h2>3. Kullanıcı Yükümlülükleri</h2>
            <h3>3.1. Doğru Bilgi Verme</h3>
            <p>Kullanıcılar, Platformda paylaştıkları tüm bilgilerin doğru, güncel ve eksiksiz olduğunu taahhüt eder.</p>
            
            <h3>3.2. Yasaklanmış İçerikler</h3>
            <ul>
                <li>Çıplaklık, pornografik veya müstehcen içerikler</li>
                <li>Şiddet, nefret söylemi veya ayrımcılık içeren içerikler</li>
                <li>Sahte profil veya kimlik bilgileri</li>
                <li>Spam, dolandırıcılık veya yanıltıcı bilgiler</li>
                <li>Telif hakkı ihlali yapan içerikler</li>
                <li>18 yaş altı kişilerin profilleri</li>
            </ul>
            
            <h2>4. Sorumluluk Reddi</h2>
            <p>MapHypee, kullanıcılar arasındaki etkileşimlerden, paylaşılan içeriklerden veya harita üzerindeki konumlandırmalardan kaynaklanan hiçbir zarardan sorumlu değildir. Kullanıcılar kendi riskleriyle platformu kullanırlar.</p>
            
            <h2>5. Fikri Mülkiyet</h2>
            <p>Platformdaki tüm içerikler, tasarımlar ve yazılımlar MapHypee'ye aittir. Kullanıcılar kendi yükledikleri içeriklerin telif haklarını MapHypee'ye devrederler.</p>
            
            <h2>6. Hesap Kapatma</h2>
            <p>MapHypee, sözleşme ihlali, yasa dışı aktivite veya platformun güvenliğini tehdit eden durumlarda, önceden haber vermeksizin kullanıcı hesaplarını kapatabilir.</p>
            
            <h2>7. Değişiklikler</h2>
            <p>Bu sözleşme her zaman değiştirilebilir. Değişiklikler Platform üzerinde yayınlandıktan sonra yürürlüğe girer.</p>
            
            <p><strong>Son Güncelleme:</strong> Ocak 2026</p>
        `
    },
    privacy: {
        title: "Gizlilik Politikası & KVKK Aydınlatma Metni",
        content: `
            <h2>1. Veri Sorumlusu</h2>
            <p><strong>MapHypee</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla, kişisel verilerinizin işlenmesi konusunda aşağıdaki bilgileri sizlere sunuyoruz.</p>
            
            <h2>2. Toplanan Kişisel Veriler</h2>
            <h3>2.1. Kimlik Bilgileri</h3>
            <ul>
                <li>Ad, soyad</li>
                <li>Kullanıcı adı</li>
                <li>Profil fotoğrafı</li>
            </ul>
            
            <h3>2.2. İletişim Bilgileri</h3>
            <ul>
                <li>E-posta adresi (Google ile giriş yapıldığında)</li>
            </ul>
            
            <h3>2.3. Konum Bilgileri</h3>
            <ul>
                <li>Şehir bilgisi (tam adres değil, sadece şehir)</li>
                <li>İlçe bilgisi (isteğe bağlı)</li>
                <li>Harita üzerindeki yaklaşık konum koordinatları</li>
            </ul>
            
            <h3>2.4. Sosyal Medya Bilgileri</h3>
            <ul>
                <li>Snapchat, Instagram, Facebook, Twitter, Pinterest kullanıcı adları (isteğe bağlı)</li>
            </ul>
            
            <h3>2.5. Diğer Bilgiler</h3>
            <ul>
                <li>Yaş bilgisi (18+ doğrulaması için)</li>
                <li>Cinsiyet bilgisi (isteğe bağlı)</li>
            </ul>
            
            <h2>3. Verilerin İşlenme Amacı</h2>
            <ul>
                <li>Sosyal harita platformunun sunulması</li>
                <li>Kullanıcı hesaplarının yönetilmesi</li>
                <li>Platform güvenliğinin sağlanması</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                <li>Kullanıcı şikayetlerinin değerlendirilmesi</li>
            </ul>
            
            <h2>4. Verilerin Saklanma Süresi</h2>
            <p>Kişisel verileriniz, KVKK ve ilgili mevzuatın öngördüğü süreler boyunca veya işlenme amacının gerektirdiği süre içinde saklanmaktadır. Hesabınızı sildiğinizde verileriniz 30 gün içinde silinir.</p>
            
            <h2>5. Verilerin Paylaşılması</h2>
            <p>Kişisel verileriniz, yasal yükümlülükler hariç olmak üzere, <strong>üçüncü kişilerle paylaşılmamaktadır</strong>. Verileriniz sadece Supabase altyapısında güvenli bir şekilde saklanmaktadır.</p>
            
            <h2>6. Veri Güvenliği</h2>
            <p>Kişisel verilerinizin güvenliği için teknik ve idari önlemler alınmıştır. Verileriniz SSL şifreleme ve modern güvenlik protokolleri ile korunmaktadır.</p>
            
            <h2>7. KVKK Haklarınız</h2>
            <p>KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
            <ul>
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                <li>KVKK'da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
                <li>İşlenen verilerin münhasıran otomatik sistemler ile analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
            </ul>
            
            <h2>8. İletişim</h2>
            <p>KVKK haklarınızı kullanmak için: <strong>destek@maphypee.app</strong> adresine e-posta gönderebilirsiniz.</p>
            
            <p><strong>Son Güncelleme:</strong> Ocak 2026</p>
        `
    },
    cookies: {
        title: "Çerez Politikası & Tercihleri Yönet",
        content: `
            <h2>1. Çerez Nedir?</h2>
            <p>Çerezler, web sitelerinin bilgisayarınıza veya mobil cihazınıza kaydettiği küçük metin dosyalarıdır. MapHypee, platformun düzgün çalışması ve kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır.</p>
            
            <h2>2. Kullandığımız Çerez Türleri</h2>
            
            <h3>2.1. Zorunlu Çerezler</h3>
            <p>Bu çerezler platformun çalışması için gereklidir ve devre dışı bırakılamaz:</p>
            <ul>
                <li><strong>Oturum Çerezleri:</strong> Giriş yaptığınızda oturumunuzu korur</li>
                <li><strong>Güvenlik Çerezleri:</strong> Platform güvenliğini sağlar</li>
            </ul>
            
            <h3>2.2. Performans Çerezleri</h3>
            <p>Platformun performansını analiz etmek için kullanılır:</p>
            <ul>
                <li>Sayfa yükleme süreleri</li>
                <li>Hata raporları</li>
                <li>Kullanım istatistikleri</li>
            </ul>
            
            <h3>2.3. İşlevsellik Çerezleri</h3>
            <p>Kullanıcı tercihlerinizi hatırlamak için:</p>
            <ul>
                <li>Dil tercihleri</li>
                <li>Tema ayarları</li>
                <li>Filtre tercihleri</li>
            </ul>
            
            <h2>3. Üçüncü Taraf Çerezler</h2>
            <p>MapHypee, aşağıdaki hizmetler için üçüncü taraf çerezler kullanabilir:</p>
            <ul>
                <li><strong>Google Analytics:</strong> Platform kullanımını analiz etmek için</li>
                <li><strong>Supabase:</strong> Veritabanı ve kimlik doğrulama için</li>
            </ul>
            
            <h2>4. Çerez Tercihlerinizi Yönetme</h2>
            <p>Tarayıcı ayarlarınızdan çerezleri yönetebilirsiniz:</p>
            <ul>
                <li><strong>Chrome:</strong> Ayarlar > Gizlilik ve Güvenlik > Çerezler</li>
                <li><strong>Firefox:</strong> Seçenekler > Gizlilik ve Güvenlik > Çerezler</li>
                <li><strong>Safari:</strong> Tercihler > Gizlilik > Çerezler</li>
            </ul>
            
            <p><strong>Not:</strong> Çerezleri devre dışı bırakırsanız, platformun bazı özellikleri çalışmayabilir.</p>
            
            <h2>5. Çerez Saklama Süreleri</h2>
            <ul>
                <li><strong>Oturum Çerezleri:</strong> Tarayıcı kapatıldığında silinir</li>
                <li><strong>Kalıcı Çerezler:</strong> Maksimum 1 yıl saklanır</li>
            </ul>
            
            <h2>6. İletişim</h2>
            <p>Çerez politikası ile ilgili sorularınız için: <strong>destek@maphypee.app</strong></p>
            
            <p><strong>Son Güncelleme:</strong> Ocak 2026</p>
        `
    },
    community: {
        title: "Topluluk Kuralları",
        content: `
            <h2>1. Genel İlkeler</h2>
            <p>MapHypee, herkes için güvenli, saygılı ve hoş bir ortam sunmayı hedefler. Bu kurallara uymak, tüm kullanıcılarımızın sorumluluğundadır.</p>
            
            <h2>2. Profil Oluşturma Kuralları</h2>
            <h3>2.1. Gerçek Bilgiler</h3>
            <ul>
                <li>Sadece kendi adınıza profil oluşturabilirsiniz</li>
                <li>Gerçek kimlik bilgilerinizi kullanmalısınız</li>
                <li>Sahte profil oluşturmak kesinlikle yasaktır</li>
                <li>18 yaş ve üzeri olmalısınız</li>
            </ul>
            
            <h3>2.2. Profil Fotoğrafı</h3>
            <ul>
                <li>Kendi fotoğrafınızı kullanmalısınız</li>
                <li>Çıplaklık, pornografik veya müstehcen içerikler yasaktır</li>
                <li>Şiddet içeren görüntüler yasaktır</li>
                <li>Başkalarının fotoğraflarını izinsiz kullanmak yasaktır</li>
            </ul>
            
            <h2>3. Davranış Kuralları</h2>
            <h3>3.1. Saygı ve Nezaket</h3>
            <ul>
                <li>Tüm kullanıcılara saygılı davranmalısınız</li>
                <li>Hakaret, küfür veya nefret söylemi yasaktır</li>
                <li>Ayrımcılık yapmak yasaktır (ırk, din, cinsiyet, yönelim vb.)</li>
                <li>Zorbalık veya taciz yasaktır</li>
            </ul>
            
            <h3>3.2. Spam ve İstenmeyen İçerik</h3>
            <ul>
                <li>Spam mesajlar göndermek yasaktır</li>
                <li>Yanıltıcı veya dolandırıcılık içeren içerikler yasaktır</li>
                <li>İstenmeyen reklam veya promosyon içerikleri yasaktır</li>
            </ul>
            
            <h2>4. Yasal Uyum</h2>
            <ul>
                <li>Tüm Türkiye Cumhuriyeti yasalarına uymalısınız</li>
                <li>Yasa dışı aktiviteler yasaktır</li>
                <li>Telif hakkı ihlalleri yasaktır</li>
                <li>Başkalarının haklarını ihlal etmek yasaktır</li>
            </ul>
            
            <h2>5. İhlal ve Sonuçları</h2>
            <p>Bu kuralları ihlal eden kullanıcılar:</p>
            <ul>
                <li>Uyarı alabilir</li>
                <li>Geçici olarak engellenebilir</li>
                <li>Kalıcı olarak platformdan yasaklanabilir</li>
                <li>Yasal işleme tabi tutulabilir</li>
            </ul>
            
            <h2>6. Şikayet Sistemi</h2>
            <p>Kurallara aykırı içerik veya davranış gördüğünüzde, ilgili profili "Şikayet Et" butonunu kullanarak bildirebilirsiniz. Tüm şikayetler incelenmektedir.</p>
            
            <h2>7. İletişim</h2>
            <p>Sorularınız için: <strong>destek@maphypee.app</strong></p>
            
            <p><strong>Son Güncelleme:</strong> Ocak 2026</p>
        `
    },
    refund: {
        title: "İade ve İptal Politikası",
        content: `
            <h2>1. Genel Hükümler</h2>
            <p>MapHypee, <strong>ücretsiz bir platformdur</strong> ve herhangi bir ücret talep etmemektedir. Platformun tüm özellikleri kullanıcılarımıza bedelsiz olarak sunulmaktadır.</p>
            
            <h2>2. Ücretsiz Hizmet</h2>
            <p>MapHypee platformu:</p>
            <ul>
                <li>Ücretsiz kayıt ve profil oluşturma imkanı sunar</li>
                <li>Harita üzerinde konumlandırma hizmeti ücretsizdir</li>
                <li>Tüm sosyal medya entegrasyonları ücretsizdir</li>
                <li>Filtreleme ve arama özellikleri ücretsizdir</li>
            </ul>
            
            <h2>3. Gelecekteki Ücretli Hizmetler</h2>
            <p>İleride platforma eklenebilecek ücretli premium özellikler için:</p>
            <ul>
                <li>Tüm fiyatlandırma bilgileri önceden açıkça belirtilecektir</li>
                <li>Kullanıcılar satın alma öncesi bilgilendirilecektir</li>
                <li>İade politikaları ilgili hizmetin detaylarında yer alacaktır</li>
            </ul>
            
            <h2>4. Hesap İptali</h2>
            <p>Hesabınızı istediğiniz zaman silebilirsiniz. Hesap silme işlemi:</p>
            <ul>
                <li>Anında gerçekleşir</li>
                <li>Profiliniz haritadan kaldırılır</li>
                <li>Kişisel verileriniz 30 gün içinde kalıcı olarak silinir</li>
                <li>Geri alınamaz bir işlemdir</li>
            </ul>
            
            <h2>5. Hizmet Değişiklikleri</h2>
            <p>MapHypee, platform özelliklerini zaman zaman güncelleyebilir veya değiştirebilir. Bu değişiklikler:</p>
            <ul>
                <li>Kullanıcılara bildirilecektir</li>
                <li>Mevcut kullanıcı hesaplarını etkilemeyecektir</li>
                <li>Güvenlik veya yasal gereklilikler için yapılabilir</li>
            </ul>
            
            <h2>6. İletişim</h2>
            <p>İade veya hesap iptali ile ilgili sorularınız için: <strong>destek@maphypee.app</strong></p>
            
            <p><strong>Son Güncelleme:</strong> Ocak 2026</p>
            <p><strong>Not:</strong> MapHypee şu anda tamamen ücretsiz bir hizmettir. Herhangi bir ödeme alınmamaktadır.</p>
        `
    },
    faq: {
        title: "Sık Sorulan Sorular",
        content: `
            <h2>Genel Sorular</h2>
            
            <h3>MapHypee nedir?</h3>
            <p>MapHypee, Türkiye'nin sosyal haritasını oluşturan bir platformdur. Kullanıcılar harita üzerinde kendilerini konumlandırarak yeni bağlantılar kurabilir.</p>
            
            <h3>Ücretsiz mi?</h3>
            <p>Evet, MapHypee tamamen ücretsizdir. Kayıt, profil oluşturma ve tüm özellikler bedelsiz sunulmaktadır.</p>
            
            <h3>Yaş sınırı var mı?</h3>
            <p>Evet, platformu kullanmak için 18 yaş ve üzeri olmanız gerekmektedir.</p>
            
            <h2>Profil ve Güvenlik</h2>
            
            <h3>Kişisel bilgilerim güvende mi?</h3>
            <p>Evet, verileriniz SSL şifreleme ile korunmakta ve sadece gerekli bilgiler toplanmaktadır. Detaylı bilgi için Gizlilik Politikamızı okuyabilirsiniz.</p>
            
            <h3>Profilimi nasıl silebilirim?</h3>
            <p>Profil Ayarları bölümünden "Profili Sil" butonunu kullanarak hesabınızı silebilirsiniz.</p>
            
            <h3>Konumum gerçek adresimi gösteriyor mu?</h3>
            <p>Hayır, sadece şehir ve ilçe bilgisi gösterilmektedir. Tam adresiniz hiçbir zaman paylaşılmaz.</p>
            
            <h2>Teknik Sorular</h2>
            
            <h3>Hangi tarayıcıları destekliyorsunuz?</h3>
            <p>Chrome, Firefox, Safari ve Edge'in son sürümlerini destekliyoruz.</p>
            
            <h3>Mobilde kullanabilir miyim?</h3>
            <p>Evet, MapHypee tamamen mobil uyumludur ve tüm cihazlarda çalışır.</p>
            
            <h2>İletişim</h2>
            <p>Daha fazla soru için: <strong>destek@maphypee.app</strong></p>
        `
    },
    contact: {
        title: "İletişim",
        content: `
            <h2>Bize Ulaşın</h2>
            <p>MapHypee ekibi olarak sorularınız, önerileriniz ve destek talepleriniz için buradayız.</p>
            
            <h3>E-posta</h3>
            <p><strong>Genel İletişim:</strong> destek@maphypee.app</p>
            <p><strong>Şikayet ve Geri Bildirim:</strong> destek@maphypee.app</p>
            
            <h3>Yanıt Süresi</h3>
            <p>E-postalarınıza <strong>2-3 iş günü içinde</strong> yanıt veriyoruz.</p>
            
            <h3>KVKK Hakları</h3>
            <p>Kişisel verilerinizle ilgili talepleriniz için: <strong>destek@maphypee.app</strong></p>
            
            <h3>Sosyal Medya</h3>
            <p>Bizi sosyal medyadan takip edebilirsiniz (yakında).</p>
        `
    }
};

// Legal modal açma fonksiyonu
function openLegalModal(type) {
    const modal = document.getElementById('legal-modal');
    const titleEl = document.getElementById('legal-modal-title');
    const bodyEl = document.getElementById('legal-modal-body');
    
    if (!modal || !titleEl || !bodyEl) return;
    
    const content = legalContents[type];
    if (!content) return;
    
    titleEl.textContent = content.title;
    bodyEl.innerHTML = content.content;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Legal modal kapatma fonksiyonu
function closeLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ==================== REPORT SYSTEM ====================

// Report değişkenleri
let reportingProfileId = null;

// Şikayet modalını aç
function openReportModal(profileId) {
    reportingProfileId = profileId;
    const reportModal = document.getElementById('report-modal');
    if (reportModal) {
        reportModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Formu sıfırla
        const firstRadio = document.querySelector('input[name="report-reason"]');
        if (firstRadio) firstRadio.checked = true;
        const descTextarea = document.getElementById('report-description');
        if (descTextarea) descTextarea.value = '';
    }
}

// Şikayet modalını kapat
function closeReportModal() {
    const reportModal = document.getElementById('report-modal');
    if (reportModal) {
        reportModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    reportingProfileId = null;
}

// Şikayeti gönder
async function submitReport() {
    if (!reportingProfileId) return;

    const user = await getCurrentUser();
    if (!user) {
        showAlert("Raporlamak için giriş yapmalısınız.", "Giriş Gerekli", "warning");
        return;
    }

    const reasonInput = document.querySelector('input[name="report-reason"]:checked');
    if (!reasonInput) {
        showAlert("Lütfen bir sebep seçin.", "Eksik Bilgi", "warning");
        return;
    }

    const reason = reasonInput.value;
    const description = document.getElementById('report-description')?.value || '';
    const submitBtn = document.getElementById('submit-report-btn');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Gönderiliyor...";
    }

    try {
        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: user.id,
                reported_profile_id: reportingProfileId,
                reason: reason,
                description: description
            });

        if (error) throw error;

        await showAlert("Bildiriminiz alındı. İnceleme sonucunu e-posta ile bildireceğiz. Teşekkür ederiz.", "Başarılı", "success");
        closeReportModal();

    } catch (error) {
        console.error('Rapor hatası:', error);
        showAlert("Bir hata oluştu: " + error.message, "Hata", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Şikayet Et";
        }
    }
}

// ==================== CUSTOM ALERT & CONFIRM SYSTEM ====================

// Custom Alert Modal
function showAlert(message, title = 'Bilgi', type = 'info') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const iconEl = document.getElementById('custom-alert-icon');
        const titleEl = document.getElementById('custom-alert-title');
        const messageEl = document.getElementById('custom-alert-message');
        const buttonsEl = document.getElementById('custom-alert-buttons');
        const okBtn = document.getElementById('custom-alert-ok');

        if (!modal) {
            console.error('Custom alert modal bulunamadı');
            resolve();
            return;
        }

        // İkon tipine göre stil ayarla
        iconEl.className = 'custom-alert-icon';
        if (type === 'error') {
            iconEl.classList.add('error');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
        } else if (type === 'success') {
            iconEl.classList.add('success');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            `;
        } else if (type === 'warning') {
            iconEl.classList.add('warning');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            `;
        } else {
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            `;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Butonları temizle ve sadece Tamam butonu ekle
        buttonsEl.innerHTML = '';
        const okButton = document.createElement('button');
        okButton.className = 'btn-primary';
        okButton.textContent = 'Tamam';
        okButton.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            resolve();
        };
        buttonsEl.appendChild(okButton);

        // Modal overlay'e tıklayınca kapat
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                modal.removeEventListener('click', handleOverlayClick);
                resolve();
            }
        };
        modal.addEventListener('click', handleOverlayClick);

        // Modalı göster
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
}

// Custom Confirm Modal
function showConfirm(message, title = 'Onay', type = 'warning') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-alert-modal');
        const iconEl = document.getElementById('custom-alert-icon');
        const titleEl = document.getElementById('custom-alert-title');
        const messageEl = document.getElementById('custom-alert-message');
        const buttonsEl = document.getElementById('custom-alert-buttons');

        if (!modal) {
            console.error('Custom confirm modal bulunamadı');
            resolve(false);
            return;
        }

        // İkon tipine göre stil ayarla
        iconEl.className = 'custom-alert-icon';
        if (type === 'warning') {
            iconEl.classList.add('warning');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            `;
        } else {
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
        }

        titleEl.textContent = title;
        messageEl.textContent = message;

        // Butonları temizle ve İptal/Tamam butonları ekle
        buttonsEl.innerHTML = '';
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'btn-secondary';
        cancelButton.textContent = 'İptal';
        cancelButton.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            resolve(false);
        };
        
        const confirmButton = document.createElement('button');
        confirmButton.className = 'btn-primary';
        confirmButton.textContent = 'Tamam';
        confirmButton.onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            resolve(true);
        };
        
        buttonsEl.appendChild(cancelButton);
        buttonsEl.appendChild(confirmButton);

        // Modal overlay'e tıklayınca iptal et
        const handleOverlayClick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                modal.removeEventListener('click', handleOverlayClick);
                resolve(false);
            }
        };
        modal.addEventListener('click', handleOverlayClick);

        // Modalı göster
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
}

