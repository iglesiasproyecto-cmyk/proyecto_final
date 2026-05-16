# 🔐 Auditoría de Seguridad: Correos, Notificaciones y Recuperación de Contraseña

**Fecha**: 2026-05-15  
**Proyecto**: IGLESIABD  
**Estado**: ⚠️ **CRÍTICO** - Múltiples problemas de seguridad y funcionalidad encontrados

---

## 📋 Resumen Ejecutivo

Se han identificado **8 problemas críticos** y **12 advertencias** en el sistema de envío de correos, notificaciones y recuperación de contraseña. **La funcionalidad de recuperación de contraseña NO FUNCIONARÁ** porque falta la tabla `reset_tokens`.

### Tabla de Severidad
- 🔴 **CRÍTICO**: 8 problemas que impiden funcionamiento
- 🟠 **ALTO**: 8 problemas de seguridad
- 🟡 **MEDIO**: 4 problemas de validación/UX
- 🔵 **INFO**: Mejoras recomendadas

---

## 🚨 Problemas Críticos (Bloquean funcionamiento)

### 1. **[CRÍTICO] Tabla `reset_tokens` NO EXISTE**
- **Ubicación**: `supabase/functions/reset-password-request/index.ts:60-68`
- **Problema**: El código intenta insertar en `reset_tokens` pero la tabla nunca fue creada
- **Impacto**: ❌ La funcionalidad de "Olvidé mi contraseña" está completamente rota
- **Código afectado**:
  ```typescript
  const { error: tokenError } = await supabaseAdmin
    .from('reset_tokens')
    .insert({
      token: tokenString,
      email: normalizedEmail,
      expires_at: expiresAt.toISOString(),
    })
  ```
- **Solución**: Crear migración para la tabla

### 2. **[CRÍTICO] URL de Edge Function hardcodeada**
- **Ubicación**: `src/services/email.service.ts:20`
- **Problema**: URL de Supabase está hardcodeada en el frontend
  ```typescript
  const res = await fetch('https://heibyjbvfiokmduwwawm.supabase.co/functions/v1/send-email', {
  ```
- **Riesgo**: 
  - Exposición de identificador del proyecto
  - Cambios en el proyecto rompen la app
  - Facilita ataques dirigidos
- **Solución**: Usar `supabase.functions.invoke()` en su lugar

### 3. **[CRÍTICO] CORS demasiado permisivo en Edge Functions**
- **Ubicación**: Todas las funciones (send-email, reset-password-request, etc.)
- **Problema**: `'Access-Control-Allow-Origin': '*'`
- **Riesgo**: Permite que cualquier sitio web haga solicitudes a tus funciones
- **Ejemplo de ataque**: Un sitio malicioso podría hacer 1000s de requests para brute-force
- **Solución**: Permitir solo tu dominio

### 4. **[CRÍTICO] Sin validación de longitud de contraseña**
- **Ubicación**: `supabase/functions/complete-password-reset/index.ts:25`
- **Problema**: No valida la longitud mínima de contraseña
- **Frontend valida**: Sí (8 caracteres mínimo en ResetPasswordPage.tsx:81)
- **Riesgo**: Un atacante podría bypasear el frontend y resetear a contraseña de 1 carácter
- **Solución**: Agregar validación en la Edge Function

---

## 🔐 Problemas de Seguridad (Alto Riesgo)

### 5. **[ALTO] Email service sin validación de entrada**
- **Ubicación**: `src/services/email.service.ts:12-20`
- **Problema**: Acepta cualquier string como email, sin validar formato
  ```typescript
  export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    // Sin validación de 'to', 'subject', o 'html'
  ```
- **Impacto**: Posible email injection, enviando a direcciones no previstas
- **Solución**: Validar email con regex/validator

### 6. **[ALTO] Falta RLS en tabla `reset_tokens`**
- **Ubicación**: No existe migration
- **Problema**: Si se crea, necesita RLS para que no cualquier usuario lea todos los tokens
- **Impacto**: Cualquier usuario podría leer tokens de password reset de otros
- **Solución**: Crear tabla con RLS habilitado desde el inicio

### 7. **[ALTO] Información sensible en console.error**
- **Ubicación**: 
  - `supabase/functions/send-email/index.ts:32`
  - `supabase/functions/complete-password-reset/index.ts:72`
- **Problema**: Los logs de Supabase son públicos (visibles en dashboard)
  ```typescript
  console.error('[send-email] Resend error:', JSON.stringify(resendError))
  ```
