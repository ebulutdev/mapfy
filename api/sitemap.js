const cities = require('../data/cities.json');

// Şehir adını slug'a çevir
function cityToSlug(cityName) {
    return cityName.toLowerCase()
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
}

module.exports = async (req, res) => {
    const baseUrl = 'https://maphypee.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    // XML başlangıcı
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
  <!-- Ana Sayfa -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Blog Sayfası -->
  <url>
    <loc>${baseUrl}/blog.html</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Şehir Sayfaları -->
`;

    // Her şehir için sayfa ekle
    cities.forEach(city => {
        const citySlug = cityToSlug(city.name);
        // Farklı varyasyonlar ekle
        const variations = [
            `${citySlug}-snapchat-arkadas-bul`,
            `${citySlug}-instagram-kesfet`,
            `${citySlug}-tiktok-profil-bul`
        ];
        
        variations.forEach(variation => {
            xml += `  <url>
    <loc>${baseUrl}/sehir/${variation}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        });
    });
    
    xml += `</urlset>`;
    
    // Cache-Control header ekle (1 gün cache)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
};
