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
const profileDetailModal = document.getElementById('profile-detail-modal');
const closeDetailModalBtn = document.getElementById('close-detail-modal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMap();
    setupEventListeners();
    setupModalListeners();
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
            
            // Harita yüklendikten sonra Supabase'den profilleri yükle
            setTimeout(() => {
                loadProfilesFromSupabase();
            }, 500);
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

// Modal Event Listeners
function setupModalListeners() {
    // Add profile button
    if (addProfileBtn) {
        addProfileBtn.addEventListener('click', openAddProfileModal);
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
function findPositionInCity(cityId) {
    // Şehir grubunu bul (farklı ID formatlarını dene)
    let cityGroup = svg.querySelector(`g[id*="${cityId}" i]`);
    if (!cityGroup) {
        const allGroups = svg.querySelectorAll('g[id]');
        cityGroup = Array.from(allGroups).find(g => {
            const id = g.id.toLowerCase();
            return id.includes(cityId.toLowerCase());
        });
    }
    
    if (!cityGroup) {
        console.warn(`Şehir bulunamadı: ${cityId}`);
        return null;
    }
    
    const path = cityGroup.querySelector('path');
    if (!path) {
        console.warn(`Şehir path'i bulunamadı: ${cityId}`);
        return null;
    }
    
    // Bounding box al - transform edilmemiş koordinat sisteminde
    // Not: getBBox() transform edilmemiş koordinatları verir
    const bbox = path.getBBox();
    // Profil boyutunu hesaba katarak padding hesapla (profil + border + güvenlik mesafesi)
    const profileRadius = 12; // Base size / 2 + border
    const padding = profileRadius + 8; // Profil yarıçapı + ekstra güvenlik mesafesi (artırıldı)
    
    // TÜM mevcut profilleri al (sadece aynı şehirdekiler değil, taşma kontrolü için)
    const allExistingProfiles = Array.from(mapState.profiles);
    // Aynı şehirdeki profiller (üst üste gelme kontrolü için)
    const sameCityProfiles = allExistingProfiles.filter(p => p.cityId === cityId);
    // Diğer şehirlerdeki profiller (taşma kontrolü için)
    const otherCityProfiles = allExistingProfiles.filter(p => p.cityId !== cityId);
    
    const minDistance = 40; // Aynı şehirdeki profiller arası minimum mesafe
    const minDistanceOtherCities = 25; // Diğer şehirlerdeki profillerden minimum mesafe (taşmaması için)
    
    // Şehir içinde geçerli ve diğer profillerden uzak bir nokta bul
    let attempts = 0;
    const maxAttempts = 300; // Daha fazla deneme hakkı
    
    while (attempts < maxAttempts) {
        // Merkeze yakın alanlarda daha fazla arama yap (daha şık görünüm)
        // Ama şehir büyüklüğüne göre daha esnek dağılım
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;
        
        // Şehir boyutuna göre arama alanını ayarla
        const citySize = Math.min(bbox.width, bbox.height);
        const maxDist = citySize * (0.3 + Math.random() * 0.2); // %30-50 arası (daha geniş dağılım)
        
        // Merkeze yakın rastgele nokta
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * maxDist;
        const randomX = centerX + Math.cos(angle) * distance;
        const randomY = centerY + Math.sin(angle) * distance;
        
        // Bounding box sınırları içinde mi kontrol et (profil boyutunu hesaba katarak)
        if (randomX < bbox.x + padding || randomX > bbox.x + bbox.width - padding ||
            randomY < bbox.y + padding || randomY > bbox.y + bbox.height - padding) {
            attempts++;
            continue;
        }
        
        const point = svg.createSVGPoint();
        point.x = randomX;
        point.y = randomY;
        
        try {
            // SVG path içinde olup olmadığını kontrol et (şehir sınırları)
            if (typeof path.isPointInFill === 'function' && path.isPointInFill(point)) {
                // Profil çemberinin tüm noktaları şehir içinde mi kontrol et
                let allPointsInCity = true;
                const checkPoints = [
                    { x: randomX, y: randomY }, // Merkez
                    { x: randomX + profileRadius, y: randomY }, // Sağ
                    { x: randomX - profileRadius, y: randomY }, // Sol
                    { x: randomX, y: randomY + profileRadius }, // Alt
                    { x: randomX, y: randomY - profileRadius }, // Üst
                    { x: randomX + profileRadius * 0.7, y: randomY + profileRadius * 0.7 }, // Sağ-alt
                    { x: randomX - profileRadius * 0.7, y: randomY - profileRadius * 0.7 }, // Sol-üst
                ];
                
                for (const checkPoint of checkPoints) {
                    const checkPointSVG = svg.createSVGPoint();
                    checkPointSVG.x = checkPoint.x;
                    checkPointSVG.y = checkPoint.y;
                    if (!path.isPointInFill(checkPointSVG)) {
                        allPointsInCity = false;
                        break;
                    }
                }
                
                if (allPointsInCity) {
                    // 1. Aynı şehirdeki profillerden yeterince uzak mı kontrol et (üst üste gelmesin)
                    let isFarEnoughFromSameCity = true;
                    for (const existingProfile of sameCityProfiles) {
                        const distance = Math.sqrt(
                            Math.pow(randomX - existingProfile.x, 2) + 
                            Math.pow(randomY - existingProfile.y, 2)
                        );
                        if (distance < minDistance) {
                            isFarEnoughFromSameCity = false;
                            break;
                        }
                    }
                    
                    // 2. Diğer şehirlerdeki profillerden uzak mı kontrol et (başka şehire taşmasın)
                    let isFarEnoughFromOtherCities = true;
                    for (const otherProfile of otherCityProfiles) {
                        const distance = Math.sqrt(
                            Math.pow(randomX - otherProfile.x, 2) + 
                            Math.pow(randomY - otherProfile.y, 2)
                        );
                        // Diğer şehirlerdeki profillere çok yakınsa, o şehir sınırları içinde olabilir
                        if (distance < minDistanceOtherCities) {
                            // Diğer şehir sınırları içinde mi kontrol et
                            try {
                                const otherCityGroup = svg.querySelector(`g[id*="${otherProfile.cityId}" i]`);
                                if (otherCityGroup) {
                                    const otherPath = otherCityGroup.querySelector('path');
                                    if (otherPath && typeof otherPath.isPointInFill === 'function') {
                                        const checkPoint = svg.createSVGPoint();
                                        checkPoint.x = randomX;
                                        checkPoint.y = randomY;
                                        // Eğer diğer şehir sınırları içindeyse, çok yakın
                                        if (otherPath.isPointInFill(checkPoint)) {
                                            isFarEnoughFromOtherCities = false;
                                            break;
                                        }
                                    }
                                }
                            } catch (e) {
                                // Hata durumunda güvenli tarafta kal
                                isFarEnoughFromOtherCities = false;
                                break;
                            }
                        }
                    }
                    
                    if (isFarEnoughFromSameCity && isFarEnoughFromOtherCities) {
                        return { x: randomX, y: randomY };
                    }
                }
            }
        } catch (e) {
            // Hata durumunda devam et
        }
        
        attempts++;
    }
    
    // Eğer geçerli nokta bulunamazsa, merkezi kullan (ama şehir içinde olduğundan emin ol)
    const centerPoint = svg.createSVGPoint();
    centerPoint.x = bbox.x + bbox.width / 2;
    centerPoint.y = bbox.y + bbox.height / 2;
    
    try {
        if (typeof path.isPointInFill === 'function' && path.isPointInFill(centerPoint)) {
            return { x: centerPoint.x, y: centerPoint.y };
        }
    } catch (e) {
        // Merkez de çalışmazsa, bbox merkezini kullan
    }
    
    return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };
}

function addProfileToMap(profile) {
    // Create profiles group if it doesn't exist
    let profilesGroup = svg.querySelector('#profiles-group');
    if (!profilesGroup) {
        profilesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        profilesGroup.id = 'profiles-group';
        // Profillerin harita efektlerinden bağımsız olması için
        profilesGroup.setAttribute('style', 'transform-style: flat; isolation: isolate;');
        svg.appendChild(profilesGroup);
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
    // Yüksek kalite için preserveAspectRatio optimize edildi
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice'); // Görseli yuvarlak içine tam oturt
    // Yüksek kalite için image-rendering optimize edildi
    // SVG image için kalite ayarları - pixelated kaldırıldı (kaliteyi düşürüyor)
    // Daha canlı ve net görünüm için filter efektleri eklendi
    image.setAttribute('style', 'image-rendering: -webkit-optimize-contrast; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges; image-rendering: auto; filter: contrast(1.2) saturate(1.25) brightness(1.08); -webkit-filter: contrast(1.2) saturate(1.25) brightness(1.08);');
    
    // Create ince siyah çizgi (şık görünüm için)
    const borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    borderCircle.setAttribute('class', 'profile-border');
    borderCircle.setAttribute('fill', 'none'); // İçi boş
    borderCircle.setAttribute('stroke', '#333'); // Siyah çizgi
    borderCircle.setAttribute('stroke-width', '0.3'); // Çok ince çizgi
    
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
    
    // İlk boyutlandırmayı yap
    updateProfileSizes();
}

// Profil boyutlarını zoom seviyesine göre güncelle (ters orantılı)
function updateProfileSizes() {
    const profilesGroup = svg.querySelector('#profiles-group');
    if (!profilesGroup) return;
    
    const profiles = profilesGroup.querySelectorAll('.snap-profile');
    
    profiles.forEach(profileGroup => {
        // Base koordinatlar SVG viewBox koordinat sisteminde
        // Bu koordinatlar scale edilmiş profiles-group içinde olduğu için
        // zaten doğru pozisyonda olmalılar (transform ile scale ediliyorlar)
        const baseX = parseFloat(profileGroup.getAttribute('data-base-x')) || 0;
        const baseY = parseFloat(profileGroup.getAttribute('data-base-y')) || 0;
        const baseSize = parseFloat(profileGroup.getAttribute('data-base-size')) || 12;
        
        // Ters orantılı boyutlandırma: zoom in (scale artar) → profil küçülür
        // Zoom out (scale azalır) → profil büyür
        // Daha agresif küçülme için optimize edildi
        const minSize = 8; // Minimum boyut (daha küçük)
        const maxSize = 18; // Maksimum boyut (daha küçük ve şık)
        
        // Daha agresif küçülme: zoom yapıldıkça profiller belirgin şekilde küçülsün
        // Formül: size = baseSize / scale^0.85 - daha agresif küçülme
        const scaleFactor = Math.pow(mapState.scale, 0.85); // 0.85 ile daha agresif küçülme
        const calculatedSize = baseSize / scaleFactor;
        const currentSize = Math.max(minSize, Math.min(maxSize, calculatedSize));
        
        // Image güncelle - baseX ve baseY zaten scale edilmiş koordinat sisteminde
        // çünkü profiles-group transform ile scale ediliyor
        const image = profileGroup.querySelector('.profile-image');
        if (image) {
            image.setAttribute('x', baseX - currentSize / 2);
            image.setAttribute('y', baseY - currentSize / 2);
            image.setAttribute('width', currentSize);
            image.setAttribute('height', currentSize);
        }
        
        // Border circle güncelle (ince siyah çizgi)
        const borderCircle = profileGroup.querySelector('.profile-border');
        if (borderCircle) {
            borderCircle.setAttribute('cx', baseX);
            borderCircle.setAttribute('cy', baseY);
            borderCircle.setAttribute('r', currentSize / 2); // Profil yarıçapı ile eşit
        }
        
        // Click area güncelle - sadece profil görselinin boyutu kadar
        // Zoom'da da etrafına basılınca açılmasın, sadece profil görseline basılınca açılsın
        const clickArea = profileGroup.querySelector('.profile-click-area');
        if (clickArea) {
            clickArea.setAttribute('cx', baseX);
            clickArea.setAttribute('cy', baseY);
            // Click area boyutu sadece profil görselinin yarıçapı kadar - zoom'da da aynı
            const clickAreaSize = currentSize / 2; // Profil görselinin tam yarıçapı - etrafına basılınca açılmasın
            clickArea.setAttribute('r', clickAreaSize);
        }
        
        // Clip path güncelle (objectBoundingBox kullanıldığı için güncelleme gerekmez)
        // Clip path zaten 0-1 arası koordinatlarla tanımlı, otomatik ölçekleniyor
    });
}

// ==================== SUPABASE INTEGRATION ====================

// Supabase'den tüm profilleri yükle
async function loadProfilesFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Supabase profil yükleme hatası:', error);
            return;
        }
        
        if (data && data.length > 0) {
            // Mevcut profilleri temizle
            mapState.profiles = [];
            const profilesGroup = svg.querySelector('#profiles-group');
            if (profilesGroup) {
                profilesGroup.innerHTML = '';
            }
            
            // Profilleri haritaya ekle
            data.forEach(profileData => {
                const profile = {
                    id: profileData.id,
                    name: profileData.name,
                    imageUrl: profileData.image_url,
                    cityId: profileData.city_id,
                    city: profileData.city_name,
                    x: parseFloat(profileData.position_x),
                    y: parseFloat(profileData.position_y),
                    snapchat_username: profileData.snapchat_username || profileData.name,
                };
                
                mapState.profiles.push(profile);
                addProfileToMap(profile);
            });
            
            console.log(`${data.length} profil Supabase'den yüklendi`);
        }
    } catch (error) {
        console.error('Profil yükleme hatası:', error);
    }
}

