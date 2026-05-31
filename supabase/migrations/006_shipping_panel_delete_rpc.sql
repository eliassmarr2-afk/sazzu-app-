-- =========================================================
-- Protocol Data · Shipping Engine
-- Migration 006 · Acciones protegidas para panel Logística
-- Target: Supabase Postgres
-- =========================================================

begin;

create or replace function public.protocol_logistics_deactivate_shipping_item(
  input_entity text,
  input_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity text := lower(trim(coalesce(input_entity, '')));
  v_id text := trim(coalesce(input_id, ''));
  v_affected integer := 0;
begin
  if auth.role() <> 'authenticated' then
    return jsonb_build_object(
      'status', 'error',
      'code', 'not_authenticated',
      'message', 'Para modificar logística hace falta una sesión autenticada.'
    );
  end if;

  if v_id = '' then
    return jsonb_build_object('status', 'error', 'message', 'No se recibió ID operativo.');
  end if;

  if v_entity = 'rule' then
    update public.shipping_rules
    set is_active = false,
        updated_at = now()
    where rule_id = v_id;

    get diagnostics v_affected = row_count;

    return jsonb_build_object(
      'status', case when v_affected > 0 then 'ok' else 'error' end,
      'entity', v_entity,
      'id', v_id,
      'affected', v_affected,
      'message', case when v_affected > 0 then 'Regla desactivada correctamente.' else 'No se encontró la regla.' end
    );
  end if;

  if v_entity = 'exception' then
    update public.shipping_exceptions
    set is_active = false,
        updated_at = now()
    where exception_id = v_id;

    get diagnostics v_affected = row_count;

    return jsonb_build_object(
      'status', case when v_affected > 0 then 'ok' else 'error' end,
      'entity', v_entity,
      'id', v_id,
      'affected', v_affected,
      'message', case when v_affected > 0 then 'Excepción desactivada correctamente.' else 'No se encontró la excepción.' end
    );
  end if;

  if v_entity = 'banner' then
    update public.shipping_rules
    set banner_id = null,
        updated_at = now()
    where banner_id = v_id;

    get diagnostics v_affected = row_count;

    update public.shipping_exceptions
    set banner_id = null,
        updated_at = now()
    where banner_id = v_id;

    get diagnostics v_affected = v_affected + row_count;

    return jsonb_build_object(
      'status', case when v_affected > 0 then 'ok' else 'error' end,
      'entity', v_entity,
      'id', v_id,
      'affected', v_affected,
      'message', case when v_affected > 0 then 'Banner quitado de reglas y excepciones.' else 'No se encontraron usos del banner.' end
    );
  end if;

  if v_entity = 'postal_code' then
    return jsonb_build_object(
      'status', 'error',
      'entity', v_entity,
      'id', v_id,
      'message', 'Los códigos postales no se eliminan desde el panel. Son base maestra protegida.'
    );
  end if;

  return jsonb_build_object('status', 'error', 'message', 'Entidad no soportada: ' || v_entity);
exception
  when others then
    return jsonb_build_object('status', 'error', 'message', sqlerrm);
end;
$$;

grant execute on function public.protocol_logistics_deactivate_shipping_item(text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
