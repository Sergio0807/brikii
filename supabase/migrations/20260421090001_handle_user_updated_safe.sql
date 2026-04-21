-- Rendre handle_user_updated bulletproof : ne jamais bloquer GoTrue
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
      updated_at           = now()
    where id = new.id;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
