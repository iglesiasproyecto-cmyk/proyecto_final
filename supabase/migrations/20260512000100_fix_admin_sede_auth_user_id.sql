-- Fix admin_sede user auth_user_id linkage
-- admin_sede auth UUID: 6763a324-4b68-4393-98fe-107390b8bdd3
-- admin_sede usuario id: 26

UPDATE usuario
SET auth_user_id = '6763a324-4b68-4393-98fe-107390b8bdd3'
WHERE id_usuario = 26
  AND correo = 'admin_sede@test.dev';

-- Verify the update
SELECT
  id_usuario,
  correo,
  nombres,
  apellidos,
  auth_user_id
FROM usuario
WHERE id_usuario = 26;