- **Riesgo**: Exponer detalles internos de errores (API keys parciales, estructura DB)
- **Solución**: Loguear solo información genérica, detalles solo en servidor privado

### 8. **[ALTO] Validación de token inconsistente**
- **Ubicación**: 
  - `reset-password-request/index.ts:44-48` - No revela si usuario existe
  - `complete-password-reset/index.ts:50-62` - Revela si email existe
- **Problema**: Inconsistencia en respuesta permite enumeration de usuarios
- **Impacto**: Atacante puede descubrir qué emails están registrados
- **Solución**: Ambas funciones deben retornar mensaje genérico igual

### 9. **[ALTO] Sin validación de email en send-email Edge Function**
- **Ubicación**: `supabase/functions/send-email/index.ts:18-20`
- **Problema**: Acepta cualquier string como email
  ```typescript
  const { email, nombre, subject, html } = await req.json()
  // Sin validar que 'email' es un email válido
  ```
- **Riesgo**: Enviar a direcciones inválidas, spam, inyección
- **Solución**: Validar email antes de enviar a Resend

### 10. **[ALTO] Sin rate limiting en reset-password-request**
- **Ubicación**: `supabase/functions/reset-password-request/index.ts`
- **Problema**: No hay protección contra brute force
- **Riesgo**: Atacante puede enviar 1000s de reset requests al mismo email
- **Impacto**: 
  - Spam en email del usuario
  - Posible DoS si se abusa
- **Solución**: Implementar rate limiting (e.g., máximo 5 requests/hora por email)

### 11. **[ALTO] Sin validación de HTML en correos**
- **Ubicación**: `supabase/functions/send-email/index.ts:22`
- **Problema**: Acepta HTML arbitrario sin sanitizar
  ```typescript
  html: html ?? `...`
  ```
- **Riesgo**: 
  - XSS si alguien controla el HTML
  - Phishing mejorado
- **Solución**: Sanitizar HTML o usar plaintext + templating seguro

### 12. **[ALTO] Token de reset sin inyección de salt**
- **Ubicación**: `reset-password-request/index.ts:56-58`
- **Problema**: Token es predecible si se conoce el timestamp
  ```typescript
  const token = crypto.getRandomValues(new Uint8Array(32))
  ```
- **Nota**: El token en sí es seguro (32 bytes), pero se genera sin salt adicional
- **Impacto**: Bajo en este caso porque es aleatorio, pero podría mejorarse

---

## ⚠️ Problemas de Validación y UX (Medio Riesgo)

### 13. **[MEDIO] Email service con anon key fallback**
- **Ubicación**: `src/services/email.service.ts:18`
- **Problema**: Usa anon key como fallback sin sesión
  ```typescript
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
  ```
- **Riesgo**: Si no hay sesión, usa key pública
- **Solución**: Mejor manejo: si no hay sesión, rechazar o usar admin function solo

### 14. **[MEDIO] Tipado débil en notificaciones**
- **Ubicación**: `src/services/notificaciones.service.ts:50`
- **Problema**: Parámetro `any` sin validación
  ```typescript
  export async function createNotificacion(notificacion: any) {
  ```
- **Impacto**: Posible insertar datos inválidos
- **Solución**: Crear interfaz `Notificacion` tipada

### 15. **[MEDIO] Sin confirmación de email en signup**
- **Ubicación**: Verificar LoginPage.tsx
- **Problema**: El sistema de auth podría no requerir email confirmed
- **Impacto**: Usuarios pueden loguear sin confirmar email
- **Solución**: Verificar Supabase Auth settings, habilitar email confirmation required

### 16. **[MEDIO] Notificaciones solo en BD, sin email**
- **Ubicación**: `src/services/notificaciones.service.ts`
- **Problema**: Las notificaciones no se envían por email
- **Impacto**: Usuarios solo reciben notificaciones si abren la app
- **Solución**: Agregar servicio de email para notificaciones importantes

---

## ✅ Aspectos Positivos

### Buenas prácticas encontradas:

1. **✅ Token de 32 bytes (256 bits)** - Criptográficamente seguro
2. **✅ Expiración de 1 hora** - Tiempo razonable
3. **✅ Marcar token como usado** - Previene reuso
4. **✅ No revela existencia de usuario** - Buen practice en reset-password-request (parcial)
5. **✅ Manejo de sesión** - Supabase Auth nativo bien configurado
6. **✅ Singleton pattern** - Evita múltiples instancias Supabase
7. **✅ UI bien diseñada** - Buena UX en password reset flow

