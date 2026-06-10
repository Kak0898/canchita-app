# ⚽ Canchita

Organiza partidos de fútbol con tus amigos. Agenda, confirma asistencia, puntúa jugadores y lleva las estadísticas.

## Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend/DB/Auth**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel (gratis)

---

## 🚀 Pasos para desplegar

### 1. Configura Supabase

1. Ve a [supabase.com](https://supabase.com) → New project
2. Copia el contenido de `supabase-schema.sql`
3. Pégalo en **SQL Editor → New Query** → Run

Eso crea:
- Todas las tablas (profiles, teams, matches, ratings...)
- Triggers automáticos para nuevos usuarios
- Row Level Security (RLS) en todas las tablas
- Bucket de storage para fotos de perfil

### 2. Configura las variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus claves de Supabase (Dashboard → Settings → API):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Instala y corre en local

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

### 4. Deploy en Vercel (gratis)

```bash
npm install -g vercel
vercel
```

O conecta el repo de GitHub en [vercel.com](https://vercel.com) y agrega las variables de entorno en el panel.

---

## 📱 Funcionalidades

| Feature | Estado |
|---------|--------|
| Registro / Login | ✅ |
| Perfil con foto de perfil | ✅ |
| Crear y unirse a equipos | ✅ |
| Crear partidos | ✅ |
| Confirmar / rechazar asistencia | ✅ |
| Invitar jugadores por username | ✅ |
| Iniciar y finalizar partido | ✅ |
| Puntuar jugadores (1-10) | ✅ |
| Votar MVP | ✅ |
| Registrar goles por jugador | ✅ |
| Estadísticas por jugador | ✅ |
| Responsive mobile | ✅ |

---

## 🗂 Estructura del proyecto

```
src/
├── components/
│   ├── layout/     # Layout principal con sidebar
│   └── teams/      # Modal de creación de equipo
├── hooks/
│   └── useAuth.tsx # Context de autenticación
├── lib/
│   └── supabase.ts # Cliente Supabase
├── pages/
│   ├── LoginPage
│   ├── RegisterPage
│   ├── DashboardPage
│   ├── ProfilePage + EditProfilePage
│   ├── TeamsPage + TeamDetailPage
│   ├── MatchesPage + MatchDetailPage
│   ├── CreateMatchPage
│   └── RatingsPage
└── types/
    └── index.ts    # Tipos TypeScript
```

---

## 🔧 Variables requeridas

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key pública de Supabase |
