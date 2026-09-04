-- ==============================================================================
-- ORDENALETRAS — ESQUEMA RELACIONAL PARA SUPABASE
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu panel de control de Supabase.

-- 1. Tabla de Jugadores Únicos
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Asegurar que el nombre siempre se guarde en MAYÚSCULAS
CREATE OR REPLACE FUNCTION public.format_player_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.player_name = UPPER(TRIM(NEW.player_name));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_format_player_name ON public.players;
CREATE TRIGGER trg_format_player_name
BEFORE INSERT OR UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.format_player_name();

-- 2. Tabla de Récords y Puntuaciones (Leaderboard)
CREATE TABLE IF NOT EXISTS public.leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_players_name ON public.players(player_name);
CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON public.leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_player_id ON public.leaderboard(player_id);

-- 4. Configuración de Seguridad (Row Level Security - RLS)
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla 'players'
DROP POLICY IF EXISTS "Lectura pública de jugadores" ON public.players;
CREATE POLICY "Lectura pública de jugadores"
ON public.players FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Inserción de nuevos jugadores" ON public.players;
CREATE POLICY "Inserción de nuevos jugadores"
ON public.players FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Políticas para la tabla 'leaderboard'
DROP POLICY IF EXISTS "Lectura pública del leaderboard" ON public.leaderboard;
CREATE POLICY "Lectura pública del leaderboard"
ON public.leaderboard FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Inserción pública de puntuaciones" ON public.leaderboard;
CREATE POLICY "Inserción pública de puntuaciones"
ON public.leaderboard FOR INSERT
TO anon, authenticated
WITH CHECK (true);
