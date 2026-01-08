const cities = require('../../data/cities.json');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        const cityName = req.query.name || '';
        const city = cities.find(c => 
            c.name.toLowerCase() === cityName.toLowerCase()
        );
        
        if (city) {
            res.status(200).json(city);
        } else {
            res.status(404).json({ error: 'Şehir bulunamadı' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

