#!/usr/bin/env python3
"""
MapHypee - Python Backend
Türkiye haritası için Python Flask backend servisi
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__, static_folder='public')
CORS(app)

# Şehir verilerini yükle
def load_cities():
    try:
        with open('data/cities.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@app.route('/')
def index():
    """Ana sayfa"""
    return send_from_directory('public', 'index.html')

@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Tüm şehirleri getir"""
    cities = load_cities()
    return jsonify(cities)

@app.route('/api/city/<city_name>', methods=['GET'])
def get_city(city_name):
    """Belirli bir şehri getir"""
    cities = load_cities()
    city = next((c for c in cities if c['name'].lower() == city_name.lower()), None)
    
    if city:
        return jsonify(city)
    else:
        return jsonify({'error': 'Şehir bulunamadı'}), 404

@app.route('/api/map/coordinates', methods=['POST'])
def save_coordinates():
    """Harita koordinatlarını kaydet (zoom, pan vb.)"""
    data = request.json
    # Burada koordinatları kaydedebilirsiniz (veritabanı, dosya vb.)
    print(f"Harita durumu kaydedildi: {data}")
    return jsonify({'status': 'success', 'message': 'Koordinatlar kaydedildi'})

@app.route('/api/map/click', methods=['POST'])
def handle_map_click():
    """Harita tıklama olaylarını işle"""
    data = request.json
    city_name = data.get('city')
    coordinates = data.get('coordinates', {})
    
    print(f"Harita tıklandı: {city_name} - Koordinatlar: {coordinates}")
    return jsonify({
        'status': 'success',
        'city': city_name,
        'timestamp': data.get('timestamp')
    })

if __name__ == '__main__':
    print("🚀 MapHypee Python Backend başlatılıyor...")
    print("📊 Harita uygulaması hazır!")
    print("🌐 Server: http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')

