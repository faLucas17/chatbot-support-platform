import os
import re
import unicodedata
import requests
from openai import OpenAI

# ============================================================
# MATCHING INTELLIGENT — comprend l'utilisateur "lambda"
# (sans accents, au singulier/pluriel, avec des fautes de frappe)
# dont on détecte si un mot-clé est présent dans le message.
# ============================================================
def normalize_text(text):
    """Minuscule, sans accents, sans ponctuation, espaces propres."""
    if not text:
        return ""
    text = text.lower().strip()
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def levenshtein(a, b):
    """Distance de Damerau-Levenshtein restreinte : nombre de lettres à
    changer/ajouter/retirer, en comptant aussi les transpositions de deux
    lettres adjacentes comme une seule erreur (ex: 'profil' -> 'proifl')."""
    if a == b:
        return 0
    la, lb = len(a), len(b)
    if la == 0:
        return lb
    if lb == 0:
        return la
    d = [[0] * (lb + 1) for _ in range(la + 1)]
    for i in range(la + 1):
        d[i][0] = i
    for j in range(lb + 1):
        d[0][j] = j
    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,       # suppression
                d[i][j - 1] + 1,       # insertion
                d[i - 1][j - 1] + cost,  # substitution
            )
            if (
                i > 1 and j > 1
                and a[i - 1] == b[j - 2]
                and a[i - 2] == b[j - 1]
            ):
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)  # transposition
    return d[la][lb]


def is_subsequence(short, long):
    """True si toutes les lettres de 'short' apparaissent dans 'long',
    dans le même ordre (ex: 'evnmnt' est une sous-séquence de 'evenement').
    C'est typique de l'écriture SMS où on saute des lettres, pas d'un
    mot différent au sens différent."""
    it = iter(long)
    return all(ch in it for ch in short)