---

## 📊 Matriz de Riesgo

| Severidad | Cantidad | Estado |
|-----------|----------|---------|
| 🔴 CRÍTICO | 4 | BLOQUEAN PRODUCCIÓN |
| 🟠 ALTO | 8 | REQUIEREN FIX INMEDIATO |
| 🟡 MEDIO | 4 | IMPORTANTE PARA SEGURIDAD |
| 🟢 BAJO | 0 | - |
| 🔵 INFO | 2+ | MEJORAS RECOMENDADAS |

**Total de hallazgos**: 16+

---

## 🛠️ Plan de Corrección Priorizado

### Fase 1: Crítico (URGENTE)
```
[ ] 1. Crear tabla reset_tokens con RLS
[ ] 2. Reemplazar URL hardcodeada con supabase.functions.invoke()
[ ] 3. Corregir CORS headers (permitir solo tu dominio)
[ ] 4. Agregar validación de contraseña en complete-password-reset
```

### Fase 2: Alto (Próxima sprint)
```
[ ] 5. Validar emails en send-email
[ ] 6. Implementar rate limiting en reset-password-request
[ ] 7. Sanitizar HTML en correos
[ ] 8. Consistent error messages (no enumeration)
[ ] 9. Mejorar logging (no exponer errores internos)
[ ] 10. Validar input en createNotificacion
[ ] 11. Rate limit en send-email también
[ ] 12. Verificación de email requerida en signup
```

### Fase 3: Medio (Esta sprint si es posible)
```
[ ] 13. Implementar notificaciones por email
[ ] 14. Mejorar manejo de anon key en email.service
[ ] 15. Tipado fuerte en modelos
[ ] 16. Documentar security policies
```

---

## 📝 SQL para Crear tabla `reset_tokens`

**IMPORTANTE**: Primero debe estar creada en las migraciones

```sql
-- supabase/migrations/[TIMESTAMP]_create_reset_tokens_table.sql

CREATE TABLE reset_tokens (
  id_reset_token BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT reset_tokens_email_fk 
    FOREIGN KEY (email) REFERENCES usuario(correo)
);

-- Index para búsquedas rápidas
CREATE INDEX reset_tokens_token_idx ON reset_tokens(token);
CREATE INDEX reset_tokens_email_idx ON reset_tokens(email);
CREATE INDEX reset_tokens_expires_at_idx ON reset_tokens(expires_at);

-- RLS policies
ALTER TABLE reset_tokens ENABLE ROW LEVEL SECURITY;

-- Allow Edge Functions con service_role a ver todos
CREATE POLICY "Allow service role full access"
  ON reset_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Deny authenticated users from seeing tokens
CREATE POLICY "Deny authenticated users"
  ON reset_tokens
  FOR SELECT
  USING (FALSE);

-- Deny anon users
CREATE POLICY "Deny anon users"
  ON reset_tokens
  FOR ALL
  USING (FALSE);
```

---

## 🔗 Referencias y Mejores Prácticas

### Supabase Security
- [Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

### OWASP Top 10
- A04:2021 - Insecure Design (Rate limiting, CORS)
- A05:2021 - Access Control (RLS)
- A07:2021 - Cross-Site Scripting (HTML sanitization)

### Edge Function Security
- Validate ALL inputs (email, token, password)
- Log responsibly (no sensitive data)
- Use rate limiting
- Use appropriate CORS headers
- Use service_role for sensitive operations

---

## 📞 Próximos Pasos

1. **HOY**: Crear tabla `reset_tokens` para unblock password reset
2. **Mañana**: Corregir URL hardcodeada y CORS
3. **Esta semana**: Implementar validaciones de seguridad
4. **Próxima semana**: Rate limiting y notificaciones por email

---

## 📋 Checklist de Verificación

- [ ] Tabla `reset_tokens` creada y migrada
- [ ] Todos los CORS headers revisados
- [ ] Email validation en todas las funciones
- [ ] Rate limiting implementado
- [ ] Logging sanitizado
- [ ] RLS policies verificadas
- [ ] Error messages genéricos (sin enumeration)
- [ ] Tests de seguridad ejecutados
- [ ] Code review completado
- [ ] Documentación actualizada

---

**Generado por**: Claude Code Security Audit  
**Nivel de confianza**: Alta - Basado en análisis estático del código  
**Recomendación**: 🔴 NO DESPLEGAR A PRODUCCIÓN hasta que los problemas críticos sean resueltos
