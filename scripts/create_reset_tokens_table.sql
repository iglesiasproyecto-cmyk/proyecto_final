-- Crear tabla para tokens de reset de contraseña
CREATE TABLE reset_tokens (
    id_reset_token SERIAL PRIMARY KEY,
    token VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_reset_tokens_token ON reset_tokens(token);
CREATE INDEX idx_reset_tokens_email ON reset_tokens(email);
CREATE INDEX idx_reset_tokens_expires_at ON reset_tokens(expires_at);

-- Políticas RLS
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;

-- Solo el service role puede gestionar tokens de reset
CREATE POLICY "Service role can manage reset tokens" ON reset_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Limpiar tokens expirados automáticamente (opcional, se puede hacer con un job)
-- CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM reset_tokens WHERE expires_at < NOW() AND used_at IS NULL;
-- END;
-- $$ LANGUAGE plpgsql;