// Profil ekle (Supabase'e kaydet) - Updated with platforms
async function saveProfileToSupabase(profile) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .insert([
                {
                    name: profile.name,
                    image_url: profile.imageUrl,
                    city_id: profile.cityId,
                    city_name: profile.city,
                    position_x: profile.x,
                    position_y: profile.y,
                    snapchat_username: profile.snapchat_username || profile.name,
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
            throw error;
        }
        
        // Public URL al
        const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(data.path);
        
        console.log('Görsel Supabase Storage\'a yüklendi:', urlData.publicUrl);
        return urlData.publicUrl;
    } catch (error) {
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
    cropImageSrc: null // Crop için kullanılan görsel kaynağı
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
        alert('Lütfen bir resim dosyası seçin');
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
    
    // Fotoğrafı yeniden çiz
    const img = new Image();
    img.onload = () => {
        const ctx = cropCanvas.getContext('2d');
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
            
            // Update preview
            if (uploadPreview) {
                uploadPreview.innerHTML = `<img src="${croppedCanvas.toDataURL()}" alt="Cropped" class="preview-image">`;
            }
            
            // Hide crop controls
            if (cropControls) cropControls.classList.add('hidden');
            if (cropCanvas) {
                cropCanvas.classList.add('hidden');
                // Event listener'ları temizle
                cropCanvas.removeEventListener('click', handleCropClick);
                cropCanvas.removeEventListener('mousemove', handleCropHover);
            }
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
async function saveProfile() {
    // Validate form
    if (!modalState.croppedImage && !modalState.selectedFile) {
        alert('Lütfen bir profil fotoğrafı seçin');
        return;
    }
    
    if (!usernameInput || !usernameInput.value.trim()) {
        alert('Lütfen kullanıcı adınızı girin');
        return;
    }
    
    if (!modalState.selectedCity) {
        alert('Lütfen bir şehir seçin');
        return;
    }
    
    // Disable save button
    if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = '<span>Kaydediliyor...</span>';
    }
    
    try {
        // Upload image
        let imageUrl;
        if (modalState.croppedImage) {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            imageUrl = await uploadImageToSupabase(modalState.croppedImage, fileName);
        } else if (modalState.selectedFile) {
            imageUrl = await uploadImageToSupabase(modalState.selectedFile, modalState.selectedFile.name);
        }
        
        // Find position in city
        const position = findPositionInCity(modalState.selectedCity.id);
        if (!position) {
            throw new Error('Şehir içinde uygun konum bulunamadı');
        }
        
        // Create profile object
        const profile = {
            name: usernameInput.value.trim(),
            imageUrl: imageUrl,
            cityId: modalState.selectedCity.id,
            city: modalState.selectedCity.name,
            x: position.x,
            y: position.y,
            snapchat_username: usernameInput.value.trim(), // You can add separate input for this
        };
        
        // Save to Supabase
        const savedProfile = await saveProfileToSupabase(profile);
        
        // Add to map
        profile.id = savedProfile.id;
        mapState.profiles.push(profile);
        addProfileToMap(profile);
        
        // Close modal
        closeAddProfileModal();
        
        // Show success message
        alert('Profil başarıyla eklendi!');
        
    } catch (error) {
        console.error('Profil kaydetme hatası:', error);
        alert('Profil kaydedilirken bir hata oluştu: ' + error.message);
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

// Profile click handler - show detail modal
function handleProfileClick(profileId) {
    const profile = mapState.profiles.find(p => p.id === profileId);
    if (!profile) {
        console.warn('Profil bulunamadı:', profileId);
        return;
    }
    
    // Show profile detail modal
    if (profileDetailModal) {
        const detailImage = document.getElementById('detail-image');
        const detailName = document.getElementById('detail-name');
        const detailCity = document.getElementById('detail-city');
        const detailSnapchat = document.getElementById('detail-snapchat');
        
        if (detailImage) {
            detailImage.innerHTML = `<img src="${profile.imageUrl}" alt="${profile.name}">`;
        }
        if (detailName) {
            detailName.textContent = profile.name;
        }
        if (detailCity) {
            detailCity.textContent = `📍 ${profile.city}`;
        }
        if (detailSnapchat) {
            detailSnapchat.textContent = profile.snapchat_username ? `👻 ${profile.snapchat_username}` : '';
        }
        
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
    }
}


