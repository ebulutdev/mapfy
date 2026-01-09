const cities = require('../../../data/cities.json');
const { createClient } = require('@supabase/supabase-js');

// Supabase client oluştur (environment variables'dan)
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
        return null; // Supabase yapılandırılmamışsa null döndür
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

// Şehir adını slug'dan çıkar (örn: "bursa-snapchat-arkadas-bul" -> "Bursa")
function getCityNameFromSlug(slug) {
    // Slug'dan şehir adını bul
    const cityNames = cities.map(c => c.name.toLowerCase());
    
    // Slug'ı parçalara ayır ve şehir adını bul
    const slugParts = slug.split('-');
    
    // En yaygın şehir adlarını kontrol et
    for (let i = 1; i <= slugParts.length; i++) {
        const possibleCityName = slugParts.slice(0, i).join(' ');
        const city = cities.find(c => 
            c.name.toLowerCase() === possibleCityName ||
            c.name.toLowerCase().replace(/ı/g, 'i').replace(/İ/g, 'I') === possibleCityName
        );
        if (city) {
            return city.name;
        }
    }
    
    // Direkt eşleşme kontrolü
    const city = cities.find(c => 
        slug.includes(c.name.toLowerCase()) ||
        slug.includes(c.name.toLowerCase().replace(/ı/g, 'i').replace(/İ/g, 'I'))
    );
    
    return city ? city.name : null;
}

// SEO optimizasyonlu HTML sayfası oluştur
function generateCityPage(cityName, cityData, stats, originalSlug) {
    const citySlug = cityName.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'I')
        .replace(/ş/g, 's')
        .replace(/Ş/g, 'S')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .replace(/\s+/g, '-');
    
    // Dinamik içerik oluştur (Doorway Pages önleme)
    const activeProfiles = stats?.totalProfiles || 0;
    const districts = stats?.topDistricts || [];
    const districtText = districts.length > 0 
        ? `${districts.slice(0, 2).join(' ve ')} ilçelerindeki` 
        : '';
    
    // Akıllı metin mantığı (Boş şehir senaryosu için)
    let uniqueDescription = '';
    let bodyDescription = '';
    
    if (activeProfiles > 5) {
        // Kalabalık şehirler için (Mevcut mantık)
        uniqueDescription = `${cityName}'da şu an ${activeProfiles} aktif profil var. ${districtText} ${cityName === 'İstanbul' ? 'Snapchat' : cityName === 'Ankara' ? 'Instagram' : 'sosyal medya'} kullanıcılarını hemen keşfet. ${cityName} şehrinde şehir bazlı arama yaparak sosyal medya hesaplarına ulaş.`;
        bodyDescription = `<strong>${cityName}'da şu an ${activeProfiles} aktif profil var.</strong> ${districtText} ${cityName === 'İstanbul' ? 'Snapchat' : cityName === 'Ankara' ? 'Instagram' : 'sosyal medya'} kullanıcılarını hemen keşfet. MapHypee ile ${cityName} şehrinde şehir bazlı arama yaparak sosyal medya hesaplarına ulaşın ve çevrenizi genişletin.`;
    } else {
        // Boş veya az kişili şehirler için (Pazarlama mantığı)
        uniqueDescription = `${cityName} için MapHypee topluluğu kuruluyor! Şehrin ilk popüler profili sen ol ve "Hype" listesine gir. ${cityName}'da Snapchat, Instagram, TikTok hesaplarına ulaş.`;
        bodyDescription = `<strong>${cityName} için MapHypee topluluğu kuruluyor!</strong> Şehrin ilk popüler profili sen ol ve "Hype" listesine gir. MapHypee ile ${cityName} şehrinde profilinizi oluşturun, sosyal medya hesaplarınızı paylaşın ve çevrenizi genişletin.`;
    }
    
    const title = `${cityName} Snapchat, Instagram, TikTok Arkadaş Bul | MapHypee`;
    const description = uniqueDescription;
    
    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${cityName} snapchat, ${cityName} instagram, ${cityName} tiktok, ${cityName} arkadaş bul, ${cityName} sosyal medya, ${cityName} yakınımdakiler, ${cityName} profil bulma, ${citySlug} snapchat arkadaş bul">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://maphypee.com/sehir/${originalSlug}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://maphypee.com/sehir/${citySlug}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://maphypee.com/image.png">
    <meta property="og:locale" content="tr_TR">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${title}",
      "description": "${description}",
      "url": "https://maphypee.com/sehir/${citySlug}",
      "inLanguage": "tr-TR",
      "about": {
        "@type": "City",
        "name": "${cityName}",
        "addressCountry": "TR"
      }
    }
    </script>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 2.5em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .city-name {
            color: #FFFC00;
            font-weight: bold;
        }
        p {
            font-size: 1.2em;
            line-height: 1.8;
            margin-bottom: 30px;
        }
        .cta-button {
            display: inline-block;
            background: #3ECF8E;
            color: #000;
            padding: 15px 40px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1em;
            transition: transform 0.3s, box-shadow 0.3s;
            box-shadow: 0 4px 15px rgba(62, 207, 142, 0.4);
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(62, 207, 142, 0.6);
        }
        .features {
            margin-top: 40px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
        }
        .feature h3 {
            margin-bottom: 10px;
            color: #FFFC00;
        }
    </style>
