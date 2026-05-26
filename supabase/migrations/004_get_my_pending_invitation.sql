-- ══════════════════════════════════════════════════════════════
-- Migración 004 — RPC get_my_pending_invitation
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Contexto: defensa final contra el bug de duplicado en modo parejas
-- (Falla 3 del fix de mayo 2026). El invitee NO puede leer su propia
-- fila en partner_invitations directo porque la policy invitations_own
-- restringe lectura a inviter_id = auth.uid(). Esta RPC SECURITY DEFINER
-- permite a un usuario autenticado averiguar si tiene una invitación
-- pendiente esperándolo (match por email contra auth.users).
--
-- Se usa desde src/services/onboardingPersistor.js para abortar el
-- flujo si detecta invitación pendiente y redirigir al partner a
-- /invitar?token=xxx en lugar de crear un hijo duplicado.
-- ══════════════════════════════════════════════════════════════

create or replace function public.get_my_pending_invitation()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_email          text;
  v_inv            public.partner_invitations%rowtype;
  v_inviter_email  text;
begin
  -- Email del usuario autenticado.
  select email into v_email
  from auth.users
  where id = auth.uid();

  if v_email is null then
    return jsonb_build_object('hasInvitation', false);
  end if;

  -- Invitación pendiente más reciente que apunta a ese email.
  -- Match case-insensitive porque partner_invitations.invitee_email se
  -- guarda con lower(trim(...)) desde create_family_and_invite, pero el
  -- email de auth.users podría venir con casing distinto.
  select * into v_inv
  from public.partner_invitations
  where lower(invitee_email) = lower(v_email)
    and status     = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('hasInvitation', false);
  end if;

  select email into v_inviter_email
  from auth.users
  where id = v_inv.inviter_id;

  return jsonb_build_object(
    'hasInvitation', true,
    'token',         v_inv.token,
    'inviterEmail',  v_inviter_email,
    'expiresAt',     v_inv.expires_at
  );
end;
$$;

grant execute on function public.get_my_pending_invitation() to authenticated;
