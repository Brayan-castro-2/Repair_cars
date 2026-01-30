# 🔧 Configuración de Supabase

Para conectar tu aplicación a la nueva base de datos de Supabase, actualiza el archivo `.env.local` con estas credenciales:

## Pasos:

1. Abre el archivo `.env.local` en la raíz del proyecto
2. Reemplaza el contenido con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dccymmnjzhxneexscboo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY3ltbW5qemh4bmVleHNjYm9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxODA0MjIsImV4cCI6MjA4Mzc1NjQyMn0.IKpjys-3Rqqv2omj0LtFKowzQi5Z_M99JkhOgR29sx8
```

3. Guarda el archivo
4. Reinicia el servidor de desarrollo (presiona Ctrl+C en la terminal y ejecuta `npm run dev` nuevamente)

## Verificación:

Después de reiniciar, tu aplicación debería estar conectada a tu nueva base de datos de Supabase en:
- **Project ID**: `dccymmnjzhxneexscboo`
- **URL**: `https://dccymmnjzhxneexscboo.supabase.co`

---

**Nota**: El archivo `.env.local` está en `.gitignore` por seguridad, así que no se subirá a GitHub.
