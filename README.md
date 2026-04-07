\# 🤖 Chatbot Support Platform



Plateforme de customer support IA multi-applications avec escalade humaine automatique.



\##  Fonctionnalités



- **Widget JavaScript** intégrable dans n'importe quelle application *(à venir - Jour 4)*
- **Chatbot IA** (Claude API / mock) qui répond automatiquement via une base de connaissance ✅
- **Escalade Discord** quand le bot ne peut pas répondre ✅
- **Interface admin React** pour que les agents répondent ✅
- **Base de connaissance** modifiable (FAQ) ✅
- **Upload de documents** (PDF/TXT) *(à venir - Jour 5)*
- **Mode clair/sombre** avec icône lune/soleil ✅
- **Design responsive** adapté mobile ✅



\##  Architecture





\## Technologies



 **Backend** : Django + Django REST Framework
- **Base de données** : PostgreSQL
- **IA** : Claude API (mock pour développement)
- **Notifications** : Discord Webhook
- **Frontend Admin** : React + Vite + Axios
- **Styles** : CSS personnalisé avec mode clair/sombre
- **Police** : Playfair Display (serif) + Poppins (sans-serif)


\##  Installation



\### Prérequis



\- Python 3.10+

\- PostgreSQL

\- Git
\- Node.js (pour React)


\### 1. Cloner le projet



git clone https://github.com/faLucas17/chatbot-support-platform.git

cd support\_platform



2\. Créer l'environnement virtuel

python -m venv venv

source venv/bin/activate  # Sur Windows : venv\\Scripts\\activate



3\. Installer les dépendances



pip install -r requirements.txt

4\. Configurer la base de données



\# Créer la base de données PostgreSQL

psql -U postgres

CREATE DATABASE support\_platform;

\\q



\# Migrer

python manage.py migrate

5\. Configurer les variables d'environnement

Crée un fichier .env :



bash

cp .env.example .env

Ajoute :



ANTHROPIC\_API\_KEY=ta\_clé\_api\_anthropic\_ici

DISCORD\_WEBHOOK\_URL=https://discord.com/api/webhooks/...

6\. Créer un superuser



python manage.py createsuperuser

7\. Peupler la base de connaissance



python manage.py shell < create\_data.py

Ou via l'admin Django.



8\. Lancer le serveur



python manage.py runserver



API Endpoints

Méthode	Endpoint	Description

POST	/api/message/	Envoyer un message, recevoir réponse bot

GET	/api/conversation/<id>/	Récupérer historique

POST	/api/agent/reply/	Répondre en tant qu'agent



\## Test avec Postman

Envoyer un message



POST http://localhost:8000/api/message/

{

&#x20;   "api\_key": "31d4efff-2b32-481f-a17f-d2017982f7ed",

&#x20;   "conversation\_id": null,

&#x20;   "content": "Qu'est-ce que le marketing digital ?"

}

Agent répond



{

&#x20;   "conversation\_id": 1,

&#x20;   "user\_message": {

&#x20;       "id": 1,

&#x20;       "role": "user",

&#x20;       "content": "Qu'est-ce que le marketing digital ?",

&#x20;       "created\_at": "2026-04-01T00:03:09.687708+02:00"

&#x20;   },

&#x20;   "bot\_message": {

&#x20;       "id": 2,

&#x20;       "role": "bot",

&#x20;       "content": "Le marketing digital regroupe toutes les actions marketing réalisées sur les canaux numériques : réseaux sociaux, SEO, email marketing, publicité en ligne, etc.",

&#x20;       "created\_at": "2026-04-01T00:03:09.694259+02:00"

&#x20;   }

}



\## Structure du projet



support_platform/
├── manage.py
├── requirements.txt
├── .env
├── .gitignore
├── README.md
├── support_platform/
│   ├── settings.py
│   └── urls.py
├── chatbot/
│   ├── models.py
│   ├── views.py
│   ├── serializers.py
│   ├── ai_engine.py
│   ├── admin.py
│   └── urls.py
└── admin/                     # Interface admin React
    ├── src/
    │   ├── App.jsx
    │   ├── App.css
    │   ├── api.js
    │   └── components/
    │       ├── ConversationList.jsx
    │       └── ConversationDetail.jsx
    ├── package.json
    └── vite.config.js
