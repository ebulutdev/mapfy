const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Şehir bilgileri endpoint'i
app.get('/api/cities', (req, res) => {
    const cities = require('./data/cities.json');
    res.json(cities);
});

// Şehir detay endpoint'i
app.get('/api/city/:name', (req, res) => {
    const cities = require('./data/cities.json');
    const city = cities.find(c => c.name.toLowerCase() === req.params.name.toLowerCase());
    
    if (city) {
        res.json(city);
    } else {
        res.status(404).json({ error: 'Şehir bulunamadı' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 Map application is ready!`);
});

