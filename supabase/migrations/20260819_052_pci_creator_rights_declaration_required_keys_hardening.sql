-- Protocol Creative Insights (PCI)
-- Phase 1N.5 hardening: JSONB missing keys evaluate to NULL, so require every schema-v1 key explicitly.
-- Intentionally stored in Git only; not applied to production yet.

create or replace function pci.guard_creator_rights_declaration_schema_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_declaration jsonb := coalesce(new.rights_declaration, '{}'::jsonb);
  v_origin jsonb;
  v_third_party jsonb;
  v_music jsonb;
  v_ai jsonb;
  v_people jsonb;
  v_certification jsonb;
  v_used boolean;
  v_people_present boolean;
begin
  if new.rights_declaration is not distinct from old.rights_declaration then
    return new;
  end if;

  if v_declaration = '{}'::jsonb then
    return new;
  end if;

  if jsonb_typeof(v_declaration) <> 'object'
     or not (v_declaration ?& array['schema_version','origin','third_party_assets','music_audio','ai','people','certification']::text[])
     or coalesce(v_declaration->>'schema_version', '') <> '1'
     or v_declaration - array['schema_version','origin','third_party_assets','music_audio','ai','people','certification']::text[] <> '{}'::jsonb
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  v_origin := v_declaration->'origin';
  v_third_party := v_declaration->'third_party_assets';
  v_music := v_declaration->'music_audio';
  v_ai := v_declaration->'ai';
  v_people := v_declaration->'people';
  v_certification := v_declaration->'certification';

  if jsonb_typeof(v_origin) <> 'object'
     or not (v_origin ?& array['source_type','creator_authorship_confirmed','notes']::text[])
     or v_origin - array['source_type','creator_authorship_confirmed','notes']::text[] <> '{}'::jsonb
     or coalesce(v_origin->>'source_type','') not in ('creator_original','creator_original_with_third_party_elements')
     or coalesce((v_origin->>'creator_authorship_confirmed')::boolean, false) is not true
     or length(coalesce(v_origin->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_third_party) <> 'object'
     or not (v_third_party ?& array['used','authorization_confirmed','notes']::text[])
     or v_third_party - array['used','authorization_confirmed','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_third_party->'used') <> 'boolean'
     or length(coalesce(v_third_party->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_used := (v_third_party->>'used')::boolean;
  if v_used and (
    jsonb_typeof(v_third_party->'authorization_confirmed') <> 'boolean'
    or (v_third_party->>'authorization_confirmed')::boolean is not true
    or nullif(btrim(coalesce(v_third_party->>'notes','')), '') is null
  ) then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_music) <> 'object'
     or not (v_music ?& array['used','source','commercial_use_confirmed','notes']::text[])
     or v_music - array['used','source','commercial_use_confirmed','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_music->'used') <> 'boolean'
     or coalesce(v_music->>'source','') not in ('none','original','licensed','platform_library','other')
     or length(coalesce(v_music->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_used := (v_music->>'used')::boolean;
  if (not v_used and v_music->>'source' <> 'none')
     or (v_used and v_music->>'source' = 'none')
     or (v_used and (
       jsonb_typeof(v_music->'commercial_use_confirmed') <> 'boolean'
       or (v_music->>'commercial_use_confirmed')::boolean is not true
     ))
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_ai) <> 'object'
     or not (v_ai ?& array['used','tool','notes']::text[])
     or v_ai - array['used','tool','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_ai->'used') <> 'boolean'
     or length(coalesce(v_ai->>'tool','')) > 160
     or length(coalesce(v_ai->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_used := (v_ai->>'used')::boolean;
  if v_used and nullif(btrim(coalesce(v_ai->>'tool','')), '') is null then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_people) <> 'object'
     or not (v_people ?& array['identifiable_people','all_adults_confirmed','permission_confirmed','notes']::text[])
     or v_people - array['identifiable_people','all_adults_confirmed','permission_confirmed','notes']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_people->'identifiable_people') <> 'boolean'
     or length(coalesce(v_people->>'notes','')) > 2000
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;
  v_people_present := (v_people->>'identifiable_people')::boolean;
  if v_people_present and (
    jsonb_typeof(v_people->'all_adults_confirmed') <> 'boolean'
    or (v_people->>'all_adults_confirmed')::boolean is not true
    or jsonb_typeof(v_people->'permission_confirmed') <> 'boolean'
    or (v_people->>'permission_confirmed')::boolean is not true
  ) then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  if jsonb_typeof(v_certification) <> 'object'
     or not (v_certification ?& array['information_accurate']::text[])
     or v_certification - array['information_accurate']::text[] <> '{}'::jsonb
     or jsonb_typeof(v_certification->'information_accurate') <> 'boolean'
     or (v_certification->>'information_accurate')::boolean is not true
  then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
  end if;

  return new;
exception
  when invalid_text_representation then
    raise exception using errcode = '22023', message = 'pci_rights_declaration_invalid';
end;
$$;

revoke all on function pci.guard_creator_rights_declaration_schema_v1() from public, anon, authenticated;
grant execute on function pci.guard_creator_rights_declaration_schema_v1() to service_role;

comment on function pci.guard_creator_rights_declaration_schema_v1() is
  'Strict schema-v1 validator for the factual Creator rights declaration. Every required top-level/nested key must be present; missing JSONB keys cannot pass via SQL NULL semantics.';