\## Planning de la semaine



✅ Jour 1

\- Setup Django + PostgreSQL

\- Modèles Conversation, Message, KnowledgeItem

\- Endpoint POST /api/message/ avec mock IA

\- Base de connaissance FAQ peuplée

\- Tests Postman validés



✅ Jour 2 – Mercredi (Terminé)

\- Bot détecte les questions hors FAQ
\- Webhook Discord fonctionnel
\- Endpoint agent POST /api/agent/reply/
\- Client ne voit jamais de fallback
\- Flux complet : client → Discord → agent → réponse

\- Tests OK :
\- Question FAQ ==> bot répond
\- Question hors FAQ ==> Discord notifié → agent répond

 \- Visible aussi dans l'admin Django



✅ Jour 3 – Jeudi (Terminé)

\- Interface admin React avec Vite
\- Liste des conversations escaladées
\- Vue détail avec historique des messages
\- Formulaire pour répondre depuis l'interface
\- Auto-refresh toutes les 5 secondes
\- Design responsive (web + mobile)
\- Mode clair/sombre avec icône lune/soleil
\- Menu burger pour mobile
\- Test validé : réponse agent bien reçue et affichée



&#x20;Jour 4 

\- Créer le widget React côté client

&#x20; - Bouton flottant + fenêtre de chat

&#x20; - Envoi de messages

&#x20; - Polling toutes les 4 secondes

\- Tester que client ne voit pas de différence bot/agent

\- Écrire la documentation d'intégration



&#x20;Jour 5 –  (livraison)

\- Upload de document (PDF/TXT) dans la base de connaissance

\- Extraction du texte comme contexte Claude

\- Tests finaux du flux complet

\- Préparation de la démo (scénarios de test)

\- Livraison du MVP + documentation



Critères de validation

✅ Widget fonctionne sur app externe

✅ Bot répond aux FAQ

✅ Escalade déclenche email + Discord

✅ Agent répond depuis l'admin

✅ Client reçoit la réponse


