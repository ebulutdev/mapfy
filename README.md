# 🗺️ Mapfy - İnteraktif Türkiye Haritası

Modern, tam ekran, pan & zoom özellikli Türkiye haritası uygulaması. Snapchat harita benzeri elle büyütme/küçültme ve sürükleme özellikleri ile.

## ✨ Özellikler

- 🖱️ **Tam Ekran Harita**: Responsive, tüm ekranı kaplayan harita görünümü
- 🔍 **Pan & Zoom**: Elle büyütme/küçültme, sürükleme (Snapchat tarzı)
- 🏙️ **Şehir Seçimi**: Her şehir tıklanabilir ve seçilebilir
- 📱 **Mobil Uyumlu**: Touch gesture desteği
- 🎨 **Modern UI**: Güzel animasyonlar ve geçiş efektleri
- 🐍 **Python Backend**: Flask ile API desteği (opsiyonel)
- 🚀 **Node.js Server**: Express ile hızlı servis

## 🚀 Kurulum

### Node.js Backend

```bash
# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start

# Geliştirme modu (nodemon ile)
npm run dev
```

Sunucu `http://localhost:3000` adresinde çalışacak.

### Python Backend (Opsiyonel)

```bash
# Python bağımlılıklarını yükle
pip install -r requirements.txt

# Python sunucusunu başlat
python app.py
```

Python sunucusu `http://localhost:5000` adresinde çalışacak.

## 🎮 Kullanım

### Klavye Kısayolları

- `+` veya `Zoom In` butonu: Yakınlaştır
- `-` veya `Zoom Out` butonu: Uzaklaştır
- `0` veya `Home` veya `⌂` butonu: Görünümü sıfırla
- `ESC`: Bilgi panelini kapat

### Mouse/Touch Kontrolleri

- **Sürükleme**: Haritayı hareket ettirmek için tıklayıp sürükleyin
- **Zoom**: Mouse tekerleği ile yakınlaştırın/uzaklaştırın
- **Şehir Seçimi**: Bir şehre tıklayarak detaylarını görüntüleyin
- **Touch**: Mobil cihazlarda parmakla sürükleyin, pinch-to-zoom yapın

## 📁 Proje Yapısı

```
mapfy/
├── server.js           # Node.js Express sunucusu
├── app.py              # Python Flask sunucusu (opsiyonel)
├── package.json        # Node.js bağımlılıkları
├── requirements.txt    # Python bağımlılıkları
├── data/
│   └── cities.json    # Şehir verileri
├── public/
│   ├── index.html     # Ana HTML dosyası
│   ├── style.css      # Stil dosyası
│   └── app.js         # JavaScript uygulaması
└── README.md          # Bu dosya
```

## 🔧 Yapılandırma

### Şehir Verilerini Güncelleme

`data/cities.json` dosyasını düzenleyerek şehir bilgilerini güncelleyebilirsiniz:

```json
{
    "name": "İstanbul",
    "population": 15519267,
    "area": 5461,
    "description": "Şehir açıklaması"
}
```

### SVG Path'leri Ekleme

`public/app.js` dosyasındaki `getAllProvincePaths()` fonksiyonuna yeni şehir path'leri ekleyebilirsiniz.

## 🎨 Özelleştirme

### Renkleri Değiştirme

`public/style.css` dosyasındaki renk değerlerini değiştirerek harita görünümünü özelleştirebilirsiniz:

- `.province`: Varsayılan şehir rengi
- `.province:hover`: Hover rengi
- `.province.selected`: Seçili şehir rengi

### Zoom Limitleri

`public/app.js` dosyasındaki zoom fonksiyonunda min/max değerlerini değiştirebilirsiniz:

```javascript
mapState.scale = Math.max(0.5, Math.min(5, mapState.scale * factor));
```

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır. Büyük değişiklikler için önce bir issue açarak neyi değiştirmek istediğinizi tartışın.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

---

**Not**: Gerçek bir üretim ortamında, Türkiye'nin tüm 81 ili için detaylı SVG path'lerinin eklenmesi gerekmektedir. Bu proje, temel yapıyı ve işlevselliği göstermek için hazırlanmıştır.

