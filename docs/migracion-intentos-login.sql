-- Migración: Tabla para control de intentos de login
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS intentos_login (
  username TEXT PRIMARY KEY,
  intentos INTEGER NOT NULL DEFAULT 0,
  ultimo_intento TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_hasta TIMESTAMPTZ
);
