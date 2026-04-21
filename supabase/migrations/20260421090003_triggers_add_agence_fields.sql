-- Ajouter agence_mandant_id et agence_mandant depuis les métadonnées d'inscription

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, prenom, nom, telephone, statut_professionnel,
    agence_mandant_id, agence_mandant,
    created_at, updated_at
  )
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'prenom'), ''),
    nullif(trim(new.raw_user_meta_data->>'nom'), ''),
    nullif(trim(new.raw_user_meta_data->>'telephone'), ''),
    nullif(trim(new.raw_user_meta_data->>'statut_professionnel'), ''),
    nullif(trim(new.raw_user_meta_data->>'agence_id'), '')::uuid,
    nullif(trim(new.raw_user_meta_data->>'agence_nom'), ''),
    now(), now()
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  begin
    insert into public.profiles (id, email, created_at, updated_at)
    values (new.id, new.email, now(), now())
    on conflict (id) do nothing;
  exception when others then null;
  end;
  return new;
end;
$$;

create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data is distinct from old.raw_user_meta_data then
    update public.profiles set
      prenom               = nullif(trim(new.raw_user_meta_data->>'prenom'), ''),
      nom                  = nullif(trim(new.raw_user_meta_data->>'nom'), ''),
      telephone            = nullif(trim(new.raw_user_meta_data->>'telephone'), ''),
      statut_professionnel = nullif(trim(new.raw_user_meta_data->>'statut_professionnel'), ''),
      agence_mandant_id    = nullif(trim(new.raw_user_meta_data->>'agence_id'), '')::uuid,
      agence_mandant       = nullif(trim(new.raw_user_meta_data->>'agence_nom'), ''),
      updated_at           = now()
    where id = new.id;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
