# chatbot/ai_engine_easycoop.py
"""
Moteur IA dédié à EasyCoop.
Ne touche pas au moteur Easy Event (ai_engine.py).
"""
import os
import re
import unicodedata
import requests

# On réutilise les fonctions de matching du fichier principal
# SANS modifier ai_engine.py
from .ai_engine import (
    normalize_text, word_matches, contains_fuzzy, any_keyword_match,
    verify_sanctum_token, LARAVEL_URL,
)


# ============================================================
# MOCK EASYCOOP
# ============================================================
def mock_easycoop(message_content, tenant, user_data=None):
    message_norm = normalize_text(message_content)
    message_words = message_norm.split()
    user_info = user_data.get('user', {}) if user_data else {}
    prenom = user_info.get('name', '').split()[0] if user_info else None
    role = user_info.get('role', 'membre') if user_data else None

    # ---- SALUTATIONS ----
    greetings = ['bonjour', 'salut', 'hello', 'coucou', 'hey', 'bjr', 'bnjr', 'slt', 'cc', 'yo', 'hi', 'bonsoir']
    is_greeting = len(message_words) <= 3 and any(
        any(word_matches(normalize_text(g), w) for w in message_words) for g in greetings
    )
    if is_greeting:
        if prenom:
            return f"""Bonjour {prenom} ! 👋

Je suis WAGAN AI, votre assistant EasyCoop.

Je peux vous aider avec :
- Vos **cotisations** (consulter, payer)
- Vos **prêts** (demander, rembourser)
- Les **réunions** (voir, confirmer)
- Votre **profil** et carte de membre
- La **caisse** et trésorerie

Posez-moi votre question ! """, True
        return """Bonjour ! 👋

Je suis WAGAN AI, votre assistant EasyCoop.

Je peux vous aider avec :
- Cotisations et paiements (Wave, Orange Money, espèces)
- Prêts internes
- Réunions de la coopérative
- Gestion des membres
- Caisse et trésorerie
- Rapports et exports

Posez-moi votre question ! """, True

    # ---- COTISATIONS ----
    if any_keyword_match(message_content, [
        'payer cotisation', 'payer ma cotisation', 'comment payer',
        'regler cotisation', 'cotisation mensuelle', 'verser cotisation',
        'faire un paiement', 'cotiser'
    ]):
        return """Pour payer votre cotisation :

1. Allez dans **"Cotisations"**
2. Cliquez sur **"Payer"**
3. Choisissez votre mode de paiement :
   • Wave
   • Orange Money
   • Espèces
   • Virement
4. Validez

Un **reçu avec QR code** est généré automatiquement.""", True

    if any_keyword_match(message_content, [
        'voir cotisation', 'mes cotisations', 'historique cotisation',
        'consulter cotisation', 'combien jai paye', 'cotisation paye'
    ]):
        return """Pour voir vos cotisations :

1. Allez dans **"Mes cotisations"**
2. Vous verrez l'historique complet
3. Chaque paiement a un reçu téléchargeable

Les cotisations impayées sont signalées en rouge.""", True

    if any_keyword_match(message_content, ['recu', 'telecharger recu', 'mon recu', 'justificatif']):
        return """Pour télécharger votre reçu :

1. Allez dans **"Mes cotisations"**
2. Cliquez sur la cotisation concernée
3. Cliquez sur **"Reçu"**

Le reçu contient un **QR code de vérification**. Vous pouvez le partager par WhatsApp ou SMS.""", True

    if any_keyword_match(message_content, [
        'pas paye', 'impaye', 'retard cotisation', 'rappel cotisation', 'pas cotise'
    ]):
        return """Si vous n'avez pas payé votre cotisation :

- Vous recevrez un **rappel automatique** après 7 jours de retard
- Un second rappel après 30 jours
- Contactez votre trésorier si vous avez des difficultés

Rapprochez-vous de votre coopérative pour régulariser votre situation.""", True

    # ---- PRÊTS ----
    if any_keyword_match(message_content, [
        'demander pret', 'demande pret', 'faire un pret', 'obtenir pret',
        'emprunter', 'solliciter pret', 'pret interne'
    ]):
        return """Pour demander un prêt :

1. Allez dans **"Prêts"**
2. Cliquez sur **"Demander un prêt"**
3. Remplissez :
   • Montant souhaité
   • Durée (en mois)
   • Motif du prêt
4. Validez

Votre demande sera étudiée par le bureau de la coopérative (3 à 7 jours).""", True

    if any_keyword_match(message_content, [
        'rembourser pret', 'remboursement pret', 'payer pret', 'echeance pret'
    ]):
        return """Pour rembourser un prêt :

1. Allez dans **"Prêts"**
2. Sélectionnez votre prêt actif
3. Cliquez sur **"Rembourser"**
4. Choisissez le montant et le mode de paiement

Le montant restant est automatiquement mis à jour.""", True

    if any_keyword_match(message_content, [
        'mes prets', 'voir pret', 'pret actif', 'mon pret', 'combien je dois'
    ]):
        return """Pour voir vos prêts :

1. Allez dans **"Prêts"**
2. Vous verrez :
   • Montant emprunté
   • Reste à payer
   • Échéancier
   • Historique des remboursements""", True

    if any_keyword_match(message_content, ['taux interet', 'interet pret', 'combien dinteret']):
        return """Le **taux d'intérêt** est défini par votre coopérative (généralement **5% par mois**).

Pour connaître le taux exact appliqué, contactez votre trésorier ou consultez le règlement de votre coopérative.""", True

    # ---- RÉUNIONS ----
    if any_keyword_match(message_content, [
        'reunion', 'reunions', 'prochaine reunion', 'assemblee', 'convocation'
    ]):
        return """Pour voir les réunions :

1. Sur votre tableau de bord, section **"Réunions à venir"**
2. Vous pouvez :
   • Voir la date, l'heure et le lieu
   • **Confirmer votre présence**
   • Consulter les comptes-rendus passés

Vous recevrez une **notification** avant chaque réunion.""", True

    if any_keyword_match(message_content, ['compte rendu', 'compte-rendu', 'pv reunion', 'proces verbal']):
        return """Pour consulter les comptes-rendus :

1. Allez dans **"Réunions"**
2. Sélectionnez une réunion passée
3. Le **compte-rendu** s'affiche (texte ou audio)

Seuls les rôles de gestion (secrétaire, présidente, admin) peuvent les rédiger.""", True

    # ---- PROFIL ----
    if any_keyword_match(message_content, [
        'mon profil', 'modifier profil', 'changer telephone', 'carte membre',
        'mes informations', 'mon compte'
    ]):
        return """Pour gérer votre profil :

1. Allez dans **"Profil"**
2. Vous pouvez :
   • Modifier téléphone, village, activité
   • **Télécharger votre carte de membre** (avec QR code)
   • Changer votre photo

Votre carte de membre est imprimable.""", True

    # ---- CAISSE ----
    if any_keyword_match(message_content, ['caisse', 'solde', 'tresorerie', 'entrees sorties']):
        if role in ['tresorier', 'admin', 'presidente']:
            return """Pour gérer la caisse :

1. Allez dans **"Caisse"**
2. Vous pouvez :
   • Enregistrer une **entrée** (cotisation, don, subvention)
   • Enregistrer une **sortie** (achat, transport, restauration)
   • Voir le **solde en temps réel**
   • Consulter l'historique

**Solde = Entrées – Sorties**""", True
        return "Le solde de la caisse est visible sur le tableau de bord. Pour plus de détails, contactez votre trésorier.", True

    # ---- MEMBRES ----
    if any_keyword_match(message_content, ['ajouter membre', 'nouveau membre', 'creer membre', 'inscrire membre']):
        if role in ['presidente', 'admin']:
            return """Pour ajouter un membre :

1. Allez dans **"Membres"**
2. Cliquez sur **"Nouveau membre"**
3. Remplissez :
   • Photo
   • Prénom et nom
   • Téléphone
   • Sexe
   • Date d'adhésion
   • Activité
   • Village/quartier

Le membre pourra se connecter après validation.""", True
        return "Seuls la présidente et l'admin peuvent ajouter des membres.", True

    if any_keyword_match(message_content, ['liste membres', 'voir membres', 'tous les membres', 'rechercher membre']):
        if role in ['presidente', 'admin', 'tresorier', 'secretaire']:
            return """Pour voir la liste des membres :

1. Allez dans **"Membres"**
2. Utilisez la **barre de recherche** par nom ou téléphone
3. Cliquez sur un membre pour voir sa **fiche complète** :
   • Coordonnées
   • Cotisations
   • Prêts
   • Historique""", True
        return "La liste des membres est visible par les rôles de gestion.", True

    # ---- RAPPORTS ----
    if any_keyword_match(message_content, ['rapport', 'rapports', 'export', 'excel', 'pdf', 'statistiques']):
        if role in ['presidente', 'admin', 'tresorier']:
            return """Pour générer un rapport :

1. Allez dans **"Rapports"**
2. Choisissez le type :
   • **Cotisations**
   • **Financier**
   • **Membres**
3. Filtrez par période (semaine, mois, année)
4. **Exportez en PDF ou Excel**""", True
        return "Les rapports sont accessibles aux rôles de gestion.", True

    # ---- INSCRIPTION ----
    if any_keyword_match(message_content, ['devenir membre', 'inscription', 'sinscrire', 'rejoindre coop']):
        return """Pour devenir membre d'une coopérative :

1. Cliquez sur **"Devenir membre"** sur la page d'accueil
2. Remplissez le formulaire :
   • Nom, prénom
   • Téléphone
   • Coopérative
   • Village
   • Activité
3. Validez

Votre demande sera étudiée par la coopérative choisie.""", True

    # ---- SSO / CONNEXION ----
    if any_keyword_match(message_content, ['easy suite', 'sso', 'se connecter', 'connexion', 'mot de passe']):
        return """Pour vous connecter à EasyCoop :

1. **Via Easy Suite (SSO)** : cliquez sur "Se connecter avec Easy Suite"
2. **Via téléphone** : recevez un code OTP par SMS
3. **Via email + mot de passe**

Une fois connecté, vous accédez à votre espace selon votre rôle.""", True

    # ---- PRÉSENTATION ----
    if any_keyword_match(message_content, [
        'cest quoi easycoop', 'easycoop cest quoi', 'presentation',
        'qui es tu', 'tu fais quoi', 'a quoi ca sert', 'explique moi'
    ]):
        return """**EasyCoop** est une plateforme de gestion de coopératives au Sénégal.

Elle permet de gérer :
- Les **membres** et leurs profils
- Les **cotisations** (Wave, Orange Money, espèces)
- La **caisse** (entrées, sorties, solde)
- Les **prêts internes**
- Les **réunions** et comptes-rendus
- Les **rapports** et statistiques

Le tout depuis un simple **smartphone**, avec une expérience simple comme WhatsApp.""", True

    # ---- AIDE ----
    if any_keyword_match(message_content, ['aide', 'support', 'contact', 'probleme', 'bug']):
        return """Pour contacter le support EasyCoop :

1. Écrivez-nous à **support@easycoop.sn**
2. Ou contactez votre coopérative directement
3. Ou attendez qu'un **agent** prenne le relais dans ce chat

Précisez votre nom, votre coopérative et votre problème.""", True

    # ---- FALLBACK ----
    return None, False


