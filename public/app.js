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
    profiles: []
};

// DOM elements
const svg = document.getElementById('svg-turkey');
const mapContainer = document.getElementById('map-container');
const loading = document.getElementById('loading');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const resetZoomBtn = document.getElementById('reset-zoom');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMap();
    setupEventListeners();
});

// Load SVG Map
async function loadMap() {
    try {
        // Gerçek SVG dosyasını yükle - önce turk.svg, sonra turkey.svg dene
        let response = await fetch('/turk.svg');
        if (!response.ok) {
            response = await fetch('/turkey.svg');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        const svgText = await response.text();
        
        // SVG içeriğini parse et
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        
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
            
            cityGroups.forEach(cityGroup => {
                // Her il grubunu kopyala
                const clonedGroup = cityGroup.cloneNode(true);
                clonedGroup.setAttributeNS(null, 'id', cityGroup.getAttribute('id'));
                
                // Path'leri bul ve class ekle
                const paths = clonedGroup.querySelectorAll('path');
                paths.forEach(path => {
                    // SVG namespace'inde class ekleme
                    const currentClass = path.getAttribute('class') || '';
                    const newClass = currentClass ? `${currentClass} province` : 'province';
                    path.setAttribute('class', newClass);
                    
                    // 3D efekt için gradient fill
                    path.setAttribute('fill', 'url(#land-3d-gradient)');
                    
                    const cityName = cityGroup.getAttribute('data-city-name') || cityGroup.id;
                    path.setAttribute('data-name', cityName);
                });
                
                provincesGroup.appendChild(clonedGroup);
            });
            
            svg.appendChild(provincesGroup);
            
            // Tüm şehir path'lerine event listener ekle
            setTimeout(() => {
                const provinces = svg.querySelectorAll('path.province');
                provinces.forEach(province => {
                    province.addEventListener('click', handleCityClick);
                });
                console.log(`${provinces.length} il yüklendi`);
            }, 100);
            
            // Harita yüklendikten sonra örnek profilleri ekle
            setTimeout(() => {
                addSampleProfiles();
            }, 500);
        } else {
            throw new Error('Turkey grubu bulunamadı');
        }
        
        loading.classList.add('hidden');
    } catch (error) {
        console.error('SVG yükleme hatası:', error);
        loading.textContent = 'Harita yüklenirken hata oluştu: ' + error.message;
        
        // Fallback: eski yöntemi kullan
        try {
            const svgContent = generateTurkeyMapSVG();
            svg.innerHTML = svgContent;
            
            const provinces = svg.querySelectorAll('.province');
            provinces.forEach(province => {
                province.addEventListener('click', handleCityClick);
            });
            
            loading.classList.add('hidden');
        } catch (fallbackError) {
            console.error('Fallback de başarısız:', fallbackError);
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
    const newScale = Math.max(minScale, Math.min(maxScale, mapState.scale * factor));
    
    // Zoom merkezine göre yapılırsa
    if (centerX !== null && centerY !== null) {
        const rect = mapContainer.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;
        
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = (mouseX - mapState.translateX) / mapState.scale;
        svgPoint.y = (mouseY - mapState.translateY) / mapState.scale;
        
        const scaleFactor = newScale / mapState.scale;
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
    
    // Update profiles group transform - Şehirlerle birlikte scale edilmeli (şehirler üzerinde sabit kalması için)
    if (profilesGroup) {
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
function addSampleProfiles() {
    // Sadece profile-image.png ile yeni profil ekle
    const profile = {
        id: 'profile-1',
        name: 'Profil',
        imageUrl: '/profile-image.png',
        cityId: 'istanbul'
    };
    
    // Profili İstanbul şehri içinde şık şekilde ekle
    const position = findPositionInCity(profile.cityId);
    if (position) {
        profile.x = position.x;
        profile.y = position.y;
        addProfileToMap(profile);
        mapState.profiles.push(profile);
    }
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
    
    // Bounding box al
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
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice'); // Görseli yuvarlak içine tam oturt
    
    // Create ince siyah çizgi (şık görünüm için)
    const borderCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    borderCircle.setAttribute('class', 'profile-border');
    borderCircle.setAttribute('fill', 'none'); // İçi boş
    borderCircle.setAttribute('stroke', '#333'); // Siyah çizgi
    borderCircle.setAttribute('stroke-width', '0.3'); // Çok ince çizgi
    
    profileGroup.appendChild(image);
    profileGroup.appendChild(borderCircle); // Çizgi en üstte görünsün
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
        
        // Image güncelle
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
        
        // Clip path güncelle (objectBoundingBox kullanıldığı için güncelleme gerekmez)
        // Clip path zaten 0-1 arası koordinatlarla tanımlı, otomatik ölçekleniyor
    });
}