## Interface Admin
🎨 Design et Palette de couleurs
\- Vert profond (#0F3B2C) : utilisé pour les fonds principaux et les gradients
\- Vert menthe (#2D5A4A) : utilisé pour les accents, les boutons et les titres
\- Or doux (#C9A87C) : utilisé pour les bordures actives et les éléments interactifs
\- Beige clair (#F5F0E8) : utilisé pour le fond des messages et les arrière-plans
\- Blanc cassé (#E8E0D5) : utilisé pour les cartes et les conteneurs
\- Rouge corail (#E07A5F) : utilisé pour le badge "Escaladée" et les messages d'erreur

# Typographie
\- Playfair Display (police serif) : utilisée pour les titres et les noms de sections
\- Poppins (police sans-serif) : utilisée pour le corps de texte, les messages et les boutons

# Mode clair / sombre
\- Icône de toggle : 🌙 pour passer en mode clair, ☀️ pour passer en mode sombre
\- Mode clair : fond beige chaud, messages blancs, accents verts
\- Mode sombre : fond vert foncé, messages gris foncé, accents or
\- Transition fluide entre les deux modes
\-Sauvegarde du choix utilisateur dans le localStorage

# Responsive Design
\- Desktop : sidebar fixe à gauche, zone principale à droite
\- Tablette : sidebar réductible avec menu burger
\- Mobile : sidebar masquée par défaut, menu burger pour la navigation, titres adaptés à la taille d'écran

# Fonctionnalités UI
\- Auto-refresh des conversations toutes les 5 secondes
\- Badge "Escaladée" de couleur rouge corail pour les conversations en attente de réponse
\- Affichage d'un avatar 👤 pour les messages clients et 🤖 pour les messages bot
\- Animation fadeIn pour l'apparition des nouveaux messages
\- Effet hover sur les conversations et les boutons
\- Conversation active surlignée avec une bordure dorée
\- Formulaire de réponse avec champ texte et bouton d'envoi
\- Indicateur de chargement pendant l'envoi d'une réponse

"✅ Jour 4 - Widget client React (inspiré Claude)

✨ NOUVELLES FONCTIONNALITÉS :

1. Widget client React
   - Bouton flottant 💬 pour ouvrir le chat
   - Fenêtre de chat latérale coulissante
   - Envoi de messages avec indicateur 'bot écrit...'
   - Polling automatique toutes les 4 secondes
   - Design inspiré de Claude (moderne et élégant)

2. Menu latéral (sidebar)
   - Historique complet des conversations
   - Barre de recherche 🔍 pour filtrer les discussions
   - Bouton '+ Nouvelle discussion'
   - Affichage de l'aperçu des messages

3. Mode clair/sombre
   - Bascule avec un seul bouton 🌙/☀️
   - Sauvegarde du choix utilisateur
   - Palette de couleurs adaptée

4. Responsive design
   - Mobile first
   - Desktop adapté
   - Menu burger pour mobile

🎨 PALETTE DE COULEURS (Widget) :

Mode Clair :
- Fond : #F7F7F8
- Cartes : #FFFFFF
- Messages user : Dégradé #C9A87C → #B8965A (Or doux)
- Messages bot : #FFFFFF

Mode Sombre :
- Fond : #1E1E1E
- Cartes : #2A2A2A
- Messages user : Dégradé #C9A87C → #B8965A
- Messages bot : #2A2A2A

📁 FICHIERS AJOUTÉS :
- widget/ChatWidget.jsx (composant principal)
- widget/index.js (point d'entrée)
- widget/simple-widget.js (version finale fonctionnelle)
- widget/vite.config.js (configuration build)
- widget/package.json
- widget/test.html (page de test)
- widget/dist/widget.umd.cjs (fichier buildé)

🔧 MODIFICATIONS :
- support_platform/settings.py (ajout CORS pour localhost:8080)

 TESTS VALIDÉS :
- ✅ Bouton flottant fonctionnel
- ✅ Envoi et réception de messages
- ✅ Polling fonctionnel
- ✅ Mode clair/sombre
- ✅ Recherche de conversations
- ✅ Nouvelle discussion

INTÉGRATION (3 lignes de code) :
<script src='https://unpkg.com/react@18.2.0/umd/react.development.js'></script>
<script src='https://unpkg.com/react-dom@18.2.0/umd/react-dom.development.js'></script>
<script src='dist/widget.umd.cjs'></script>
<script>ChatWidget.init({ apiKey: '...', appName: '...', theme: 'light' });</script>


Jour 5 – Mardi (Livraison) - Ce que tu as réalisé
Objectifs du jour :
Upload de documents (PDF/TXT/Images) dans la base de connaissance
Extraction du texte comme contexte pour le bot
Tests finaux du flux complet
Préparation de la démo


Livraison du MVP

Réalisations du Jour 5 :
1. Upload de documents
Endpoint POST /api/documents/upload/
Support des formats : PDF, TXT, PNG, JPG, JPEG
Extraction complète du texte des PDF (PyPDF2)
OCR pour les images (Tesseract)
Stockage du contenu dans la base de données

2. Interface client améliorée
Menu contextuel avec deux options : 📄 Upload document / 📸 Prendre photo
Fichier attaché visible dans la zone de saisie
Upload manuel avant envoi du message
Auto-resize de la zone de saisie (textarea qui s'agrandit)

3. Icônes d'action sur les messages
📋 Copier le message (fonctionne pour tous)
✏️ Modifier le message (pour l'utilisateur)
🔄 Régénérer la réponse (pour le bot)
Icônes en gris (#888888)
Affichées au survol du message

4. Affichage des messages
Heure affichée EN DEHORS de la bulle
Messages COMPLETS (pas de troncature)
Pas de bouton "Afficher plus/moins"
Scroll automatique vers le dernier message

5. Intelligence du bot
Compréhension des questions sur les documents
Résumé automatique du document uploadé
Réponse à "Que parle ce document ?" avec titre, auteur, contexte
Base de connaissances marketing enrichie

6. Corrections finales
Admin voit TOUTES les conversations (pas seulement les escaladées)
Message de bienvenue "👋 Comment puis-je vous aider ?" au démarrage
Zone de saisie auto-resize
Bouton copier fonctionnel pour les messages bot



Structure finale du projet
text
support_platform/
├── chatbot/           # Backend Django
├── admin/             # Interface admin React
└── widget/            # Widget client React

Jour 6: documentation finale