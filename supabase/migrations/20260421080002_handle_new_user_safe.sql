create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    prenom,
    nom,
    telephone,
    statut_professionnel,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'prenom'), ''),
    nullif(trim(new.raw_user_meta_data->>'nom'), ''),
    nullif(trim(new.raw_user_meta_data->>'telephone'), ''),
    nullif(trim(new.raw_user_meta_data->>'statut_professionnel'), ''),
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
exception when others then
  -- Ne jamais bloquer l'inscription : fallback minimal
  begin
    insert into public.profiles (id, email, created_at, updated_at)
    values (new.id, new.email, now(), now())
    on conflict (id) do nothing;
  exception when others then
    null;
  end;
  return new;
end;
$$;
