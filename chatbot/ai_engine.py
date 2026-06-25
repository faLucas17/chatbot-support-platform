import os
import requests
from openai import OpenAI

# ============================================================
# CONFIGURATION IA (Grok ou Claude)
# ============================================================
GROK_API_KEY = os.getenv('GROK_API_KEY')
LARAVEL_URL = os.getenv('LARAVEL_URL', 'http://localhost:8000')

if GROK_API_KEY:
    client = OpenAI(
        api_key=GROK_API_KEY,
        base_url="https://api.x.ai/v1",
    )
    print("✅ Grok (xAI) configuré avec succès")
else:
    client = None
    print("⚠️ GROK_API_KEY non trouvée — utilisation du Mock FAQ")


# ============================================================
# VÉRIFICATION DU TOKEN SANCTUM AUPRÈS DE LARAVEL
# ============================================================
def verify_sanctum_token(sanctum_token):
    if not sanctum_token:
        print("🔑 Aucun token fourni")
        return None

    try:
        response = requests.get(
            f"{LARAVEL_URL}/api/user/chatbot-data",
            headers={"Authorization": f"Bearer {sanctum_token}"},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Token valide pour {data.get('user', {}).get('name')}")
            return data
        else:
            print(f"⚠️ Token invalide (status {response.status_code})")
            return None

    except Exception as e:
        print(f"❌ Erreur : {e}")
        return None


# ============================================================
# RÉCUPÉRATION DES DONNÉES PERSONNALISÉES DEPUIS LARAVEL
# ============================================================
def get_participant_data(sanctum_token):
    if not sanctum_token:
        return None

    try:
        response = requests.get(
            f"{LARAVEL_URL}/api/participant/dashboard",
            headers={
                "Authorization": f"Bearer {sanctum_token}",
                "Accept": "application/json",
            },
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Données participant récupérées depuis Laravel")
            return data
        else:
            print(f"⚠️ Impossible de récupérer les données participant (status {response.status_code})")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur récupération données participant : {e}")
        return None


# ============================================================
# FONCTION PRINCIPALE — RÉPONSE DU BOT
# ============================================================
def get_bot_response(message_content, tenant, sanctum_token=None):
    print(f"🔍 Message reçu : {message_content}")
    print(f"🔑 Token reçu par Django : {sanctum_token}")

    user_data = verify_sanctum_token(sanctum_token)
    print(f"👤 user_data après vérification : {user_data}")
    
    participant_data = user_data

    if client is not None:
        try:
            response = client.chat.completions.create(
                model="grok-3-fast-beta",
                messages=[
                    {
                        "role": "system",
                        "content": build_system_prompt(user_data, participant_data)
                    },
                    {
                        "role": "user",
                        "content": message_content
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )
            bot_response = response.choices[0].message.content
            print("✅ Grok : réponse trouvée")
            return bot_response, True

        except Exception as e:
            print(f"❌ Erreur API Grok : {e} — passage au Mock FAQ")

    return mock_response(message_content, tenant, user_data, participant_data)


# ============================================================
# CONSTRUCTION DU PROMPT SYSTÈME POUR GROK / CLAUDE
# ============================================================
def build_system_prompt(user_data=None, participant_data=None):
    base_prompt = """Tu es un assistant de support client pour Easy Events,
une plateforme de gestion d'événements. Tu réponds en français, de façon
concise et utile.

Easy Events permet aux participants de s'inscrire à des événements,
aux organisateurs de créer et gérer des événements, et aux agents PDV
de vendre des billets et scanner les QR codes.

RÈGLES :
- Réponds toujours en français
- Sois concis (3-4 phrases maximum)
- Si tu ne sais pas → dis-le honnêtement
- Pour les questions personnelles d'un utilisateur non connecté → invite-le à se connecter
"""

    if user_data:
        prenom = user_data.get('name', 'Participant')
        email = user_data.get('email', '')

        context_connecte = f"""
UTILISATEUR CONNECTÉ :
- Nom : {prenom}
- Email : {email}
- Tu peux l'appeler par son prénom : {prenom.split()[0] if prenom else 'Participant'}
"""
        if participant_data:
            stats = participant_data.get('statistics', {})
            upcoming = participant_data.get('upcoming_events', [])
            pending_surveys = participant_data.get('pending_surveys', [])

            upcoming_list = ", ".join([e.get('nom', '') for e in upcoming[:3]]) or "Aucun"
            surveys_list = ", ".join([s.get('evenement', {}).get('nom', '') for s in pending_surveys[:3]]) or "Aucun"

            context_connecte += f"""
DONNÉES PERSONNELLES :
- Total événements inscrits : {stats.get('total_events', 0)}
- Événements à venir : {stats.get('upcoming_events', 0)} ({upcoming_list})
- Sondages en attente : {stats.get('pending_surveys', 0)} ({surveys_list})
- Événements passés : {stats.get('past_events', 0)}
"""
        return base_prompt + context_connecte

    return base_prompt + """
UTILISATEUR NON CONNECTÉ :
- Tu peux répondre aux questions générales sur Easy Events
- Pour toute question personnelle (mes événements, mon QR code, mes sondages)
  → invite l'utilisateur à se connecter sur /login
"""


# ============================================================
# MOCK FAQ EASY EVENTS — RÉPONSES PAR ACTEUR
# ============================================================
def mock_response(message_content, tenant, user_data=None, participant_data=None):
    message_lower = message_content.lower().strip()

    # ============================================================
    # 0. MESSAGE D'ACCUEIL (BONJOUR)
    # ============================================================
    if message_lower in ['bonjour', 'salut', 'hello', 'coucou', 'hey']:
        user_info = user_data.get('user', {}) if user_data else None
        prenom = user_info.get('name', '').split()[0] if user_info else None
        
        if prenom:
            return f"""Bonjour {prenom} ! 👋

Je suis Easy, l'assistant Easy Events. Je peux vous aider sur notre plateforme :

- Inscription aux événements
- Création d'événements (organisateurs)
- Gestion des participants
- QR codes et contrôle d'accès
- Sondages et avis
- Agents PDV et commissions

Posez-moi une question, je vous répondrai avec plaisir ! 😊""", True
        else:
            return f"""Bonjour ! 👋

Je suis Easy, l'assistant Easy Events. Je peux vous aider sur notre plateforme :

- Inscription aux événements
- Création d'événements (organisateurs)
- Gestion des participants
- QR codes et contrôle d'accès
- Sondages et avis
- Agents PDV et commissions

Pour accéder à vos informations personnelles, connectez-vous sur /login.

Posez-moi une question, je vous répondrai avec plaisir ! 😊""", True

    # ============================================================
    # 1. BLOCAGE : QUESTIONS PERSONNELLES SANS CONNEXION
    # ============================================================
    questions_perso = ['mes événements', 'mes evenements', 'mon qr', 'mes sondages',
                       'mon compte', 'mon profil', 'mes inscriptions', 'mon billet', 'mon qr code']
    if any(mot in message_lower for mot in questions_perso) and not user_data:
        print("🔒 Blocage : question personnelle sans connexion")
        return "Pour accéder à vos informations personnelles, veuillez vous connecter sur /login. Une fois connecté(e), je pourrai vous répondre de façon personnalisée ! 😊", True

    # ============================================================
    # 2. QUESTIONS PERSONNALISÉES (seulement si connecté)
    # ============================================================
    if user_data:
        stats = user_data.get('statistics', {})
        upcoming = user_data.get('upcoming_events', [])
        pending_surveys = user_data.get('pending_surveys', [])
        user_info = user_data.get('user', {})
        prenom = user_info.get('name', '').split()[0] if user_info else None

        if any(mot in message_lower for mot in ['mes événements', 'mes evenements', 'mes inscriptions', 'événements inscrits']):
            total = stats.get('total_events', 0)
            if total == 0:
                return f"Bonjour {prenom} ! 👋\n\nVous n'êtes inscrit(e) à aucun événement pour le moment.\n\n👉 Découvrez les événements disponibles ici : /events", True
            noms = ", ".join([e.get('nom', '') for e in upcoming[:3]]) if upcoming else "aucun"
            return f"Bonjour {prenom} ! 👋\n\n- Vous avez {total} événement(s) au total.\n- Vos prochains événements : {noms}\n\n👉 Retrouvez tout dans votre tableau de bord : /participant/dashboard", True

        if any(mot in message_lower for mot in ['mes sondages', 'sondage', 'sondages en attente']):
            nb = stats.get('pending_surveys', 0)
            if nb == 0:
                return f"Bonjour {prenom} ! 👋\n\nVous n'avez aucun sondage en attente. 🎉", True
            noms = ", ".join([s.get('evenement', {}).get('nom', '') for s in pending_surveys[:3]])
            return f"Bonjour {prenom} ! 👋\n\n- Vous avez {nb} sondage(s) en attente pour : {noms}\n- Accédez-y ici : /participant/surveys", True

        if any(mot in message_lower for mot in ['qr code', 'qr-code', 'billet', 'ticket']):
            return f"Bonjour {prenom} ! 👋\n\n- Votre QR code a été envoyé par email lors de votre inscription.\n- Vérifiez vos spams si vous ne le trouvez pas.\n- Retrouvez-le aussi dans votre tableau de bord : /participant/dashboard", True

        if any(mot in message_lower for mot in ['mon profil', 'mon compte', 'mes informations']):
            return f"Bonjour {prenom} ! 👋\n\nModifiez vos informations personnelles ici : /participant/profile", True

    # ============================================================
    # 3. PRÉSENTATION DE LA PLATEFORME
    # ============================================================
    if any(mot in message_lower for mot in ['c\'est quoi easy events', 'qu\'est-ce que easy events', 'présentez-vous', 'plateforme', 'easy events c\'est quoi']):
        return """**Easy Events** est une plateforme tout-en-un de gestion d'événements.

En pratique, vous pouvez utiliser Easy Events pour :

- Créer et gérer des événements (dates, lieux, tarifs)
- Gérer les inscriptions des participants
- Générer et scanner des QR codes pour le contrôle d'accès
- Créer et envoyer des sondages après événement
- Gérer des agents PDV (points de vente) avec calcul des commissions
- Suivre vos statistiques et performances

👉 Pour commencer, créez un compte sur /register""", True

    # ============================================================
    # 4. COMMENT S'INSCRIRE
    # ============================================================
    if any(mot in message_lower for mot in ['comment s\'inscrire', 'créer un compte', 'inscription', 'comment créer un compte', 'nouveau compte', 'créer compte participant']):
        return """Pour créer un compte sur Easy Events :

1. Rendez-vous sur la page d'inscription : /register
2. Remplissez le formulaire avec :
   - Votre nom complet
   - Votre email
   - Votre numéro de téléphone
   - Un mot de passe sécurisé
3. Cliquez sur "S'inscrire"

C'est gratuit et rapide !

👉 Une fois inscrit, connectez-vous sur /login et découvrez les événements sur /events""", True

    # ============================================================
    # 5. COMMENT SE CONNECTER
    # ============================================================
    if any(mot in message_lower for mot in ['comment se connecter', 'connexion', 'login', 'se connecter', 'comment se login']):
        return """Pour vous connecter à Easy Events :

1. Rendez-vous sur la page de connexion : /login
2. Entrez votre email et mot de passe
3. Cliquez sur "Se connecter"

👉 Mot de passe oublié ? Cliquez sur "Mot de passe oublié" sur la page de connexion.""", True

    # ============================================================
    # 6. COMMENT S'INSCRIRE À UN ÉVÉNEMENT
    # ============================================================
    if any(mot in message_lower for mot in ['comment s\'inscrire à un événement', 'participer à un événement', 'rejoindre un événement', "s'inscrire événement", 'comment participer']):
        return """Pour vous inscrire à un événement sur Easy Events :

1. Rendez-vous sur la page des événements : /events
2. Choisissez l'événement qui vous intéresse
3. Cliquez sur "S'inscrire maintenant"
4. Confirmez votre inscription

Vous recevrez un QR code par email qui vous servira de billet d'entrée !

👉 Consultez vos inscriptions dans votre tableau de bord → /participant/dashboard""", True

    # ============================================================
    # 7. QU'EST-CE QU'UN QR CODE ?
    # ============================================================
    if any(mot in message_lower for mot in ['qr code', 'c\'est quoi un qr code', 'billet', 'ticket', 'code qr', 'qr-code']):
        return """Le QR code sur Easy Events est votre billet d'entrée numérique !

Lorsque vous vous inscrivez à un événement, vous recevez un QR code unique par email. Ce QR code sera scanné à l'entrée par l'organisateur ou un agent PDV.

📌 Où trouver mon QR code ?
- Dans l'email de confirmation d'inscription
- Dans votre tableau de bord participant → /participant/dashboard

👉 Si vous ne trouvez pas votre QR code, vérifiez vos spams ou contactez le support.""", True

    # ============================================================
    # 8. COMMENT CRÉER UN ÉVÉNEMENT ? (organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['comment créer un événement', 'créer événement', 'organiser un événement', 'créer un événement', 'nouvel événement']):
        return """Pour créer un événement sur Easy Events (réservé aux organisateurs) :

📱 Depuis l'application mobile :
1. Connectez-vous avec votre compte organisateur
2. Allez dans l'onglet "Nouveau"
3. Remplissez le formulaire (titre, description, date, lieu, tarif, catégorie)
4. Soumettez votre événement

⏳ L'événement sera en attente de validation par l'administrateur avant publication.""", True

    # ============================================================
    # 9. CONTACTER LE SUPPORT
    # ============================================================
    if any(mot in message_lower for mot in ['contacter support', 'aide', 'assistance', 'problème', 'bug', 'support', 'help']):
        return """Pour contacter le support Easy Events :

📧 Email : support@easyevents.com

Décrivez votre problème de manière détaillée, nous vous répondrons dans les plus brefs délais.""", True

    # ============================================================
    # 10. MOT DE PASSE OUBLIÉ
    # ============================================================
    if any(mot in message_lower for mot in ['mot de passe oublié', 'réinitialiser mot de passe', 'password oublié', 'oublié mot de passe']):
        return """Mot de passe oublié ?

1. Rendez-vous sur /login
2. Cliquez sur "Mot de passe oublié"
3. Entrez votre email
4. Vous recevrez un lien de réinitialisation

📌 Vérifiez vos spams si vous ne trouvez pas l'email.""", True

    # ============================================================
    # 11. FAQ PUBLIQUE (fonctionnalités, tarifs, places)
    # ============================================================
    faq_publique = [
        {
            'keywords': ['fonctionnalités', 'que peut-on faire', 'à quoi ça sert'],
            'reponse': """Easy Events permet de :

- Créer et gérer des événements
- S'inscrire à des événements
- Générer et scanner des QR codes
- Créer et répondre à des sondages
- Gérer des agents PDV et commissions

👉 Découvrez tout sur /events"""
        },
        {
            'keywords': ['tarif', 'prix', 'gratuit', 'payant', 'combien coûte'],
            'reponse': """- L'inscription à la plateforme est gratuite.
- Les événements peuvent être gratuits ou payants.
- Le tarif est affiché sur la page de chaque événement sur /events"""
        },
        {
            'keywords': ['places restantes', 'places disponibles', 'complet'],
            'reponse': """- Le nombre de places disponibles est affiché sur la page de chaque événement.
- Si l'événement est complet, le bouton d'inscription affichera "Complet".

👉 Consultez les événements ici : /events"""
        },
    ]

    for item in faq_publique:
        if any(mot in message_lower for mot in item['keywords']):
            print(f"✅ FAQ publique : correspondance trouvée")
            return item['reponse'], True

    # ============================================================
    # 12. RECHERCHE DANS LA BASE DE CONNAISSANCE ADMIN
    # ============================================================
    for item in tenant.knowledge_items.all():
        if item.question and (
            item.question.lower() in message_lower or
            message_lower in item.question.lower()
        ):
            print(f"✅ Base de connaissance admin : correspondance ({item.question})")
            return item.answer, True

    # ============================================================
    # 13. RECHERCHE DANS LES DOCUMENTS UPLOADÉS
    # ============================================================
    for doc in tenant.documents.all():
        if doc.content and len(message_lower) > 5:
            if doc.content.lower().find(message_lower[:20]) != -1:
                print(f"✅ Document : correspondance ({doc.title})")
                return f"📄 D'après '{doc.title}' :\n\n{doc.content[:500]}...", True

    # ============================================================
    # 14. DERNIER RECOURS
    # ============================================================
    print("❌ Aucune réponse → escalade")
    return None, False