def word_matches(kw, mw):
    """Est-ce que le mot du message 'mw' correspond au mot-clé 'kw' ?
    Tolère : accents (déjà enlevés en amont), singulier/pluriel,
    et les fautes de frappe / lettres manquantes (ex: 'evnmnt' ~ 'evenement').
    Reste strict pour éviter les faux positifs entre deux mots différents
    qui se ressemblent (ex: 'coute' ne doit pas matcher 'compte')."""
    if kw == mw:
        return True

    # tolérance singulier / pluriel simple (événement / événements)
    kw_s = kw[:-1] if kw.endswith('s') and len(kw) > 3 else kw
    mw_s = mw[:-1] if mw.endswith('s') and len(mw) > 3 else mw
    if kw_s == mw_s:
        return True

    # pas de tolérance aux fautes de frappe sur les mots trop courts
    # (sinon "ou"/"et"/"la" matchent n'importe quoi -> faux positifs)
    if len(kw_s) < 4 or len(mw_s) < 3:
        return False

    # faute de frappe simple (une lettre substituée/doublée/inversée)
    if levenshtein(kw_s, mw_s) <= 1:
        return True

    # écriture abrégée type SMS : des lettres sont sautées mais dans le
    # bon ordre (ex: "evnmnt" pour "evenement") — on exige que ce soit
    # bien une sous-séquence ET que peu de lettres manquent, pour ne pas
    # confondre deux mots différents (ex: "coute" vs "compte")
    shorter, longer = (kw_s, mw_s) if len(kw_s) <= len(mw_s) else (mw_s, kw_s)
    if len(shorter) >= 4 and is_subsequence(shorter, longer):
        missing = len(longer) - len(shorter)
        if missing <= max(2, len(longer) // 3):
            return True

    return False


# Mots de liaison qu'un utilisateur "lambda" peut très bien oublier
# ("evenements" au lieu de "mes événements") sans changer le sens.
STOPWORDS = {
    'mes', 'mon', 'ma', 'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du',
    'a', 'au', 'aux', 'et', 'ou', 'pour', 'avec', 'dans', 'sur', 'en',
    'ce', 'cette', 'ces', 'que', 'qui', 'est', 'suis', 'es',
}


def contains_fuzzy(message_norm, keyword):
    """Le mot-clé (ou groupe de mots) est-il évoqué dans le message,
    même incomplet, mal orthographié ou sans accents ?"""
    keyword_norm = normalize_text(keyword)
    if not keyword_norm:
        return False

    # 1) correspondance directe (rapide, gère déjà accents/majuscules)
    if keyword_norm in message_norm:
        return True

    # 2) chaque mot-clé "important" (on ignore les mots de liaison comme
    #    "mes", "des"...) doit se retrouver quelque part dans le message
    #    (pas forcément à la suite, ni dans le même ordre) — ça permet
    #    par ex. d'écrire "evenements" au lieu de "mes événements"
    keyword_words_all = keyword_norm.split()
    keyword_words = [w for w in keyword_words_all if w not in STOPWORDS] or keyword_words_all
    message_words = message_norm.split()

    for kw in keyword_words:
        if not any(word_matches(kw, mw) for mw in message_words):
            return False
    return True


def any_keyword_match(message_content, keywords):
    """Remplace any_keyword_match(message_content, keywords) par une
    version tolérante aux accents, au pluriel et aux fautes de frappe."""
    message_norm = normalize_text(message_content)
    return any(contains_fuzzy(message_norm, kw) for kw in keywords)


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
    base_prompt = """Tu es WAGAN AI, un assistant de support client pour Easy Events,
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
- Présente-toi toujours comme "WAGAN AI" dans tes messages
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
    message_norm = normalize_text(message_content)
    message_words = message_norm.split()
    greetings = ['bonjour', 'salut', 'hello', 'coucou', 'hey', 'bjr', 'bnjr', 'slt', 'cc', 'yo', 'hi', 'salutations', 'bonsoir', 'bon matin', 'bon aprem', 'bon aprèm']
    # Un "bonjour" reste un simple message d'accueil même mal orthographié
    # ("bonjr", "salu"...), mais seulement si le message est court : on ne
    # veut pas déclencher l'accueil si "bonjour" apparaît dans une vraie question.
    is_greeting = len(message_words) <= 3 and any(
        any(word_matches(normalize_text(g), w) for w in message_words) for g in greetings
    )
    if is_greeting:
        if prenom and is_organizer:
            return f"""Bonjour {prenom} ! 👋

Je suis WAGAN AI, votre assistant pour les organisateurs.

Je peux vous aider avec :
- Voir la liste de vos événements
- Voir les détails d'un événement et ses participants
- Voir vos statistiques
- Scanner des QR codes
- Créer ou modifier un événement

Tout est disponible dans l'application mobile.

Posez-moi une question sur la gestion de vos événements ! """, True

        elif prenom and not is_organizer:
            return f"""Bonjour {prenom} ! 👋

Je suis WAGAN AI, votre assistant pour les participants.

Je peux vous aider avec :
- Inscription aux événements
- QR codes et billets
- Sondages et avis
- Votre profil

Tout est disponible sur le site web.

Posez-moi une question, je vous répondrai avec plaisir ! """, True

        else:
            return f"""Bonjour ! 👋

Je suis WAGAN AI, l'assistant Easy Events.

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

Posez-moi une question ! """, True

    # ============================================================
    # 1. BLOCAGE : QUESTIONS PERSONNELLES SANS CONNEXION
    # ============================================================
    questions_perso = ['mes événements', 'mes evenements', 'mon qr', 'mes sondages',
                       'mon compte', 'mon profil', 'mes inscriptions', 'mon billet',
                       'mes participants', 'scan qr', 'scanner', 'kpi', 'statistiques']
    if any_keyword_match(message_content, questions_perso) and not user_data:
        print("Blocage : question personnelle sans connexion")
        return "Pour accéder à vos informations personnelles, veuillez vous connecter. Une fois connecté(e), je pourrai vous répondre de façon personnalisée ! 😊", True

    # ============================================================
    # QUESTIONS SPÉCIFIQUES AUX ORGANISATEURS
    # ============================================================

    # ============================================================
    # 3. DÉTAILS D'UN ÉVÉNEMENT (Organisateur / Participant)
    # ============================================================
    if any_keyword_match(message_content, ['détails événement', 'details evenement', 'infos événement', 'information événement', 'détail événement', 'détails event', 'infos event', 'information event', 'infos', 'information', 'détails', 'detail', 'informations', 'détails de mon événement', 'infos organisateur événement']):
        if not user_data:
            return "Pour voir les détails d'un événement, connectez-vous : en tant qu'organisateur pour gérer vos événements, ou en tant que participant pour consulter un événement sur le site web.", True

        if is_organizer:
            return f"""Bonjour {prenom} !

Pour voir les détails d'un de vos événements :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Cliquez sur l'événement qui vous intéresse

Vous verrez alors :
- Le nom, la description, la date et le lieu
- Le nombre total de participants
- La liste complète des participants

Ces informations sont disponibles en temps réel dans l'application.""", True

        return f"""Bonjour {prenom} !

Pour voir les détails d'un événement :

1. Rendez-vous sur le site web Easy Events
2. Cliquez sur l'événement qui vous intéresse

Vous verrez alors :
- La description, la date, l'heure et le lieu
- Le nombre de places restantes
- Le bouton pour vous inscrire

Ces informations sont disponibles en temps réel sur le site web.""", True

    # ============================================================
    # 4. STATISTIQUES / KPIS (Organisateur) — TABLEAU DE BORD (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['kpi', 'statistiques', 'statistiques organisateur', 'dashboard organisateur', 'tableau de bord organisateur', 'mon tableau de bord', 'tableau de bord participant', 'mes stats']):
        if not user_data:
            return "Pour voir vos statistiques (organisateur) ou votre tableau de bord (participant), connectez-vous à votre compte.", True

        if is_organizer:
            if organizer_kpis:
                return f"""Bonjour {prenom} !

Vos statistiques d'organisateur :

{organizer_kpis}

Pour plus de détails, consultez votre tableau de bord dans l'application mobile.""", True

            return f"""Bonjour {prenom} !

Pour voir vos statistiques d'organisateur :

1. Ouvrez l'application mobile
2. Connectez-vous avec votre compte organisateur
3. Accédez à votre tableau de bord

Vous y verrez :
- Le nombre total d'événements
- Le nombre de participants
- Le taux de participation
- Et plus encore !""", True

        if participant_data:
            stats = participant_data.get('statistics', {})
            return f"""Bonjour {prenom} !

Votre tableau de bord participant :

- Total événements inscrits : {stats.get('total_events', 0)}
- Événements à venir : {stats.get('upcoming_events', 0)}
- Sondages en attente : {stats.get('pending_surveys', 0)}
- Événements passés : {stats.get('past_events', 0)}

Consultez tout ceci sur le site web, dans votre tableau de bord.""", True

        return f"""Bonjour {prenom} !

Pour voir votre tableau de bord participant :

1. Connectez-vous sur le site web
2. Allez dans votre tableau de bord

Vous y verrez vos inscriptions, vos événements à venir et vos sondages en attente.""", True

    # ============================================================
    # 5. LISTE DES PARTICIPANTS (Organisateur) / MON INSCRIPTION (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['liste participants', 'participants', 'qui est inscrit', 'nombre participants', 'liste des participants', 'participants événement', 'suis-je inscrit', 'mon inscription confirmée']):
        if not user_data:
            return "Pour voir la liste des participants (organisateur) ou vérifier votre inscription (participant), connectez-vous à votre compte.", True

        if is_organizer:
            if organizer_data:
                events = organizer_data
                if isinstance(organizer_data, dict) and 'events' in organizer_data:
                    events = organizer_data['events']

                if not events:
                    return f"Bonjour {prenom} ! \n\nVous n'avez pas encore créé d'événement. Créez-en un pour voir les participants s'inscrire !", True

                total_participants = 0
                for e in events:
                    if isinstance(e, dict):
                        total_participants += e.get('participants_count', 0)

                return f"""Bonjour {prenom} !

Vue d'ensemble :
- Total participants : {total_participants} personnes
- Nombre d'événements : {len(events)}

Pour voir la liste détaillée des participants :
1. Ouvrez l'application mobile
2. Cliquez sur un événement
3. La liste s'affiche avec les noms et emails

Une liste à jour en temps réel est disponible dans l'application.""", True

            return f"""Bonjour {prenom} !

Pour voir la liste des participants à vos événements :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Sélectionnez l'événement
4. La liste des participants s'affiche

Vous verrez aussi le nombre total en temps réel.""", True

        return f"""Bonjour {prenom} !

Cette fonctionnalité (voir la liste des participants) est réservée aux organisateurs.

En tant que participant, vous pouvez vérifier votre propre inscription :
1. Connectez-vous sur le site web
2. Allez dans votre tableau de bord
3. Section 'Mes événements'

Vous y verrez la confirmation de vos inscriptions.""", True

    # ============================================================
    # 6. SCANNER UN QR CODE (Organisateur) / MON QR CODE (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['scanner qr', 'scan qr', 'qr code scan', 'valider présence', 'enregistrer présence', 'scan code', 'scanner', 'scan qr code']):
        if not user_data:
            return "Pour scanner des QR codes (organisateur) ou récupérer votre QR code (participant), connectez-vous à votre compte.", True

        if is_organizer:
            return f"""Bonjour {prenom} !

Pour scanner un QR code :

1. Ouvrez l'application mobile Easy Events
2. Connectez-vous avec votre compte organisateur
3. Allez dans les détails de votre événement
4. Utilisez la fonction de scan

Scan réussi → présence enregistrée automatiquement
QR invalide → message d'erreur affiché

Le participant doit avoir son QR code prêt avant le scan.""", True

        return f"""Bonjour {prenom} !

En tant que participant, vous n'avez pas besoin de scanner : c'est l'organisateur qui scanne votre QR code à l'entrée.

Vous devez simplement présenter votre QR code :
1. Connectez-vous sur le site web
2. Allez dans votre tableau de bord
3. Ouvrez votre billet ou l'email de confirmation

Gardez-le prêt (capture d'écran ou imprimé) le jour de l'événement.""", True

    # ============================================================
    # 7. CRÉER UN ÉVÉNEMENT (Organisateur) / S'INSCRIRE À UN ÉVÉNEMENT (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['créer événement', 'créer un événement', 'nouvel événement', 'ajouter événement', 'créer event', 'nouvel event', 'organiser un événement', 'publier un événement']):
        if not user_data:
            return "Pour créer un événement, connectez-vous à votre compte organisateur. Pour vous inscrire à un événement, connectez-vous à votre compte participant.", True

        if is_organizer:
            return f"""Bonjour {prenom} !

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

        return f"""Bonjour {prenom} !

En tant que participant, vous ne créez pas d'événement : vous pouvez vous y inscrire !

1. Rendez-vous sur le site web
2. Choisissez l'événement qui vous intéresse
3. Cliquez sur 'S'inscrire maintenant'

Vous recevrez ensuite votre QR code par email.

Si vous souhaitez organiser vos propres événements, un compte organisateur est nécessaire.""", True

    # ============================================================
    # 8. MODIFIER UN ÉVÉNEMENT (Organisateur) / MODIFIER MON INSCRIPTION (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['modifier événement', 'modifier un événement', 'mettre à jour', 'éditer événement', 'update event', 'changer mon inscription', 'modifier mon inscription']):
        if not user_data:
            return "Pour modifier un événement (organisateur) ou votre inscription (participant), connectez-vous à votre compte.", True

        if is_organizer:
            return f"""Bonjour {prenom} !

Pour modifier un événement :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Cliquez sur l'événement à modifier
4. Utilisez le bouton 'Modifier'
5. Mettez à jour les informations
6. Validez les modifications

Les participants seront notifiés des changements importants.""", True

        return f"""Bonjour {prenom} !

Cette fonctionnalité (modifier un événement) est réservée aux organisateurs.

En tant que participant, vous pouvez :
1. Vous connecter sur le site web
2. Aller dans votre tableau de bord
3. Consulter ou annuler votre inscription depuis 'Mes événements'

Pour toute question sur un événement, contactez son organisateur.""", True

    # ============================================================
    # 9. SUPPRIMER UN ÉVÉNEMENT (Organisateur) / ANNULER MON INSCRIPTION (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['supprimer événement', 'supprimer un événement', 'annuler événement', 'delete event', 'annuler mon inscription', 'me désinscrire']):
        if not user_data:
            return "Pour supprimer un événement (organisateur) ou annuler votre inscription (participant), connectez-vous à votre compte.", True

        if is_organizer:
            return f"""Bonjour {prenom} !

Attention - Suppression d'événement :

1. Ouvrez l'application mobile
2. Allez dans 'Mes événements'
3. Cliquez sur l'événement à supprimer
4. Utilisez le bouton 'Supprimer'
5. Confirmez la suppression

Une notification sera envoyée automatiquement à tous les participants inscrits.

Cette action est irréversible !""", True

        return f"""Bonjour {prenom} !

Cette fonctionnalité (supprimer un événement) est réservée aux organisateurs.

En tant que participant, vous pouvez annuler votre propre inscription :
1. Connectez-vous sur le site web
2. Allez dans votre tableau de bord, section 'Mes événements'
3. Sélectionnez l'événement et annulez votre inscription

Votre place sera alors libérée pour d'autres participants.""", True

    # ============================================================
    # 2bis. MES ÉVÉNEMENTS (Organisateur = créés / Participant = inscriptions)
    # Placée APRÈS les sections 3 à 9 exprès : un message comme
    # "supprimer un evenemnt" doit d'abord matcher la section 9
    # (suppression), pas ce catch-all générique sur le mot "événement".
    # "Mes événements" veut dire quelque chose de différent selon le rôle :
    # les événements CRÉÉS pour un organisateur, les événements où l'on
    # s'est INSCRIT pour un participant. On ne renvoie jamais l'un vers
    # l'autre : chacun reçoit directement SES événements à lui.
    # ============================================================
    if any_keyword_match(message_content, ['mes événements', 'mes evenements', 'liste événements', 'événements créés', 'mes events', 'mes événements organisateur']):
        if not user_data:
            return "Pour voir vos événements, connectez-vous : vos événements créés si vous êtes organisateur, ou vos inscriptions si vous êtes participant.", True

        if is_organizer:
            if organizer_data:
                events = organizer_data
                if isinstance(organizer_data, dict) and 'events' in organizer_data:
                    events = organizer_data['events']

                if not events:
                    return f"Bonjour {prenom} ! \n\nVous n'avez pas encore créé d'événement.\n\n Pour créer votre premier événement, ouvrez l'application mobile et cliquez sur le bouton 'Nouvel événement' ou '+'.", True

                event_list = "\n".join([f"• {e.get('nom', 'Sans nom')}" for e in events[:5]])
                total = len(events)

                kpi_text = ""
                if organizer_kpis:
                    kpi_text = f"\n\n Vos statistiques : {organizer_kpis}"

                return f"Bonjour {prenom} ! \n\nVous avez {total} événement(s) créé(s) :\n\n{event_list}\n\n Consultez tous vos événements dans l'application mobile, onglet 'Mes événements'.{kpi_text}", True

            return f"Bonjour {prenom} ! \n\nConsultez vos événements dans l'application mobile, onglet 'Mes événements'.", True

        # --- Participant : ses propres inscriptions, pas celles d'un organisateur ---
        if participant_data:
            stats = participant_data.get('statistics', {})
            upcoming = participant_data.get('upcoming_events', [])
            total = stats.get('total_events', 0)

            if total == 0:
                return f"Bonjour {prenom} ! \n\nVous n'êtes inscrit(e) à aucun événement pour le moment.\n\n Rendez-vous sur le site web pour découvrir les événements disponibles et vous inscrire.", True

            upcoming_list = "\n".join([f"• {e.get('nom', 'Sans nom')}" for e in upcoming[:5]])
            upcoming_text = f"\n\nÉvénements à venir :\n{upcoming_list}" if upcoming_list else ""

            return f"Bonjour {prenom} ! \n\nVous êtes inscrit(e) à {total} événement(s) au total ({stats.get('upcoming_events', 0)} à venir, {stats.get('past_events', 0)} passé(s)).{upcoming_text}\n\n Consultez le détail complet sur le site web, dans votre tableau de bord.", True

        return f"Bonjour {prenom} ! \n\nConsultez vos inscriptions sur le site web, dans votre tableau de bord, rubrique 'Mes événements'.", True

    # ============================================================
    # 10. AUTHENTIFICATION ORGANISATEUR
    # ============================================================
    if any_keyword_match(message_content, ['se connecter organisateur', 'compte organisateur', 'login organisateur', 'connexion organisateur', 'organisateur login']):
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

Mot de passe oublié ? Utilisez la fonction 'Mot de passe oublié'.""", True

    # ============================================================
    # 11. INSCRIPTION ORGANISATEUR
    # ============================================================
    if any_keyword_match(message_content, ['créer compte organisateur', 's\'inscrire organisateur', 'register organisateur']):
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
    if any_keyword_match(message_content, ['comment s\'inscrire à un événement', 'participer à un événement', 'rejoindre un événement', "s'inscrire événement", 'comment participer', 'inscription événement']):
        if is_organizer:
            return f"Bonjour {prenom} ! \n\nEn tant qu'organisateur, vous ne vous inscrivez pas aux événements, vous les créez ! Ouvrez l'application mobile et cliquez sur 'Nouvel événement'.", True

        return """ Pour vous inscrire à un événement :

1. Rendez-vous sur la page des événements du site web
2. Choisissez l'événement qui vous intéresse
3. Cliquez sur "S'inscrire maintenant"
4. Confirmez votre inscription

Vous recevrez un QR code par email qui vous servira de billet d'entrée !

Consultez vos inscriptions dans votre tableau de bord.""", True

    # ============================================================
    # 13. MON QR CODE (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['mon qr', 'mon qr code', 'mon billet', 'mon ticket', 'qr code participant']):
        if is_organizer:
            return f"Bonjour {prenom} ! \n\nEn tant qu'organisateur, vous scannez les QR codes des participants, vous n'en recevez pas. Utilisez l'application mobile pour scanner.", True

        return f"""Bonjour {prenom} !

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
    if any_keyword_match(message_content, ['mes sondages', 'sondage', 'sondages en attente', 'avis', 'sondages participant']):
        if is_organizer:
            return f"Bonjour {prenom} ! \n\nLes sondages sont destinés aux participants après les événements. En tant qu'organisateur, vous pouvez créer des sondages depuis votre tableau de bord.", True

        if participant_data:
            stats = participant_data.get('statistics', {})
            pending = participant_data.get('pending_surveys', [])
            nb = stats.get('pending_surveys', 0)

            if nb == 0:
                return f"Bonjour {prenom} ! \n\nVous n'avez aucun sondage en attente. 🎉\n\nLes sondages apparaissent après votre participation à un événement.", True

            noms = ", ".join([s.get('evenement', {}).get('nom', '') for s in pending[:3]])
            return f"Bonjour {prenom} ! \n\n Vous avez {nb} sondage(s) en attente pour : {noms}\n\n Accédez-y dans votre tableau de bord.", True

        return """ Pour voir vos sondages :

1. Connectez-vous sur le site web
2. Allez dans votre tableau de bord
3. Section 'Sondages en attente'

Les sondages apparaissent après votre participation à un événement.""", True

    # ============================================================
    # 15. MON PROFIL (Participant)
    # ============================================================
    if any_keyword_match(message_content, ['mon profil', 'mon compte', 'mes informations', 'profil participant']):
        if is_organizer:
            return f"Bonjour {prenom} ! \n\nVotre profil organisateur est accessible dans l'application mobile, rubrique 'Mon compte'.", True

        return f"""Bonjour {prenom} !

Pour gérer votre profil :

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
    if any_keyword_match(message_content, ['liste événements', 'événements disponibles', 'tous les événements', 'events disponibles', 'voir événements']):
        if is_organizer:
            return f"Bonjour {prenom} ! \n\nEn tant qu'organisateur, vos événements sont dans l'application mobile. Pour voir tous les événements publics, rendez-vous sur le site web.", True

        return """ Pour voir tous les événements disponibles :

1. Rendez-vous sur le site web
2. Vous pouvez filtrer par catégorie
3. Cliquez sur un événement pour voir ses détails

Pour vous inscrire : cliquez sur "S'inscrire" sur la page de l'événement.""", True

    # ============================================================
    # 17. PRÉSENTATION DE LA PLATEFORME
    # ============================================================
    if any_keyword_match(message_content, ['c\'est quoi easy events', 'qu\'est-ce que easy events', 'présentez-vous', 'plateforme', 'easy events c\'est quoi', 'easy events']):
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

Pour commencer : créez votre compte !""", True

    # ============================================================
    # 18. COMMENT CRÉER UN COMPTE
    # ============================================================
    if any_keyword_match(message_content, ['comment s\'inscrire', 'créer un compte', 'inscription', 'comment créer un compte', 'nouveau compte', 'create account']):
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
    if any_keyword_match(message_content, ['mot de passe oublié', 'réinitialiser mot de passe', 'password oublié', 'oublié mot de passe', 'change password']):
        return """ Mot de passe oublié ?

1. Utilisez l'option "Mot de passe oublié" sur la page de connexion
2. Entrez votre email
3. Vous recevrez un code de réinitialisation
4. Utilisez ce code pour créer un nouveau mot de passe

Vérifiez vos spams si vous ne trouvez pas l'email.""", True

    # ============================================================
    # 20. CONTACTER LE SUPPORT
    # ============================================================
    if any_keyword_match(message_content, ['contacter support', 'aide', 'assistance', 'problème', 'bug', 'support', 'help', 'help me']):
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

Découvrez tout sur la plateforme !"""
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

Consultez les événements sur le site web !"""
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
        if any_keyword_match(message_content, item['keywords']):
            print(f" FAQ publique : correspondance trouvée")
            return item['reponse'], True

    # ============================================================
    # 22. RECHERCHE DANS LA BASE DE CONNAISSANCE ADMIN
    # ============================================================
    if hasattr(tenant, 'knowledge_items'):
        for item in tenant.knowledge_items.all():
            if item.question:
                question_norm = normalize_text(item.question)
                if (
                    question_norm in message_norm
                    or message_norm in question_norm
                    or contains_fuzzy(message_norm, item.question)
                ):
                    print(f" Base de connaissance admin : correspondance ({item.question})")
                    return item.answer, True

    # ============================================================
    # 23. RECHERCHE DANS LES DOCUMENTS UPLOADÉS
    # ============================================================
    if hasattr(tenant, 'documents'):
        for doc in tenant.documents.all():
            if doc.content and len(message_norm) > 5:
                doc_content_norm = normalize_text(doc.content)
                if doc_content_norm.find(message_norm[:20]) != -1:
                    print(f" Document : correspondance ({doc.title})")
                    return f"📄 D'après '{doc.title}' :\n\n{doc.content[:500]}...", True

    # ============================================================
    # 24. DERNIER RECOURS - ESCALADE
    # ============================================================
    print("❌ Aucune réponse → escalade")
    return None, False