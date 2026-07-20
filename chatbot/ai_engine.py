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
    print(" Grok (xAI) configuré avec succès")
else:
    client = None
    print(" GROK_API_KEY non trouvée — utilisation du Mock FAQ")


# ============================================================
# VÉRIFICATION DU TOKEN SANCTUM AUPRÈS DE LARAVEL
# ============================================================
def verify_sanctum_token(sanctum_token):
    if not sanctum_token:
        print(" Aucun token fourni")
        return None

    try:
        response = requests.get(
            f"{LARAVEL_URL}/api/user/chatbot-data",
            headers={"Authorization": f"Bearer {sanctum_token}"},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            
            user_data = data.get('user', {})
            role = user_data.get('role', 'participant')
            
            data['role'] = role
            data['is_organizer'] = (role == 'organisateur' or role == 'organizer')
            
            print(f" Token valide pour {user_data.get('name')} (rôle: {role})")
            return data
        else:
            print(f" Token invalide (status {response.status_code})")
            return None

    except Exception as e:
        print(f" Erreur : {e}")
        return None


# ============================================================
# RÉCUPÉRATION DES DONNÉES PARTICIPANT
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
            print(" Données participant récupérées depuis Laravel")
            return data
        else:
            print(f" Impossible de récupérer les données participant (status {response.status_code})")
            return None

    except requests.exceptions.RequestException as e:
        print(f" Erreur récupération données participant : {e}")
        return None


# ============================================================
# RÉCUPÉRATION DES DONNÉES ORGANISATEUR
# ============================================================
def get_organizer_data(sanctum_token):
    if not sanctum_token:
        return None

    try:
        response = requests.get(
            f"{LARAVEL_URL}/api/organisateur/evenements",
            headers={
                "Authorization": f"Bearer {sanctum_token}",
                "Accept": "application/json",
            },
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            print(" Données organisateur récupérées depuis Laravel")
            return data
        else:
            print(f" Impossible de récupérer les données organisateur (status {response.status_code})")
            return None

    except requests.exceptions.RequestException as e:
        print(f" Erreur récupération données organisateur : {e}")
        return None


# ============================================================
# RÉCUPÉRATION DES KPIs ORGANISATEUR
# ============================================================
def get_organizer_kpis(sanctum_token):
    if not sanctum_token:
        return None

    try:
        response = requests.get(
            f"{LARAVEL_URL}/api/organisateur/kpi",
            headers={
                "Authorization": f"Bearer {sanctum_token}",
                "Accept": "application/json",
            },
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            print(" KPIs organisateur récupérés")
            return data
        else:
            print(f" Impossible de récupérer les KPIs (status {response.status_code})")
            return None

    except requests.exceptions.RequestException as e:
        print(f" Erreur récupération KPIs : {e}")
        return None


# ============================================================
# FONCTION PRINCIPALE — RÉPONSE DU BOT
# ============================================================
def get_bot_response(message_content, tenant, sanctum_token=None):
    print(f" Message reçu : {message_content}")
    print(f" Token reçu par Django : {sanctum_token}")

    user_data = verify_sanctum_token(sanctum_token)
    print(f" user_data après vérification : {user_data}")
    
    participant_data = None
    organizer_data = None
    organizer_kpis = None
    
    if user_data:
        if user_data.get('is_organizer', False):
            organizer_data = get_organizer_data(sanctum_token)
            organizer_kpis = get_organizer_kpis(sanctum_token)
        else:
            participant_data = get_participant_data(sanctum_token)

    if client is not None:
        try:
            response = client.chat.completions.create(
                model="grok-3-fast-beta",
                messages=[
                    {
                        "role": "system",
                        "content": build_system_prompt(user_data, participant_data, organizer_data, organizer_kpis)
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
            print(" Grok : réponse trouvée")
            return bot_response, True

        except Exception as e:
            print(f" Erreur API Grok : {e} — passage au Mock FAQ")

    return mock_response(message_content, tenant, user_data, participant_data, organizer_data, organizer_kpis)


# ============================================================
# CONSTRUCTION DU PROMPT SYSTÈME POUR GROK / CLAUDE
# ============================================================
def build_system_prompt(user_data=None, participant_data=None, organizer_data=None, organizer_kpis=None):
    base_prompt = """Tu es un assistant de support client pour Easy Events,
une plateforme de gestion d'événements. Tu réponds en français, de façon
concise et utile, en utilisant un langage simple et accessible à tous.

Easy Events permet :
- Aux PARTICIPANTS de s'inscrire à des événements et recevoir leurs QR codes
- Aux ORGANISATEURS de créer/gérer des événements, voir les participants, scanner les QR codes
- Aux AGENTS PDV de vendre des billets

RÈGLES :
- Réponds toujours en français, avec des mots simples
- Sois concis (3-4 phrases maximum)
- Si tu ne sais pas → dis-le honnêtement
- Pour les questions personnelles d'un utilisateur non connecté → invite-le à se connecter
- Adapte ta réponse au rôle de l'utilisateur (participant ou organisateur)
- N'utilise JAMAIS de termes techniques comme "endpoint", "API", "token"
"""

    if user_data:
        user_info = user_data.get('user', {})
        prenom = user_info.get('name', 'Utilisateur')
        email = user_info.get('email', '')
        role = user_data.get('role', 'participant')
        is_organizer = user_data.get('is_organizer', False)

        context_connecte = f"""
UTILISATEUR CONNECTÉ :
- Nom : {prenom}
- Email : {email}
- Rôle : {role}
- Tu peux l'appeler par son prénom : {prenom.split()[0] if prenom else 'Utilisateur'}
"""
        
        if is_organizer:
            context_connecte += """
FONCTIONNALITÉS ORGANISATEUR (application mobile) :
- Voir la liste de vos événements
- Voir les détails d'un événement
- Voir vos statistiques
- Scanner les QR codes pour valider la présence
- Créer un événement
- Créer des sondages

Toutes ces fonctionnalités sont disponibles dans l'application mobile Easy Events.
"""
            
            if organizer_data:
                events = organizer_data.get('events', [])
                if isinstance(organizer_data, dict) and 'events' in organizer_data:
                    events = organizer_data['events']
                total_events = len(events)
                event_names = [e.get('nom', 'Sans nom') for e in events[:5]]
                context_connecte += f"""
DONNÉES ORGANISATEUR :
- Nombre total d'événements créés : {total_events}
- Événements : {', '.join(event_names) if event_names else 'Aucun événement créé'}
"""
            
            if organizer_kpis:
                context_connecte += f"""
STATISTIQUES :
{organizer_kpis}
"""
        
        else:
            context_connecte += """
FONCTIONNALITÉS PARTICIPANT (site web) :
- Voir la liste des événements disponibles
- S'inscrire à un événement
- Voir son tableau de bord
- Voir ses événements
- Voir ses sondages
- Gérer son profil

Toutes ces fonctionnalités sont disponibles sur le site web Easy Events.
"""
            
            if participant_data:
                stats = participant_data.get('statistics', {})
                upcoming = participant_data.get('upcoming_events', [])
                pending_surveys = participant_data.get('pending_surveys', [])

                upcoming_list = ", ".join([e.get('nom', '') for e in upcoming[:3]]) or "Aucun"
                surveys_list = ", ".join([s.get('evenement', {}).get('nom', '') for s in pending_surveys[:3]]) or "Aucun"

                context_connecte += f"""
DONNÉES PARTICIPANT :
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
# MOCK FAQ EASY EVENTS — RÉPONSES PAR ACTEUR (Version grand public)
# ============================================================
def mock_response(message_content, tenant, user_data=None, participant_data=None, organizer_data=None, organizer_kpis=None):
    message_lower = message_content.lower().strip()
    
    is_organizer = user_data.get('is_organizer', False) if user_data else False
    user_info = user_data.get('user', {}) if user_data else {}
    prenom = user_info.get('name', '').split()[0] if user_info else None

    # ============================================================
    # 0. MESSAGE D'ACCUEIL (BONJOUR) - ADAPTÉ AU RÔLE
    # ============================================================
    if message_lower in ['bonjour', 'salut', 'hello', 'coucou', 'hey']:
        if prenom and is_organizer:
            return f"""Bonjour {prenom} ! 👋

Je suis Easy, votre assistant pour les organisateurs.

Je peux vous aider avec :
- Voir la liste de vos événements
- Voir les détails d'un événement et ses participants
- Voir vos statistiques
- Scanner des QR codes
- Créer ou modifier un événement

Tout est disponible dans l'application mobile.

Posez-moi une question sur la gestion de vos événements ! 😊""", True
        
        elif prenom and not is_organizer:
            return f"""Bonjour {prenom} ! 👋

Je suis Easy, votre assistant pour les participants.

Je peux vous aider avec :
- Inscription aux événements
- QR codes et billets
- Sondages et avis
- Votre profil

Tout est disponible sur le site web.

Posez-moi une question, je vous répondrai avec plaisir ! 😊""", True
        
        else:
            return f"""Bonjour ! 👋

Je suis Easy, l'assistant Easy Events.

Que vous soyez participant ou organisateur, je suis là pour vous aider :

Pour les PARTICIPANTS (site web) :
   - Inscriptions aux événements
   - QR codes et billets
   - Sondages

Pour les ORGANISATEURS (application mobile) :
   - Gestion d'événements
   - Scan QR codes
   - Gestion des participants

Pour accéder à vos informations, connectez-vous.

Posez-moi une question ! 😊""", True

    # ============================================================
    # 1. BLOCAGE : QUESTIONS PERSONNELLES SANS CONNEXION
    # ============================================================
    questions_perso = ['mes événements', 'mes evenements', 'mon qr', 'mes sondages',
                       'mon compte', 'mon profil', 'mes inscriptions', 'mon billet',
                       'mes participants', 'scan qr', 'scanner', 'kpi', 'statistiques']
    if any(mot in message_lower for mot in questions_perso) and not user_data:
        print("Blocage : question personnelle sans connexion")
        return "Pour accéder à vos informations personnelles, veuillez vous connecter. Une fois connecté(e), je pourrai vous répondre de façon personnalisée ! 😊", True

    # ============================================================
    # QUESTIONS SPÉCIFIQUES AUX ORGANISATEURS
    # ============================================================

    # ============================================================
    # 2. MES ÉVÉNEMENTS (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['mes événements', 'mes evenements', 'liste événements', 'événements créés', 'mes events', 'mes événements organisateur']):
        if not user_data:
            return "Pour voir vos événements, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nCette fonctionnalité est réservée aux organisateurs. Si vous êtes participant, consultez vos inscriptions sur le site web dans la rubrique 'Mes événements'.", True
        
        if organizer_data:
            events = organizer_data
            if isinstance(organizer_data, dict) and 'events' in organizer_data:
                events = organizer_data['events']
            
            if not events:
                return f"Bonjour {prenom} ! 👋\n\nVous n'avez pas encore créé d'événement.\n\n👉 Pour créer votre premier événement, ouvrez l'application mobile et cliquez sur le bouton 'Nouvel événement' ou '+'.", True
            
            event_list = "\n".join([f"• {e.get('nom', 'Sans nom')}" for e in events[:5]])
            total = len(events)
            
            kpi_text = ""
            if organizer_kpis:
                kpi_text = f"\n\n Vos statistiques : {organizer_kpis}"
            
            return f"Bonjour {prenom} ! 👋\n\nVous avez {total} événement(s) créé(s) :\n\n{event_list}\n\n Consultez tous vos événements dans l'application mobile, onglet 'Mes événements'.{kpi_text}", True
        
        return f"Bonjour {prenom} ! 👋\n\nConsultez vos événements dans l'application mobile, onglet 'Mes événements'.", True

    # ============================================================
    # 3. DÉTAILS D'UN ÉVÉNEMENT (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['détails événement', 'details evenement', 'infos événement', 'information événement', 'détail événement']):
        if not user_data:
            return "Pour voir les détails de vos événements, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return "Cette fonctionnalité est réservée aux organisateurs. Les participants peuvent voir les événements sur le site web.", True
        
        return f"""Bonjour {prenom} ! 👋

Pour voir les détails d'un événement :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Cliquez sur l'événement qui vous intéresse

Vous verrez alors :
- Le nom, la description, la date et le lieu
- Le nombre total de participants
- La liste complète des participants

Ces informations sont disponibles en temps réel dans l'application.""", True

    # ============================================================
    # 4. STATISTIQUES / KPIS (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['kpi', 'statistiques', 'statistiques organisateur', 'dashboard organisateur', 'tableau de bord organisateur']):
        if not user_data:
            return "Pour voir vos statistiques, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nCette fonctionnalité est réservée aux organisateurs. En tant que participant, votre tableau de bord est sur le site web.", True
        
        if organizer_kpis:
            return f"""Bonjour {prenom} ! 👋

Vos statistiques :

{organizer_kpis}

Pour plus de détails, consultez votre tableau de bord dans l'application mobile.""", True
        
        return f"""Bonjour {prenom} ! 👋

Pour voir vos statistiques :

1. Ouvrez l'application mobile
2. Connectez-vous avec votre compte organisateur
3. Accédez à votre tableau de bord

Vous y verrez :
- Le nombre total d'événements
- Le nombre de participants
- Le taux de participation
- Et plus encore !""", True

    # ============================================================
    # 5. LISTE DES PARTICIPANTS (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['liste participants', 'participants', 'qui est inscrit', 'nombre participants', 'liste des participants', 'participants événement']):
        if not user_data:
            return "Pour voir la liste des participants, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nCette fonctionnalité est réservée aux organisateurs pour gérer leurs événements.", True
        
        if organizer_data:
            events = organizer_data
            if isinstance(organizer_data, dict) and 'events' in organizer_data:
                events = organizer_data['events']
            
            if not events:
                return f"Bonjour {prenom} ! 👋\n\nVous n'avez pas encore créé d'événement. Créez-en un pour voir les participants s'inscrire !", True
            
            total_participants = 0
            for e in events:
                if isinstance(e, dict):
                    total_participants += e.get('participants_count', 0)
            
            return f"""Bonjour {prenom} ! 👋

Vue d'ensemble :
- Total participants : {total_participants} personnes
- Nombre d'événements : {len(events)}

Pour voir la liste détaillée des participants :
1. Ouvrez l'application mobile
2. Cliquez sur un événement
3. La liste s'affiche avec les noms et emails

Une liste à jour en temps réel est disponible dans l'application.""", True
        
        return f"""Bonjour {prenom} ! 👋

Pour voir la liste des participants à vos événements :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Sélectionnez l'événement
4. La liste des participants s'affiche

Vous verrez aussi le nombre total en temps réel.""", True

    # ============================================================
    # 6. SCANNER UN QR CODE (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['scanner qr', 'scan qr', 'qr code scan', 'valider présence', 'enregistrer présence', 'scan code', 'scanner', 'scan qr code']):
        if not user_data:
            return "Pour scanner des QR codes, connectez-vous à votre compte organisateur sur l'application mobile.", True
        
        if not is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nLe scan de QR code est réservé aux organisateurs. Si vous êtes participant, votre QR code vous a été envoyé par email.", True
        
        return f"""Bonjour {prenom} ! 👋

Pour scanner un QR code :

1. Ouvrez l'application mobile Easy Events
2. Connectez-vous avec votre compte organisateur
3. Allez dans les détails de votre événement
4. Utilisez la fonction de scan

Scan réussi → présence enregistrée automatiquement
QR invalide → message d'erreur affiché

Le participant doit avoir son QR code prêt avant le scan.""", True

    # ============================================================
    # 7. CRÉER UN ÉVÉNEMENT (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['créer événement', 'créer un événement', 'nouvel événement', 'ajouter événement', 'créer event', 'nouvel event']):
        if not user_data:
            return "Pour créer un événement, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nLa création d'événements est réservée aux organisateurs. Vous pouvez vous inscrire à des événements sur le site web.", True
        
        return f"""Bonjour {prenom} ! 👋

Pour créer un événement :

1. Ouvrez l'application mobile Easy Events
2. Connectez-vous avec votre compte organisateur
3. Cliquez sur le bouton 'Nouvel événement' ou '+'

Informations à remplir :
   • Nom de l'événement
   • Description
   • Date et heure
   • Lieu
   • Nombre de places disponibles
   • Catégorie

L'événement sera créé immédiatement dans votre espace.""", True

    # ============================================================
    # 8. MODIFIER UN ÉVÉNEMENT (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['modifier événement', 'modifier un événement', 'mettre à jour', 'éditer événement', 'update event']):
        if not user_data:
            return "Pour modifier un événement, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return "Cette fonctionnalité est réservée aux organisateurs.", True
        
        return f"""Bonjour {prenom} ! 👋

Pour modifier un événement :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Cliquez sur l'événement à modifier
4. Utilisez le bouton 'Modifier'
5. Mettez à jour les informations
6. Validez les modifications

Les participants seront notifiés des changements importants.""", True

    # ============================================================
    # 9. SUPPRIMER UN ÉVÉNEMENT (Organisateur)
    # ============================================================
    if any(mot in message_lower for mot in ['supprimer événement', 'supprimer un événement', 'annuler événement', 'delete event']):
        if not user_data:
            return "Pour supprimer un événement, connectez-vous à votre compte organisateur.", True
        
        if not is_organizer:
            return "Cette fonctionnalité est réservée aux organisateurs.", True
        
        return f"""Bonjour {prenom} ! 👋

Attention - Suppression d'événement :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Cliquez sur l'événement à supprimer
4. Utilisez le bouton 'Supprimer'
5. Confirmez la suppression

Une notification sera envoyée automatiquement à tous les participants inscrits.

Cette action est irréversible !""", True

    # ============================================================
    # 10. AUTHENTIFICATION ORGANISATEUR
    # ============================================================
    if any(mot in message_lower for mot in ['se connecter organisateur', 'compte organisateur', 'login organisateur', 'connexion organisateur', 'organisateur login']):
        return """ Pour vous connecter :

1. Ouvrez l'application mobile Easy Events
2. Saisissez votre email et mot de passe
3. Cliquez sur 'Se connecter'

Avantages :
- Restez connecté même après avoir fermé l'application
- Accès à tous vos événements
- Scan de QR codes en temps réel
- Gestion des participants en direct

En cas d'erreur : un message vous indiquera quoi corriger

👉 Mot de passe oublié ? Utilisez la fonction 'Mot de passe oublié'.""", True

    # ============================================================
    # 11. INSCRIPTION ORGANISATEUR
    # ============================================================
    if any(mot in message_lower for mot in ['créer compte organisateur', 's\'inscrire organisateur', 'register organisateur']):
        return """ Pour créer un compte organisateur :

Informations à fournir :
- Votre nom complet
- Votre email
- Votre numéro de téléphone
- Votre mot de passe

1. Rendez-vous sur la page d'inscription
2. Choisissez le type "Organisateur"
3. Remplissez le formulaire
4. Validez votre inscription

Une fois inscrit, connectez-vous à l'application mobile !

L'application mobile est disponible pour les organisateurs !""", True

    # ============================================================
    # QUESTIONS SPÉCIFIQUES AUX PARTICIPANTS (CONSERVÉES)
    # ============================================================

    # ============================================================
    # 12. INSCRIPTION À UN ÉVÉNEMENT (Participant)
    # ============================================================
    if any(mot in message_lower for mot in ['comment s\'inscrire à un événement', 'participer à un événement', 'rejoindre un événement', "s'inscrire événement", 'comment participer', 'inscription événement']):
        if is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nEn tant qu'organisateur, vous ne vous inscrivez pas aux événements, vous les créez ! Ouvrez l'application mobile et cliquez sur 'Nouvel événement'.", True
        
        return """ Pour vous inscrire à un événement :

1. Rendez-vous sur la page des événements du site web
2. Choisissez l'événement qui vous intéresse
3. Cliquez sur "S'inscrire maintenant"
4. Confirmez votre inscription

Vous recevrez un QR code par email qui vous servira de billet d'entrée !

👉 Consultez vos inscriptions dans votre tableau de bord.""", True

    # ============================================================
    # 13. MON QR CODE (Participant)
    # ============================================================
    if any(mot in message_lower for mot in ['mon qr', 'mon qr code', 'mon billet', 'mon ticket', 'qr code participant']):
        if is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nEn tant qu'organisateur, vous scannez les QR codes des participants, vous n'en recevez pas. Utilisez l'application mobile pour scanner.", True
        
        return f"""Bonjour {prenom} ! 👋

Votre QR code est votre billet d'entrée !

Où le trouver ?
- Dans l'email de confirmation d'inscription
- Dans votre tableau de bord sur le site web

Si vous ne le trouvez pas :
- Vérifiez vos spams
- Contactez le support

Gardez votre QR code accessible (capture d'écran ou imprimé) pour l'entrée.""", True

    # ============================================================
    # 14. MES SONDAGES (Participant)
    # ============================================================
    if any(mot in message_lower for mot in ['mes sondages', 'sondage', 'sondages en attente', 'avis', 'sondages participant']):
        if is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nLes sondages sont destinés aux participants après les événements. En tant qu'organisateur, vous pouvez créer des sondages depuis votre tableau de bord.", True
        
        if participant_data:
            stats = participant_data.get('statistics', {})
            pending = participant_data.get('pending_surveys', [])
            nb = stats.get('pending_surveys', 0)
            
            if nb == 0:
                return f"Bonjour {prenom} ! 👋\n\nVous n'avez aucun sondage en attente. 🎉\n\nLes sondages apparaissent après votre participation à un événement.", True
            
            noms = ", ".join([s.get('evenement', {}).get('nom', '') for s in pending[:3]])
            return f"Bonjour {prenom} ! 👋\n\n Vous avez {nb} sondage(s) en attente pour : {noms}\n\n👉 Accédez-y dans votre tableau de bord.", True
        
        return """ Pour voir vos sondages :

1. Connectez-vous sur le site web
2. Allez dans votre tableau de bord
3. Section 'Sondages en attente'

Les sondages apparaissent après votre participation à un événement.""", True

    # ============================================================
    # 15. MON PROFIL (Participant)
    # ============================================================
    if any(mot in message_lower for mot in ['mon profil', 'mon compte', 'mes informations', 'profil participant']):
        if is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nVotre profil organisateur est accessible dans l'application mobile, rubrique 'Mon compte'.", True
        
        return f"""Bonjour {prenom} ! 👋

👤 Pour gérer votre profil :

1. Connectez-vous sur le site web
2. Allez dans la rubrique 'Mon profil'

Vous pouvez modifier :
- Votre nom
- Votre email
- Votre téléphone
- Votre mot de passe""", True

    # ============================================================
    # 16. LISTE DES ÉVÉNEMENTS (Public)
    # ============================================================
    if any(mot in message_lower for mot in ['liste événements', 'événements disponibles', 'tous les événements', 'events disponibles', 'voir événements']):
        if is_organizer:
            return f"Bonjour {prenom} ! 👋\n\nEn tant qu'organisateur, vos événements sont dans l'application mobile. Pour voir tous les événements publics, rendez-vous sur le site web.", True
        
        return """ Pour voir tous les événements disponibles :

1. Rendez-vous sur le site web
2. Vous pouvez filtrer par catégorie
3. Cliquez sur un événement pour voir ses détails

Pour vous inscrire : cliquez sur "S'inscrire" sur la page de l'événement.""", True

    # ============================================================
    # 17. PRÉSENTATION DE LA PLATEFORME
    # ============================================================
    if any(mot in message_lower for mot in ['c\'est quoi easy events', 'qu\'est-ce que easy events', 'présentez-vous', 'plateforme', 'easy events c\'est quoi', 'easy events']):
        return """**Easy Events** est une plateforme qui vous aide à gérer des événements.

Pour les PARTICIPANTS (site web) :
- S'inscrire aux événements en quelques clics
- Recevoir son QR code par email
- Répondre aux sondages après l'événement

Pour les ORGANISATEURS (application mobile) :
- Créer des événements facilement
- Scanner les QR codes à l'entrée
- Gérer les participants en temps réel
- Voir ses statistiques

Application mobile pour les organisateurs
Site web pour les participants

👉 Pour commencer : créez votre compte !""", True

    # ============================================================
    # 18. COMMENT CRÉER UN COMPTE
    # ============================================================
    if any(mot in message_lower for mot in ['comment s\'inscrire', 'créer un compte', 'inscription', 'comment créer un compte', 'nouveau compte', 'create account']):
        return """ Pour créer un compte sur Easy Events :

Pour un compte PARTICIPANT :
- Rendez-vous sur le site web
- Cliquez sur "S'inscrire"
- Remplissez le formulaire

Pour un compte ORGANISATEUR :
- Depuis l'application mobile
- Cliquez sur "Créer un compte"
- Choisissez "Organisateur"
- Remplissez le formulaire

Pour un compte AGENT PDV :
- Un organisateur doit vous créer

Une fois inscrit, connectez-vous !""", True

    # ============================================================
    # 19. MOT DE PASSE OUBLIÉ
    # ============================================================
    if any(mot in message_lower for mot in ['mot de passe oublié', 'réinitialiser mot de passe', 'password oublié', 'oublié mot de passe', 'change password']):
        return """ Mot de passe oublié ?

1. Utilisez l'option "Mot de passe oublié" sur la page de connexion
2. Entrez votre email
3. Vous recevrez un code de réinitialisation
4. Utilisez ce code pour créer un nouveau mot de passe

Vérifiez vos spams si vous ne trouvez pas l'email.""", True

    # ============================================================
    # 20. CONTACTER LE SUPPORT
    # ============================================================
    if any(mot in message_lower for mot in ['contacter support', 'aide', 'assistance', 'problème', 'bug', 'support', 'help', 'help me']):
        return """ Pour contacter le support Easy Events :

Email : support@easyevents.com

Pour vous aider au mieux, précisez :
- Votre nom et email
- Votre rôle (participant ou organisateur)
- La nature du problème
- Des captures d'écran si possible

Vous pouvez aussi escalader la conversation vers un agent via le chat.

Nous vous répondrons dans les plus brefs délais.""", True

    # ============================================================
    # 21. FAQ PUBLIQUE GÉNÉRALE
    # ============================================================
    faq_publique = [
        {
            'keywords': ['fonctionnalités', 'que peut-on faire', 'à quoi ça sert'],
            'reponse': """Easy Events permet :

Participants (site web) : inscriptions, QR codes, sondages
Organisateurs (mobile) : création d'événements, scan QR, gestion des participants
Agents PDV : vente de tickets, commissions

👉 Découvrez tout sur la plateforme !"""
        },
        {
            'keywords': ['tarif', 'prix', 'gratuit', 'payant', 'combien coûte', 'free'],
            'reponse': """ Tarifs Easy Events :

- L'inscription à la plateforme est gratuite
- Les événements peuvent être gratuits ou payants
- Le prix est affiché sur la page de chaque événement
- Les commissions pour les agents sont configurées par l'organisateur"""
        },
        {
            'keywords': ['places restantes', 'places disponibles', 'complet', 'capacité'],
            'reponse': """Places disponibles :

- Le nombre de places est affiché sur la page de chaque événement
- Si l'événement est complet, le bouton "S'inscrire" sera désactivé

👉 Consultez les événements sur le site web !"""
        },
        {
            'keywords': ['agent pdv', 'pdv', 'point de vente', 'commissions', 'ticket'],
            'reponse': """ Agents PDV sur Easy Events :

- Un agent PDV vend des tickets pour les événements
- Les commissions sont fixées par l'organisateur
- Les organisateurs gèrent leurs agents dans l'application mobile
- Les agents voient leurs ventes et commissions dans leur espace"""
        },
    ]

    for item in faq_publique:
        if any(mot in message_lower for mot in item['keywords']):
            print(f" FAQ publique : correspondance trouvée")
            return item['reponse'], True

    # ============================================================
    # 22. RECHERCHE DANS LA BASE DE CONNAISSANCE ADMIN
    # ============================================================
    if hasattr(tenant, 'knowledge_items'):
        for item in tenant.knowledge_items.all():
            if item.question and (
                item.question.lower() in message_lower or
                message_lower in item.question.lower()
            ):
                print(f" Base de connaissance admin : correspondance ({item.question})")
                return item.answer, True

    # ============================================================
    # 23. RECHERCHE DANS LES DOCUMENTS UPLOADÉS
    # ============================================================
    if hasattr(tenant, 'documents'):
        for doc in tenant.documents.all():
            if doc.content and len(message_lower) > 5:
                if doc.content.lower().find(message_lower[:20]) != -1:
                    print(f" Document : correspondance ({doc.title})")
                    return f"📄 D'après '{doc.title}' :\n\n{doc.content[:500]}...", True

    # ============================================================
    # 24. DERNIER RECOURS - ESCALADE
    # ============================================================
    print("❌ Aucune réponse → escalade")
    return None, False