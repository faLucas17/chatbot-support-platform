"""
E-mails d'escalade envoyés à l'équipe support.

- Un thème par projet (couleurs et nom), choisi à partir du nom du tenant.
- Un e-mail court : le message du client, qui l'a envoyé, un bouton.
- Envoi par l'API HTTPS de Brevo (Render bloque les ports SMTP).
"""
import requests
from django.conf import settings
from django.utils.html import escape

# ------------------------------------------------------------
# Thèmes par projet
# ------------------------------------------------------------
THEMES = {
    "easycoop": {
        "nom": "EasyCoop",
        "accent": "#E5A93C",       # doré EasyCoop (même couleur que dans Easy Desk)
        "texte_bouton": "#1A1A1A",
    },
    "easyevents": {
        "nom": "Easy Events",
        "accent": "#15AD84",       # vert Easy Event
        "texte_bouton": "#FFFFFF",
    },
}
THEME_PAR_DEFAUT = {"nom": "Easy Desk", "accent": "#0284C7", "texte_bouton": "#FFFFFF"}


def theme_du_projet(nom_tenant):
    cle = "".join(c for c in (nom_tenant or "").lower() if c.isalnum())
    if "coop" in cle:
        return THEMES["easycoop"]
    if "event" in cle:
        return THEMES["easyevents"]
    return {**THEME_PAR_DEFAUT, "nom": nom_tenant or THEME_PAR_DEFAUT["nom"]}


# ------------------------------------------------------------
# E-mail d'escalade
# ------------------------------------------------------------
def send_fancy_email(tenant_name, user_name, user_email, conversation_id,
                     message_content, created_at, lien):
    theme = theme_du_projet(tenant_name)
    accent = theme["accent"]
    projet = escape(theme["nom"])

    # Le texte du client est échappé : un message contenant du HTML
    # ne doit pas pouvoir modifier l'e-mail.
    message = escape(message_content)
    nom = escape(user_name)
    contact = escape(user_email) if user_email and user_email != "Non renseigné" else "e-mail non renseigné"

    sujet = f"[{theme['nom']}] Demande d'assistance de {user_name}"

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px 12px;background:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:520px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E4E4E7;">
        <tr><td style="height:4px;background:{accent};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 28px 0 28px;">
          <p style="margin:0;font-size:13px;font-weight:700;color:{accent};letter-spacing:0.3px;">{projet}</p>
          <h1 style="margin:6px 0 0 0;font-size:20px;line-height:1.3;color:#18181B;">Nouvelle demande d'assistance</h1>
        </td></tr>
        <tr><td style="padding:18px 28px 0 28px;">
          <div style="border-left:3px solid {accent};background:#FAFAFA;padding:12px 16px;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:15px;line-height:1.5;color:#27272A;">{message}</p>
          </div>
          <p style="margin:12px 0 0 0;font-size:13px;line-height:1.5;color:#71717A;">
            <strong style="color:#3F3F46;">{nom}</strong> · {contact}<br>
            Conversation #{conversation_id} · {escape(created_at)}
          </p>
        </td></tr>
        <tr><td style="padding:22px 28px 26px 28px;">
          <a href="{escape(lien)}" style="display:inline-block;background:{accent};color:{theme['texte_bouton']};
             font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:8px;">Répondre dans Easy Desk</a>
        </td></tr>
      </table>
      <p style="margin:14px 0 0 0;font-size:11px;color:#A1A1AA;">Alerte automatique Easy Desk · {projet}</p>
    </td></tr>
  </table>
</body>
</html>"""

    texte = (
        f"{theme['nom']} : nouvelle demande d'assistance\n\n"
        f"\"{message_content}\"\n\n"
        f"{user_name} · {user_email}\n"
        f"Conversation #{conversation_id} · {created_at}\n\n"
        f"Répondre dans Easy Desk : {lien}\n"
    )

    envoyer_email_brevo(settings.ADMIN_EMAIL, sujet, html, texte)


def envoyer_email_brevo(destinataire, sujet, html, texte):
    """Envoie un e-mail via l'API HTTPS de Brevo (port 443).

    Lève une exception si l'envoi échoue, pour que l'erreur apparaisse dans les logs.
    """
    api_key = getattr(settings, 'BREVO_API_KEY', '')
    expediteur = getattr(settings, 'BREVO_SENDER_EMAIL', '')
    if not api_key:
        raise RuntimeError("BREVO_API_KEY manquante dans les variables d'environnement")
    if not expediteur:
        raise RuntimeError("BREVO_SENDER_EMAIL manquante dans les variables d'environnement")
    if not destinataire:
        raise RuntimeError("ADMIN_EMAIL manquante dans les variables d'environnement")

    resp = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": api_key,
            "accept": "application/json",
            "content-type": "application/json",
        },
        json={
            "sender": {"email": expediteur, "name": getattr(settings, 'BREVO_SENDER_NAME', 'Easy Desk Support')},
            "to": [{"email": destinataire}],
            "subject": sujet,
            "htmlContent": html,
            "textContent": texte,
        },
        timeout=15,
    )
    print(f"📧 [BREVO] Réponse status = {resp.status_code} — {resp.text[:300]}")
    if resp.status_code not in (200, 201, 202):
        raise RuntimeError(f"Brevo a refusé l'envoi ({resp.status_code}) : {resp.text[:300]}")