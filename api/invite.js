export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Sin RESEND_API_KEY configurado: responder OK igual (el link está en la UI)
    return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY not configured' })
  }

  const { to, inviterEmail, inviteUrl } = req.body ?? {}
  if (!to || !inviteUrl) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Huella <noreply@resend.dev>'
  const inviterName = inviterEmail?.split('@')[0] ?? 'Tu pareja'

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a Huella</title>
</head>
<body style="margin:0;padding:0;background:#FBF7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F2;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,31,26,.10);">
          <!-- Header -->
          <tr>
            <td style="background:#C4714A;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">huella</p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.85);">Crianza consciente, juntos</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#2D1F1A;line-height:1.3;">
                ${inviterName} te invitó a compartir Huella
              </p>
              <p style="margin:12px 0 0;font-size:15px;color:#7A6258;line-height:1.6;">
                Ahora podrán registrar episodios, hacer seguimiento del progreso y acompañarse mutuamente en la crianza de su hijo/a.
              </p>

              <div style="margin:32px 0;text-align:center;">
                <a href="${inviteUrl}"
                   style="display:inline-block;background:#C4714A;color:#FFFFFF;text-decoration:none;
                          padding:16px 36px;border-radius:14px;font-size:16px;font-weight:700;
                          letter-spacing:0.2px;">
                  Aceptar invitación →
                </a>
              </div>

              <p style="margin:0;font-size:13px;color:#B8A8A0;line-height:1.6;">
                Si el botón no funciona, copia este link en tu navegador:<br />
                <a href="${inviteUrl}" style="color:#C4714A;word-break:break-all;">${inviteUrl}</a>
              </p>

              <p style="margin:20px 0 0;font-size:12px;color:#B8A8A0;">
                Este link expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F5EEE6;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#B8A8A0;">
                Huella — Apoyo para padres y madres en la crianza consciente
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: `${inviterName} te invita a Huella`,
        html,
      }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      console.error('Resend error:', body)
      return res.status(500).json({ error: 'Error al enviar el email', detail: body })
    }

    return res.status(200).json({ sent: true })
  } catch (err) {
    console.error('invite handler error:', err)
    return res.status(500).json({ error: 'Error interno' })
  }
}
