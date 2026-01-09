# 🌐 Site URL Bilgileri

## Canlı Site URL'i

**Production:** [https://maphypee.com](https://maphypee.com)

## İletişim

**E-posta:** destek@maphypee.com

## URL Kullanım Yerleri

### 1. Meta Tags (index.html)
- Canonical URL
- Open Graph tags
- Twitter Card tags

### 2. Supabase Configuration
- Redirect URLs
- Allowed origins
- OAuth callbacks

### 3. Share Functions
- Profil paylaşım linkleri
- Native share API

### 4. Documentation
- README.md
- DEPLOY.md
- Supabase setup guide

## Supabase Redirect URLs

Supabase Dashboard > Authentication > URL Configuration:

```
https://maphypee.com
https://maphypee.com/
https://maphypee.com/?u=*
```

## Google OAuth Redirect URI

Google Cloud Console > OAuth 2.0 Client:

```
https://zwlyucqzjnqtrcztzhcs.supabase.co/auth/v1/callback
```

## Domain Ayarları

Vercel Dashboard > Settings > Domains:
- Production domain: `maphypee.com` (özel domain)
- Vercel otomatik domain: `maphypee.vercel.app` (yedek)

