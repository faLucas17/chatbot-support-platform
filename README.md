\# 🤖 Chatbot Support Platform



Plateforme de customer support IA multi-applications avec escalade humaine automatique.



\##  Fonctionnalités



\- \*\*Widget JavaScript\*\* intégrable dans n'importe quelle application

\- \*\*Chatbot IA\*\* (Claude API) qui répond automatiquement via une base de connaissance

\- \*\*Escalade Discord\*\* quand le bot ne peut pas répondre (à faire)

\- \*\*Interface admin\*\* pour que les agents répondent(à faire)

\- \*\*Base de connaissance\*\* modifiable (FAQ, documents)(à faire)



\##  Architecture





\## Technologies



\- \*\*Backend\*\* : Django + Django REST Framework

\- \*\*Base de données\*\* : PostgreSQL

\- \*\*IA\*\* : Claude API (mock pour développement)

\- \*\*Notifications\*\* : Discord Webhook

\- \*\*Frontend\*\* : React (widget + admin)



\##  Installation



\### Prérequis



\- Python 3.10+

\- PostgreSQL

\- Git



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



support\_platform/

├── manage.py

├── requirements.txt

├── .env

├── .gitignore

├── README.md

├── support\_platform/

│   ├── settings.py

│   └── urls.py

└── chatbot/

&#x20;   ├── models.py

&#x20;   ├── views.py

&#x20;   ├── serializers.py

&#x20;   ├── ai\_engine.py

&#x20;   ├── admin.py

&#x20;   └── urls.py

\## Planning de la semaine



✅ Jour 1

\- Setup Django + PostgreSQL

\- Modèles Conversation, Message, KnowledgeItem

\- Endpoint POST /api/message/ avec mock IA

\- Base de connaissance FAQ peuplée

\- Tests Postman validés



Jour 2 

\- Brancher la vraie API Claude (remplacer le mock)

\- Détecter quand le bot ne sait pas répondre

\- Créer le webhook Discord pour notifier l'équipe

\- Créer l'endpoint POST /api/agent/reply/

\- Tester : question inconnue → Discord notifié → agent répond



Jour 3 

\- Créer l'interface admin React

&#x20; - Liste des conversations escaladées

&#x20; - Vue détail avec historique

&#x20; - Formulaire pour répondre

\- Tester que la réponse agent arrive bien



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

