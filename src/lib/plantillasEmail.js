// Plantillas de email HTML. Estilos en linea (no solo <style> en el
// head) porque muchos clientes de correo ignoran hojas de estilo
// externas o incluso bloques <style> completos — mejor no fiarse.
const URL_APP = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export function emailBienvenidaPadre({ nombreNino, nombreNegocio }) {
  return `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f6f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f5fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:24px;overflow:hidden;">

            <tr>
              <td style="background-color:#8b7cf6;padding:32px 32px 28px;text-align:center;">
                <div style="font-size:32px;line-height:1;">🌿</div>
                <div style="margin-top:8px;color:#ffffff;font-size:22px;font-weight:700;">Koru</div>
              </td>
            </tr>

            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:17px;line-height:1.5;color:#33323e;">
                  ¡Hola! 👋 <strong>${nombreNegocio ?? 'La guardería/cuidadora'}</strong> te ha dado
                  acceso al diario digital de <strong>${nombreNino}</strong> en Koru.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5b6472;">
                  Koru es el diario digital que sustituye al grupo de WhatsApp de la clase: aquí
                  verás el día a día de ${nombreNino}, sin tener que preguntar.
                </p>

                <div style="text-align:center;margin:0 0 28px;">
                  <a href="${URL_APP}/mi-diario"
                     style="display:inline-block;background-color:#8b7cf6;color:#ffffff;text-decoration:none;
                            font-size:15px;font-weight:600;padding:13px 28px;border-radius:16px;">
                    Ver el diario de ${nombreNino}
                  </a>
                </div>

                <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#33323e;">
                  🌿 Cómo funciona Koru
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 28px;">
                  <tr>
                    <td style="padding:0 0 12px;vertical-align:top;width:28px;font-size:16px;">🍽️</td>
                    <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:#33323e;">
                      Cada día, la cuidadora registra cómo ha comido, si ha dormido la siesta, su
                      estado de ánimo y cualquier nota sobre ${nombreNino}.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;vertical-align:top;width:28px;font-size:16px;">📱</td>
                    <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:#33323e;">
                      Tú lo ves al momento en "Inicio", y el historial completo día por día en
                      "Mi hijo" — sin preguntar por WhatsApp.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 12px;vertical-align:top;width:28px;font-size:16px;">✉️</td>
                    <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:#33323e;">
                      Cada vez que se actualice algo, te avisamos por email como este.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0;vertical-align:top;width:28px;font-size:16px;">🔑</td>
                    <td style="padding:0;font-size:14px;line-height:1.5;color:#33323e;">
                      No hay contraseñas que recordar: entras siempre con un enlace a tu email.
                    </td>
                  </tr>
                </table>

                <div style="background-color:#f1ecfe;border-radius:20px;padding:24px;">
                  <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#8b7cf6;">
                    💜 Sobre la privacidad de ${nombreNino}
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                    <tr>
                      <td style="padding:0 0 12px;vertical-align:top;width:28px;font-size:16px;">🔒</td>
                      <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:#33323e;">
                        Los datos se guardan en servidores dentro de la Unión Europea.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 12px;vertical-align:top;width:28px;font-size:16px;">👀</td>
                      <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:#33323e;">
                        Solo tú y ${nombreNegocio ? `el equipo de ${nombreNegocio}` : 'su guardería/cuidadora'}
                        podéis ver la información de ${nombreNino}. Ningún otro padre ni tercero
                        tiene acceso.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 12px;vertical-align:top;width:28px;font-size:16px;">📸</td>
                      <td style="padding:0 0 12px;font-size:14px;line-height:1.5;color:#33323e;">
                        Las fotos que suba su cuidadora solo las puedes ver y descargar tú — ni
                        siquiera la propia cuidadora puede volver a verlas despues de subirlas.
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0;vertical-align:top;width:28px;font-size:16px;">🗑️</td>
                      <td style="padding:0;font-size:14px;line-height:1.5;color:#33323e;">
                        Puedes pedir el borrado de todos los datos de ${nombreNino} cuando quieras,
                        sin ninguna condición.
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#8b899b;">
                  Este email lo recibes porque ${nombreNegocio ?? 'una guardería/cuidadora'} te ha
                  vinculado como padre/madre de ${nombreNino} en Koru.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}