# ============================================================
# FONCTION PRINCIPALE
# ============================================================
def get_bot_response_easycoop(message_content, tenant, sanctum_token=None):
    """
    Retourne (response, success) pour EasyCoop.
    Cherche dans les KnowledgeItem AVANT d'utiliser le mock.
    """
    from .models import KnowledgeItem, Document

    print(f"[EasyCoop] Message : {message_content}")
    print(f"[EasyCoop] Tenant : {tenant.name}")

    user_data = verify_sanctum_token(sanctum_token)
    message_norm = normalize_text(message_content)

    # 1. KnowledgeItem en priorité
    for item in KnowledgeItem.objects.filter(tenant=tenant):
        if item.question:
            question_norm = normalize_text(item.question)
            if (question_norm in message_norm
                or message_norm in question_norm
                or contains_fuzzy(message_norm, item.question)):
                print(f"[EasyCoop] KnowledgeItem trouvé : {item.question}")
                return item.answer, True

    # 2. Documents
    for doc in Document.objects.filter(tenant=tenant):
        if doc.content and len(message_norm) > 5:
            doc_content_norm = normalize_text(doc.content)
            if doc_content_norm.find(message_norm[:20]) != -1:
                return f"📄 D'après '{doc.title}' :\n\n{doc.content[:500]}...", True

    # 3. Mock EasyCoop
    return mock_easycoop(message_content, tenant, user_data)