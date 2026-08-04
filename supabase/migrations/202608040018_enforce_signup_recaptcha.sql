-- The production web flow and signup-captcha Edge Function are live. Require a
-- matching, short-lived server-verified pass before Supabase may create a new
-- Google or GitHub account. Existing-user sign-ins do not invoke this hook.

update public.lumno_signup_security_secrets
set captcha_enforced = true
where singleton;

do $$
begin
  if not exists (
    select 1
    from public.lumno_signup_security_secrets
    where singleton and captcha_enforced
  ) then
    raise exception 'Unable to enable Lumno signup CAPTCHA enforcement';
  end if;
end;
$$;
