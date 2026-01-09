# 🖼️ Görsel SEO (Image SEO) Optimizasyon Rehberi

Google Görseller'den trafik çekmek için görsellerinizi optimize edin.

## 📋 Dosya Adlandırma Stratejisi

### ✅ DOĞRU Dosya Adları (SEO Optimizasyonlu)

```
snapchat-arkadas-bulma-haritasi-logo.png
instagram-konum-isareti-marker.png
tiktok-profil-bulma-icon.png
sosyal-medya-hesap-bulma-banner.jpg
yakinimdakileri-bulma-harita-goruntusu.png
sehir-bazli-profil-keşif-illustration.svg
```

### ❌ YANLIŞ Dosya Adları (SEO İçin Kötü)

```
logo.png
marker.png
icon.png
banner.jpg
image.png
img1.svg
```

## 🎯 Görsel SEO İpuçları

### 1. Dosya Adlandırma Kuralları

- **Anahtar kelimeleri kullan:** `snapchat-arkadas-bul` gibi
- **Tire (-) kullan, alt çizgi (_) kullanma**
- **Küçük harf kullan**
- **Türkçe karakterleri İngilizce karşılıklarıyla değiştir:**
  - `ı` → `i`
  - `ş` → `s`
  - `ğ` → `g`
  - `ü` → `u`
  - `ö` → `o`
  - `ç` → `c`

### 2. Alt Text (Alternatif Metin) Kullanımı

Her görsele mutlaka `alt` attribute'u ekleyin:

```html
<!-- ✅ DOĞRU -->
<img src="snapchat-arkadas-bulma-haritasi-logo.png" 
     alt="Snapchat Arkadaş Bulma Haritası - MapHypee Logo">

<!-- ❌ YANLIŞ -->
<img src="logo.png" alt="logo">
```

### 3. Görsel Boyutları ve Formatları

#### Önerilen Formatlar:
- **PNG:** Logo, ikonlar, şeffaf arka plan gerektiren görseller
- **JPG/JPEG:** Fotoğraflar, banner'lar
- **WebP:** Modern tarayıcılar için optimize edilmiş (en iyi performans)
- **SVG:** Vektör görseller, ikonlar

#### Önerilen Boyutlar:
- **Logo:** 200x200px - 400x400px
- **Banner/Hero:** 1200x630px (Open Graph için)
- **Thumbnail:** 300x300px
- **İkonlar:** 24x24px, 32x32px, 48x48px

### 4. Görsel Sıkıştırma

Görselleri optimize edin:
- **TinyPNG:** https://tinypng.com
- **Squoosh:** https://squoosh.app
- **ImageOptim:** Desktop uygulaması

### 5. Lazy Loading

Büyük görseller için lazy loading kullanın:

```html
<img src="snapchat-arkadas-bulma-haritasi.png" 
     alt="Snapchat Arkadaş Bulma Haritası"
     loading="lazy">
```

## 📝 Mevcut Dosyalar İçin Öneriler

### Logo Dosyası
**Şu anki:** `image.png` veya `logo.png`  
**Önerilen:** `snapchat-instagram-tiktok-hesap-bulma-haritasi-logo.png`

### Harita Marker İkonu
**Şu anki:** `marker.png`  
**Önerilen:** `instagram-konum-isareti-marker.png` veya `sehir-bazli-profil-marker.png`

### Banner/Hero Görseli
**Şu anki:** `banner.jpg`  
**Önerilen:** `snapchat-yakinimdakileri-bulma-banner.jpg`

### Profil Avatar Placeholder
**Şu anki:** `avatar.png`  
**Önerilen:** `sosyal-medya-profil-avatar-placeholder.png`

## 🔍 Google Görseller İçin Optimizasyon

### 1. Görsel Başlığı ve Açıklaması

Görselleri HTML içinde şu şekilde kullanın:

```html
<figure>
    <img src="snapchat-arkadas-bulma-haritasi.png" 
         alt="Snapchat Arkadaş Bulma Haritası - MapHypee">
    <figcaption>
        MapHypee ile Snapchat yakınımdakileri bul. Şehir bazlı arama yap, 
        Instagram ve TikTok hesaplarına ulaş.
    </figcaption>
</figure>
```

### 2. Structured Data (Schema.org)

Görseller için structured data ekleyin:

```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "contentUrl": "https://maphypee.com/snapchat-arkadas-bulma-haritasi.png",
  "description": "Snapchat Arkadaş Bulma Haritası - MapHypee",
  "name": "Snapchat Yakınımdakileri Bulma Haritası"
}
```

### 3. Görsel Sitemap

Google'a görselleri bildirmek için sitemap'e ekleyin:

```xml
<url>
  <loc>https://maphypee.com/sehir/istanbul</loc>
  <image:image>
    <image:loc>https://maphypee.com/istanbul-snapchat-hesaplari.png</image:loc>
    <image:title>İstanbul Snapchat Hesapları</image:title>
    <image:caption>İstanbul'da Snapchat yakınımdakileri bul</image:caption>
  </image:image>
</url>
```

## 📊 Görsel SEO Kontrol Listesi

- [ ] Tüm görseller SEO dostu dosya adlarına sahip
- [ ] Her görsele alt text eklendi
- [ ] Görseller optimize edildi (sıkıştırıldı)
- [ ] WebP formatı kullanılıyor (mümkünse)
- [ ] Lazy loading aktif
- [ ] Görsel boyutları uygun
- [ ] Open Graph görseli 1200x630px
- [ ] Görsel sitemap oluşturuldu

## 🚀 Hızlı Başlangıç

1. **Mevcut görselleri yeniden adlandır:**
   ```bash
   # Örnek
   mv image.png snapchat-instagram-tiktok-hesap-bulma-logo.png
   ```

2. **HTML'de güncelle:**
   ```html
   <img src="snapchat-instagram-tiktok-hesap-bulma-logo.png" 
        alt="Snapchat, Instagram, TikTok Hesap Bulma - MapHypee Logo">
   ```

3. **Görselleri optimize et:**
   - TinyPNG veya Squoosh kullan
   - WebP formatına çevir (mümkünse)

4. **Google Search Console'a bildir:**
   - Görsel sitemap'i gönder
   - Performans metriklerini takip et

## 📈 Beklenen Sonuçlar

Görsel SEO optimizasyonu ile:
- Google Görseller'den organik trafik artacak
- Görsel aramalarda daha üst sıralarda görüneceksin
- Kullanıcı deneyimi iyileşecek (hızlı yükleme)
- Sosyal medya paylaşımlarında daha iyi görünüm

## 🔗 Faydalı Kaynaklar

- [Google Görsel SEO Rehberi](https://developers.google.com/search/docs/appearance/google-images)
- [TinyPNG - Görsel Sıkıştırma](https://tinypng.com)
- [Squoosh - Görsel Optimizasyon](https://squoosh.app)
- [WebP Converter](https://cloudconvert.com/png-to-webp)
