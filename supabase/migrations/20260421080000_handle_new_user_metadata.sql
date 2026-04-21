-- Mise à jour du trigger : écriture des métadonnées d'inscription dans profiles
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
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'nom',
    new.raw_user_meta_data->>'telephone',
    new.raw_user_meta_data->>'statut_professionnel',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
