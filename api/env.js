// Environment Variables API Endpoint
// Bu endpoint Vercel'de environment variables'ı frontend'e güvenli şekilde iletir
// Sadece public olan environment variables'ı döndürür (SUPABASE_URL, SUPABASE_ANON_KEY)

export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    // Sadece public environment variables'ı döndür
    const publicEnv = {
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || ''
    };
    
    // Response as JSON
    res.status(200).json(publicEnv);
}
