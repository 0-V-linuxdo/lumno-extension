alter table public.lumno_consents
  add column if not exists mainland_cross_border_terms_version text,
  add column if not exists mainland_cross_border_consented_at timestamptz,
  add column if not exists mainland_age_confirmation_version text,
  add column if not exists mainland_age_confirmed_at timestamptz;

alter table public.lumno_consents
  drop constraint if exists lumno_consents_mainland_cross_border_pair,
  drop constraint if exists lumno_consents_mainland_age_pair;

alter table public.lumno_consents
  add constraint lumno_consents_mainland_cross_border_pair
    check (
      (mainland_cross_border_terms_version is null) =
      (mainland_cross_border_consented_at is null)
    ),
  add constraint lumno_consents_mainland_age_pair
    check (
      (mainland_age_confirmation_version is null) =
      (mainland_age_confirmed_at is null)
    );

comment on column public.lumno_consents.mainland_cross_border_terms_version is
  'Version of the separate mainland China cross-border notice accepted before cloud sign-in.';
comment on column public.lumno_consents.mainland_age_confirmation_version is
  'Version of the self-confirmation that a mainland China cloud user is at least 14.';
