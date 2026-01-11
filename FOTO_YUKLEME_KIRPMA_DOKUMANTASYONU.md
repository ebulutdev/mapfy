# 📸 Fotoğraf Yükleme ve Kırpma Sistemi - Detaylı Dokümantasyon

Bu dokümantasyon, profil fotoğrafı yükleme ve kırpma sisteminin nasıl çalıştığını satır satır açıklar.

---

## 📋 İçindekiler

1. [DOM Elementleri](#dom-elementleri)
2. [Modal State Yapısı](#modal-state-yapısı)
3. [Event Listener'lar](#event-listenerlar)
4. [Ana Fonksiyonlar](#ana-fonksiyonlar)
5. [Çalışma Akışı](#çalışma-akışı)

---

## 🎯 DOM Elementleri

```javascript
// Satır 89-95: app.js
const photoInput = document.getElementById('photo-input');           // Gizli file input
const photoUploadArea = document.getElementById('photo-upload-area'); // Tıklanabilir alan
const uploadPreview = document.getElementById('upload-preview');    // Önizleme alanı
const cropCanvas = document.getElementById('crop-canvas');         // Kırpma canvas'ı
const cropControls = document.getElementById('crop-controls');    // Kırp/Kiptal butonları
const cropApplyBtn = document.getElementById('crop-apply');       // "Kırp" butonu
const cropCancelBtn = document.getElementById('crop-cancel');     // "İptal" butonu
```

**Açıklama:**
- `photoInput`: Kullanıcının dosya seçmesi için gizli `<input type="file">` elementi
- `photoUploadArea`: Kullanıcı buraya tıklayınca `photoInput.click()` tetiklenir
- `uploadPreview`: Seçilen fotoğrafın önizlemesi burada gösterilir
- `cropCanvas`: HTML5 Canvas elementi - fotoğraf burada çizilir ve kırpma karesi gösterilir
- `cropControls`: Kırpma butonlarının bulunduğu container

---

## 📦 Modal State Yapısı

```javascript
// Satır 2929-2939: app.js
let modalState = {
    selectedFile: null,        // Seçilen dosya objesi (File)
    croppedImage: null,        // Kırpılmış görsel (Blob)
    selectedCity: null,        // Seçilen şehir bilgisi
    cropStartX: 0,             // Kırpma karesinin başlangıç X koordinatı
    cropStartY: 0,             // Kırpma karesinin başlangıç Y koordinatı
    cropEndX: 0,               // Kırpma karesinin bitiş X koordinatı
    cropEndY: 0,               // Kırpma karesinin bitiş Y koordinatı
    isCropping: false,         // Kırpma işlemi devam ediyor mu?
    cropImageSrc: null,        // Kırpma için kullanılan görsel kaynağı (Data URL)
    selectedGender: null       // Seçilen cinsiyet
};
```

**Açıklama:**
- `selectedFile`: Kullanıcının seçtiği orijinal dosya
- `croppedImage`: Kırpma işlemi sonrası oluşan yeni görsel (Blob formatında)
- `cropImageSrc`: Canvas'ta çizim yapmak için kullanılan görsel kaynağı (Base64 Data URL)
- `cropStartX/Y` ve `cropEndX/Y`: Kırpma karesinin koordinatları

---

## 🎧 Event Listener'lar

### 1. Fotoğraf Input Event Listener

```javascript
// Satır 1123-1128: app.js
if (photoInput) {
    photoInput.addEventListener('change', handlePhotoSelect);
}
if (photoUploadArea) {
    photoUploadArea.addEventListener('click', () => photoInput?.click());
}
```

**Açıklama:**
- `photoInput` değiştiğinde (kullanıcı dosya seçtiğinde) `handlePhotoSelect` fonksiyonu çağrılır
- `photoUploadArea` tıklandığında gizli `photoInput` tetiklenir (dosya seçme dialogu açılır)

### 2. Kırpma Butonları Event Listener'ları

```javascript
// Satır 1130-1136: app.js
if (cropApplyBtn) {
    cropApplyBtn.addEventListener('click', applyCrop);
}
if (cropCancelBtn) {
    cropCancelBtn.addEventListener('click', cancelCrop);
}
```

**Açıklama:**
- "Kırp" butonuna tıklandığında `applyCrop` fonksiyonu çağrılır
- "İptal" butonuna tıklandığında `cancelCrop` fonksiyonu çağrılır

---

## 🔧 Ana Fonksiyonlar

### 1. `handlePhotoSelect(e)` - Fotoğraf Seçme İşlemi

```javascript
// Satır 3056-3083: app.js
function handlePhotoSelect(e) {
    // 1. Seçilen dosyayı al
    const file = e.target.files[0];
    if (!file) return;  // Dosya yoksa çık
    
    // 2. Dosya tipi kontrolü - sadece resim dosyaları kabul edilir
    if (!file.type.startsWith('image/')) {
        showAlert('Lütfen bir resim dosyası seçin', 'Hata', 'error');
        return;
    }
    
    // 3. Dosyayı modalState'e kaydet
    modalState.selectedFile = file;
    
    // 4. FileReader ile dosyayı Base64 Data URL'ye çevir
    const reader = new FileReader();
    reader.onload = (event) => {
        // 5. Yeni bir Image objesi oluştur
        const img = new Image();
        img.onload = () => {
            // 6. Önizleme alanına görseli göster
            if (uploadPreview) {
                uploadPreview.innerHTML = `<img src="${event.target.result}" alt="Preview" class="preview-image">`;
            }
            
            // 7. Kırpma canvas'ını hazırla
            setupCropCanvas(img, event.target.result);
        };
        // 8. Image objesine Data URL'yi yükle (bu onload'u tetikler)
        img.src = event.target.result;
    };
    // 9. Dosyayı Data URL formatına çevir (asenkron işlem)
    reader.readAsDataURL(file);
}
```

**Çalışma Mantığı:**
1. Kullanıcı dosya seçer → `e.target.files[0]` ile dosya alınır
2. Dosya tipi kontrol edilir → Sadece `image/*` formatları kabul edilir
3. FileReader ile dosya Base64 Data URL'ye çevrilir
4. Image objesi oluşturulur ve Data URL yüklenir
5. Görsel yüklendiğinde önizleme gösterilir ve kırpma canvas'ı hazırlanır

---

### 2. `setupCropCanvas(img, imageSrc)` - Kırpma Canvas'ını Hazırlama

```javascript
// Satır 3085-3137: app.js
function setupCropCanvas(img, imageSrc) {
    // 1. Canvas elementi kontrolü
    if (!cropCanvas) return;
    
    // 2. Maksimum boyut belirleme (performans için)
    const maxSize = 400;
    let width = img.width;
    let height = img.height;
    
    // 3. Eğer görsel çok büyükse küçült (aspect ratio korunarak)
    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = width * ratio;
        height = height * ratio;
    }
    
    // 4. Canvas boyutlarını ayarla
    cropCanvas.width = width;
    cropCanvas.height = height;
    cropCanvas.classList.remove('hidden');  // Canvas'ı göster
    cropCanvas.style.cursor = 'crosshair';  // İmleci crosshair yap
    
    // 5. Görsel kaynağını sakla (sonraki işlemler için)
    modalState.cropImageSrc = imageSrc;
    
    // 6. Canvas context'ini al
    const ctx = cropCanvas.getContext('2d');
    
    // 7. Canvas'ı temizle ve fotoğrafı çiz
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    // 8. Kırpma kontrollerini göster
    if (cropControls) {
        cropControls.classList.remove('hidden');
    }
    
    // 9. Başlangıç kırpma karesini hesapla (merkez, %80 boyut)
    const size = Math.min(width, height) * 0.8;  // Genişlik veya yükseklikten küçük olanın %80'i
    const x = (width - size) / 2;   // X koordinatı (ortalanmış)
    const y = (height - size) / 2;  // Y koordinatı (ortalanmış)
    
    // 10. Kırpma overlay'ini çiz (yeşil kare çizgisi)
    drawCropOverlay(ctx, width, height, x, y, size);
    
    // 11. Kırpma koordinatlarını kaydet
    modalState.cropStartX = x;
    modalState.cropStartY = y;
    modalState.cropEndX = x + size;
    modalState.cropEndY = y + size;
    
    // 12. Event listener'ları ekle (tıklama ve hover)
    cropCanvas.removeEventListener('click', handleCropClick);    // Önceki listener'ı temizle
    cropCanvas.removeEventListener('mousemove', handleCropHover); // Önceki listener'ı temizle
    cropCanvas.addEventListener('click', handleCropClick);       // Tıklama event'i
    cropCanvas.addEventListener('mousemove', handleCropHover);  // Hover event'i
}
```

**Çalışma Mantığı:**
1. Canvas boyutları görsel boyutlarına göre ayarlanır (maksimum 400px)
2. Görsel canvas'a çizilir
3. Merkeze yerleştirilmiş bir kırpma karesi (görselin %80'i) gösterilir
4. Kullanıcı canvas'a tıklayarak kareyi hareket ettirebilir

---

### 3. `drawCropOverlay(ctx, canvasWidth, canvasHeight, x, y, size)` - Kırpma Karesi Çizimi

```javascript
// Satır 3139-3169: app.js
function drawCropOverlay(ctx, canvasWidth, canvasHeight, x, y, size) {
    // 1. Kırpma karesi çizgisi - yeşil renk (#3ECF8E)
    ctx.strokeStyle = '#3ECF8E';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);  // Kesikli çizgi değil, düz çizgi
    ctx.strokeRect(x, y, size, size);  // Kare çiz
    
    // 2. Köşelerde küçük kareler (daha profesyonel görünüm için)
    const cornerSize = 15;  // Köşe karelerinin boyutu
    ctx.fillStyle = '#3ECF8E';
    
    // 3. Sol üst köşe
    ctx.fillRect(x - 2, y - 2, cornerSize, 3);      // Yatay çizgi
    ctx.fillRect(x - 2, y - 2, 3, cornerSize);       // Dikey çizgi
    
    // 4. Sağ üst köşe
    ctx.fillRect(x + size - cornerSize + 2, y - 2, cornerSize, 3);
    ctx.fillRect(x + size - 1, y - 2, 3, cornerSize);
    
    // 5. Sol alt köşe
    ctx.fillRect(x - 2, y + size - 1, cornerSize, 3);
    ctx.fillRect(x - 2, y + size - cornerSize + 2, 3, cornerSize);
    
    // 6. Sağ alt köşe
    ctx.fillRect(x + size - cornerSize + 2, y + size - 1, cornerSize, 3);
    ctx.fillRect(x + size - 1, y + size - cornerSize + 2, 3, cornerSize);
}
```

**Çalışma Mantığı:**
1. Yeşil renkli bir kare çizilir (kırpma alanı)
2. Köşelerde küçük kareler çizilir (kullanıcıya kırpma alanını gösterir)
3. Fotoğraf net görünür (karartma yok)

---

### 4. `handleCropClick(e)` - Canvas'a Tıklama (Kareyi Hareket Ettirme)

```javascript
// Satır 3171-3229: app.js
function handleCropClick(e) {
    // 1. Canvas ve dosya kontrolü
    if (!cropCanvas || !modalState.selectedFile) return;
    
    // 2. Tıklama koordinatlarını hesapla (ekran koordinatlarından canvas koordinatlarına)
    const rect = cropCanvas.getBoundingClientRect();  // Canvas'ın ekrandaki pozisyonu
    const clickX = e.clientX - rect.left;             // Mouse X koordinatı (canvas'a göre)
    const clickY = e.clientY - rect.top;               // Mouse Y koordinatı (canvas'a göre)
    
    // 3. Canvas koordinatlarını hesapla (scale dikkate alınarak)
    // Canvas'ın görünen boyutu ile gerçek boyutu farklı olabilir (CSS scaling)
    const scaleX = cropCanvas.width / rect.width;      // X ekseni scale faktörü
    const scaleY = cropCanvas.height / rect.height;    // Y ekseni scale faktörü
    const canvasX = clickX * scaleX;                   // Gerçek canvas X koordinatı
    const canvasY = clickY * scaleY;                   // Gerçek canvas Y koordinatı
    
    // 4. Kırpma karesinin boyutunu hesapla (görselin %80'i)
    const size = Math.min(cropCanvas.width, cropCanvas.height) * 0.8;
    
    // 5. Kareyi tıklama noktasının merkezine yerleştir (sınırlar içinde kalacak şekilde)
    const x = Math.max(0, Math.min(canvasX - size / 2, cropCanvas.width - size));
    const y = Math.max(0, Math.min(canvasY - size / 2, cropCanvas.height - size));
    
    // 6. Canvas context'ini al
    const ctx = cropCanvas.getContext('2d');
    
    // 7. Fotoğrafı yeniden çiz (overlay'i kaldırmak için)
    if (modalState.cropImageSrc) {
        const img = new Image();
        img.onload = () => {
            // 8. Canvas'ı temizle
            ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            // 9. Fotoğrafı tekrar çiz
            ctx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
            
            // 10. Yeni pozisyonda kırpma karesini çiz
            drawCropOverlay(ctx, cropCanvas.width, cropCanvas.height, x, y, size);
            
            // 11. Yeni koordinatları kaydet
            modalState.cropStartX = x;
            modalState.cropStartY = y;
            modalState.cropEndX = x + size;
            modalState.cropEndY = y + size;
        };
        // 12. Data URL'yi yükle (yeni HTTP isteği yapmaz, cache'den alır)
        img.src = modalState.cropImageSrc;
    } else {
        // 13. Fallback: Preview img'den kullan (zaten yüklenmiş)
        const previewImg = uploadPreview.querySelector('img');
        if (previewImg && previewImg.complete) {
            ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            ctx.drawImage(previewImg, 0, 0, cropCanvas.width, cropCanvas.height);
            
            drawCropOverlay(ctx, cropCanvas.width, cropCanvas.height, x, y, size);
            
            modalState.cropStartX = x;
            modalState.cropStartY = y;
            modalState.cropEndX = x + size;
            modalState.cropEndY = y + size;
        }
    }
}
```

**Çalışma Mantığı:**
1. Kullanıcı canvas'a tıklar
2. Tıklama koordinatları hesaplanır (ekran → canvas koordinatlarına dönüştürülür)
3. Kırpma karesi tıklama noktasının merkezine yerleştirilir
4. Fotoğraf yeniden çizilir ve yeni pozisyonda kırpma karesi gösterilir
5. Yeni koordinatlar `modalState`'e kaydedilir

---

### 5. `handleCropHover(e)` - Hover Efekti

```javascript
// Satır 3231-3235: app.js
function handleCropHover(e) {
    if (!cropCanvas) return;
    cropCanvas.style.cursor = 'crosshair';  // İmleci crosshair yap
}
```

**Açıklama:**
- Canvas üzerinde mouse hareket ederken imleç crosshair (artı işareti) olur
- Kullanıcıya tıklanabilir olduğunu gösterir

---

### 6. `applyCrop()` - Kırpma İşlemini Uygula

```javascript
// Satır 3237-3297: app.js
function applyCrop() {
    // 1. Canvas ve dosya kontrolü
    if (!cropCanvas || !modalState.selectedFile) return;
    
    // 2. Kırpma karesinin boyutunu hesapla
    const size = modalState.cropEndX - modalState.cropStartX;
    const x = modalState.cropStartX;
    const y = modalState.cropStartY;
    
    // 3. Orijinal görseli yükle
    const img = new Image();
    img.onload = () => {
        // 4. Geçici canvas oluştur (orijinal görseli çizmek için)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropCanvas.width;   // Canvas boyutları
        tempCanvas.height = cropCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 5. Orijinal görseli geçici canvas'a çiz
        tempCtx.drawImage(img, 0, 0, cropCanvas.width, cropCanvas.height);
        
        // 6. Kırpma alanındaki pixel verilerini al (ImageData)
        const imageData = tempCtx.getImageData(x, y, size, size);
        
        // 7. Yeni canvas oluştur (kırpılmış görsel için)
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = size;   // Kırpma karesinin boyutu
        croppedCanvas.height = size;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        // 8. Kırpılmış pixel verilerini yeni canvas'a kopyala
        croppedCtx.putImageData(imageData, 0, 0);
        
        // 9. Canvas'ı Blob'a çevir (dosya formatı)
        croppedCanvas.toBlob((blob) => {
            // 10. Kırpılmış görseli modalState'e kaydet
            modalState.croppedImage = blob;
            
            // 11. Önizleme alanını güncelle (kırpılmış görseli göster)
            if (uploadPreview) {
                uploadPreview.innerHTML = `<img src="${croppedCanvas.toDataURL()}" alt="Cropped" class="preview-image">`;
            }
            
            // 12. Kırpma kontrollerini ve canvas'ı gizle
            if (cropControls) cropControls.classList.add('hidden');
            if (cropCanvas) {
                cropCanvas.classList.add('hidden');
                // 13. Event listener'ları temizle
                cropCanvas.removeEventListener('click', handleCropClick);
                cropCanvas.removeEventListener('mousemove', handleCropHover);
            }
        }, 'image/png', 0.95);  // PNG formatında, %95 kalite
    };
    
    // 14. Görsel kaynağını yükle
    if (modalState.cropImageSrc) {
        img.src = modalState.cropImageSrc;  // Data URL'den yükle
    } else {
        // 15. Fallback: Preview img'den kullan
        const previewImg = uploadPreview.querySelector('img');
        if (previewImg) {
            img.src = previewImg.src;
        }
    }
}
```

**Çalışma Mantığı:**
1. Kırpma koordinatları `modalState`'ten alınır
2. Orijinal görsel yüklenir
3. Geçici canvas'a çizilir
4. Kırpma alanındaki pixel verileri (`ImageData`) alınır
5. Yeni bir canvas oluşturulur ve kırpılmış görsel buraya kopyalanır
6. Canvas Blob formatına çevrilir ve `modalState.croppedImage`'e kaydedilir
7. Önizleme güncellenir, kırpma kontrolleri gizlenir

---

### 7. `cancelCrop()` - Kırpma İşlemini İptal Et

```javascript
// Satır 3302-3317: app.js
function cancelCrop() {
    // 1. Kırpma kontrollerini gizle
    if (cropControls) cropControls.classList.add('hidden');
    
    // 2. Canvas'ı gizle ve temizle
    if (cropCanvas) {
        cropCanvas.classList.add('hidden');
        const ctx = cropCanvas.getContext('2d');
        // Canvas içeriğini temizle
        ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
        
        // 3. Event listener'ları temizle
        cropCanvas.removeEventListener('click', handleCropClick);
        cropCanvas.removeEventListener('mousemove', handleCropHover);
    }
    
    // 4. Modal state'ten kırpma ile ilgili verileri temizle
    modalState.croppedImage = null;  // Kırpılmış görsel yok
    modalState.cropImageSrc = null;  // Kırpma görsel kaynağı yok
    
    // 5. Önizleme alanını koru - kullanıcı zaten fotoğraf seçmiş
    // uploadPreview'ı sıfırlamıyoruz, kullanıcı orijinal fotoğrafı görebilir
}
```

**Çalışma Mantığı:**
1. Kırpma kontrolleri gizlenir
2. Canvas gizlenir ve içeriği temizlenir
3. Event listener'lar kaldırılır
4. Kırpma ile ilgili state temizlenir
5. Orijinal fotoğraf önizlemesi korunur (kullanıcı tekrar kırpma yapabilir)

---

## 🔄 Çalışma Akışı (Tam Süreç)

### Adım 1: Kullanıcı Fotoğraf Seçer
```
Kullanıcı "Fotoğraf Seç" alanına tıklar
  ↓
photoUploadArea.click() → photoInput.click()
  ↓
Dosya seçme dialogu açılır
  ↓
Kullanıcı dosya seçer
  ↓
handlePhotoSelect(e) çağrılır
```

### Adım 2: Dosya Okunur ve Önizleme Gösterilir
```
handlePhotoSelect:
  1. Dosya tipi kontrolü (image/*)
  2. FileReader ile Base64'e çevir
  3. Image objesi oluştur
  4. Önizleme göster
  5. setupCropCanvas() çağrılır
```

### Adım 3: Kırpma Canvas'ı Hazırlanır
```
setupCropCanvas:
  1. Canvas boyutları ayarlanır (max 400px)
  2. Fotoğraf canvas'a çizilir
  3. Merkeze kırpma karesi çizilir (%80 boyut)
  4. Event listener'lar eklenir
```

### Adım 4: Kullanıcı Kareyi Hareket Ettirir (Opsiyonel)
```
Kullanıcı canvas'a tıklar
  ↓
handleCropClick çağrılır
  ↓
Tıklama koordinatları hesaplanır
  ↓
Kare yeni pozisyona taşınır
  ↓
Fotoğraf yeniden çizilir + yeni kare gösterilir
```

### Adım 5: Kullanıcı "Kırp" Butonuna Basar
```
Kullanıcı "Kırp" butonuna tıklar
  ↓
applyCrop() çağrılır
  ↓
1. Kırpma koordinatları alınır
2. Orijinal görsel yüklenir
3. Geçici canvas'a çizilir
4. Kırpma alanındaki pixel verileri alınır
5. Yeni canvas'a kopyalanır
6. Blob formatına çevrilir
7. modalState.croppedImage'e kaydedilir
8. Önizleme güncellenir
9. Canvas ve kontroller gizlenir
```

### Adım 6: Profil Kaydedilirken Kırpılmış Görsel Kullanılır
```
saveProfile() fonksiyonunda:
  ↓
if (modalState.croppedImage) {
    // Kırpılmış görseli kullan
    imageUrl = await uploadImageToSupabase(modalState.croppedImage, fileName);
} else if (modalState.selectedFile) {
    // Orijinal görseli kullan (kırpma yapılmadıysa)
    imageUrl = await uploadImageToSupabase(modalState.selectedFile, fileName);
}
```

---

## 🎨 HTML Yapısı

```html
<!-- Satır 626-640: index.html -->
<div class="form-section">
    <label class="form-label">Profil Fotoğrafı</label>
    <div class="photo-upload-area" id="photo-upload-area">
        <!-- Gizli file input -->
        <input type="file" id="photo-input" accept="image/*" class="hidden-input">
        
        <!-- Önizleme alanı -->
        <div class="upload-preview" id="upload-preview">
            <span class="upload-icon">📷</span>
            <span class="upload-text">Fotoğraf Seç</span>
        </div>
        
        <!-- Kırpma canvas'ı (başlangıçta gizli) -->
        <canvas id="crop-canvas" class="hidden"></canvas>
    </div>
    
    <!-- Kırpma kontrolleri (başlangıçta gizli) -->
    <div class="crop-controls hidden" id="crop-controls">
        <button type="button" class="crop-btn" id="crop-apply">Kırp</button>
        <button type="button" class="crop-btn secondary" id="crop-cancel">İptal</button>
    </div>
</div>
```

---

## 📝 Önemli Notlar

1. **Performans:** Görseller maksimum 400px'e küçültülür (canvas performansı için)
2. **Format:** Kırpılmış görsel PNG formatında, %95 kalitede kaydedilir
3. **Koordinat Sistemi:** Canvas koordinatları CSS scaling'e göre hesaplanır
4. **State Yönetimi:** Tüm kırpma bilgileri `modalState` objesinde tutulur
5. **Event Temizleme:** Her yeni fotoğraf seçiminde önceki event listener'lar temizlenir

---

## 🔍 Edit Profile Modal İçin Aynı Sistem

Edit profile modal için de aynı sistem kullanılır, sadece element ID'leri farklıdır:
- `edit-photo-input` (photo-input yerine)
- `edit-crop-canvas` (crop-canvas yerine)
- `edit-crop-apply` (crop-apply yerine)
- vb.

Mantık tamamen aynıdır, sadece element seçicileri farklıdır.
