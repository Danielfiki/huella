import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const FamilyContext = createContext(null)

export function FamilyProvider({ children }) {
  const { user } = useAuth()
  // Empieza en true para que HuellaContext espere antes de cargar datos
  const [familyLoading, setFamilyLoading] = useState(true)
  const [family, setFamily] = useState(null)            // { familyId, role, partner: {id, email} | null }
  const [pendingInvitation, setPendingInvitation] = useState(null) // { id, inviteeEmail, token }

  useEffect(() => {
    if (!user) {
      setFamily(null)
      setPendingInvitation(null)
      setFamilyLoading(false)
      return
    }
    loadFamilyData()
  }, [user?.id])

  async function loadFamilyData() {
    setFamilyLoading(true)
    try {
      const [partnerRes, invitationRes] = await Promise.all([
        supabase.rpc('get_partner_info'),
        supabase
          .from('partner_invitations')
          .select('id, invitee_email, token, created_at')
          .eq('inviter_id', user.id)
          .eq('status', 'pending')
          .maybeSingle(),
      ])

      if (partnerRes.data?.hasFamily) {
        setFamily({
          familyId: partnerRes.data.familyId,
          role: partnerRes.data.role,
          partner: partnerRes.data.partner ?? null,
        })
      } else {
        setFamily(null)
      }

      setPendingInvitation(
        invitationRes.data
          ? {
              id: invitationRes.data.id,
              inviteeEmail: invitationRes.data.invitee_email,
              token: invitationRes.data.token,
              createdAt: invitationRes.data.created_at,
            }
          : null
      )
    } catch (e) {
      console.error('Error cargando familia:', e)
    } finally {
      setFamilyLoading(false)
    }
  }

  async function invitePartner(email) {
    const { data, error } = await supabase.rpc('create_family_and_invite', {
      p_invitee_email: email,
    })
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error('No se pudo crear la invitación')

    const inviteUrl = `${window.location.origin}/invitar?token=${data.token}`

    // Enviar email (best-effort: no falla si Resend no está configurado)
    try {
      await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, inviterEmail: user.email, inviteUrl }),
      })
    } catch (emailErr) {
      console.warn('No se pudo enviar el email de invitación:', emailErr)
    }

    await loadFamilyData()
    return inviteUrl
  }

  async function cancelInvitation() {
    if (!pendingInvitation) return
    await supabase
      .from('partner_invitations')
      .update({ status: 'cancelled' })
      .eq('id', pendingInvitation.id)
      .eq('inviter_id', user.id)
    setPendingInvitation(null)
  }

  async function disconnectPartner() {
    const { data, error } = await supabase.rpc('disconnect_partner')
    if (error) throw new Error(error.message)
    if (!data?.success) throw new Error(data?.error ?? 'Error al desconectar')
    setFamily(prev => (prev ? { ...prev, partner: null } : null))
  }

  return (
    <FamilyContext.Provider
      value={{
        family,
        pendingInvitation,
        familyLoading,
        invitePartner,
        cancelInvitation,
        disconnectPartner,
        refreshFamily: loadFamilyData,
      }}
    >
      {children}
    </FamilyContext.Provider>
  )
}

export function useFamily() {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily debe usarse dentro de FamilyProvider')
  return ctx
}