</head>
    <body>
    <div class="container">
        <h1><span class="city-name">${cityName}</span>'da Sosyal Medya Hesapları Bul</h1>
        <p>
            ${bodyDescription}
        </p>
        
        <a href="https://maphypee.com?city=${encodeURIComponent(cityName)}" class="cta-button">
            ${cityName}'da Keşfetmeye Başla →
        </a>
        
        <div class="features">
            <div class="feature">
                <h3>📱 Snapchat</h3>
                <p>${cityName}'da Snapchat hesapları bul</p>
            </div>
            <div class="feature">
                <h3>📸 Instagram</h3>
                <p>${cityName}'da Instagram profilleri keşfet</p>
            </div>
            <div class="feature">
                <h3>🎵 TikTok</h3>
                <p>${cityName}'da TikTok kullanıcıları bul</p>
            </div>
        </div>
        
        <p style="margin-top: 40px; font-size: 0.9em; opacity: 0.8;">
            ${cityData ? `Nüfus: ${cityData.population.toLocaleString('tr-TR')} | ` : ''}
            <a href="https://maphypee.com" style="color: #FFFC00;">Ana Sayfaya Dön</a>
        </p>
    </div>
</body>
</html>`;
}

module.exports = async (req, res) => {
    const { slug } = req.query;
    
    if (!slug) {
        res.status(400).send('Şehir slug gerekli');
        return;
    }
    
    // Slug'dan şehir adını bul
    const cityName = getCityNameFromSlug(slug);
    
    if (!cityName) {
        res.status(404).send('Şehir bulunamadı');
        return;
    }
    
    // Şehir verisini al
    const cityData = cities.find(c => c.name === cityName);
    
    // Supabase'den dinamik veri çek (Doorway Pages önleme)
    let stats = {
        totalProfiles: 0,
        topDistricts: []
    };
    
    try {
        const supabase = getSupabaseClient();
        if (supabase) {
            // Şehre göre profil sayısını al
            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('city_name', cityName);
            
            stats.totalProfiles = count || 0;
            
            // En çok profil olan ilçeleri al (max 3)
            if (stats.totalProfiles > 0) {
                const { data: districtData } = await supabase
                    .from('profiles')
                    .select('district')
                    .eq('city_name', cityName)
                    .not('district', 'is', null);
                
                if (districtData && districtData.length > 0) {
                    // İlçe sayılarını hesapla
                    const districtCounts = {};
                    districtData.forEach(p => {
                        if (p.district) {
                            districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
                        }
                    });
                    
                    // En çok profil olan ilçeleri sırala
                    stats.topDistricts = Object.entries(districtCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([district]) => district);
                }
            }
        }
    } catch (error) {
        // Supabase hatası durumunda sessizce devam et (fallback)
        console.error('Supabase veri çekme hatası:', error);
    }
    
    // SEO optimizasyonlu HTML sayfasını oluştur
    const html = generateCityPage(cityName, cityData, stats, slug);
    
    // Cache-Control header ekle (1 gün cache)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
};
