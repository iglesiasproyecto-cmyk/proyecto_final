-- Run after applying 20260517000100_harden_admin_sede_role_scope.sql.

select p.proname, p.prosecdef, p.proacl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'assign_role_with_ministerio',
    'can_assign_role_scoped',
    'get_all_usuarios_enriquecidos',
    'get_usuarios_enriquecidos_scoped',
    'get_my_sedes'
  )
order by p.proname;

select tablename, cmd, count(*) as policy_count, string_agg(policyname, ', ' order by policyname) as policies
from pg_policies
where schemaname = 'public'
  and tablename in ('tarea', 'aula_curso', 'aula_modulo', 'usuario', 'usuario_rol_sede', 'usuario_sede')
group by tablename, cmd
order by tablename, cmd;

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('aula_curso', 'aula_modulo')
  and policyname ilike '%admin_sede%'
order by tablename, cmd, policyname;
