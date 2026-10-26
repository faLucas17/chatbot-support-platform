import os, re
import threading
import requests
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Tenant, Conversation, Message, KnowledgeItem, Document
from .serializers import SendMessageSerializer, MessageSerializer, ConversationSerializer
from .ai_engine import get_bot_response
from .ai_engine_easycoop import get_bot_response_easycoop
from .emails import send_fancy_email
import PyPDF2
from PIL import Image
import pytesseract
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.models import User
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.urls import reverse_lazy
from django.contrib.auth.forms import PasswordResetForm
from django.core.mail import send_mail
from django.utils.html import format_html
from django.template.loader import render_to_string

# Configuration
LARAVEL_URL = os.getenv('LARAVEL_URL', 'https://api-easyevent.bakeli.tech')
EASYCOOP_API_URL = getattr(settings, 'EASYCOOP_API_URL', os.getenv('EASYCOOP_API_URL', 'https://easy-coop-api.onrender.com'))
SUPPORT_URL = os.getenv('SUPPORT_URL', 'https://support-platform-admin.onrender.com')
EASYCOOP_TENANT_KEY = os.getenv('EASYCOOP_TENANT_KEY', 'easycoop-2026')


# ============================================================
# OUTIL COMMUN : retrouver ou créer l'utilisateur Django
# ============================================================
def _get_or_create_django_user(email, name, identifiant_secours):
    user = None
    if email:
        user = User.objects.filter(email__iexact=email).first()
    if user is None and identifiant_secours:
        user = User.objects.filter(username=identifiant_secours).first()

    if user is None:
        base = (email.split('@')[0] if email else identifiant_secours) or 'utilisateur'
        username = base
        n = 1
        while User.objects.filter(username=username).exists():
            n += 1
            username = f"{base}{n}"
        user = User.objects.create(username=username, email=email or '', first_name=(name or '')[:150])
        print(f"Nouvel utilisateur Django créé : {username} ({name})")
    elif name and user.first_name != name[:150]:
        user.first_name = name[:150]
        user.save(update_fields=['first_name'])
    return user


def _extraire_user_data(raw):
    """Accepte {user: {...}}, {data: {...}} ou {...} à plat."""
    if isinstance(raw, dict):
        for cle in ('user', 'data'):
            if isinstance(raw.get(cle), dict):
                return raw[cle]
        return raw
    return {}


def _nom_complet(user_data):
    nom = user_data.get('name') or user_data.get('full_name')
    if not nom:
        prenom = user_data.get('first_name') or user_data.get('prenom') or ''
        nom_famille = user_data.get('last_name') or user_data.get('nom') or ''
        nom = f"{prenom} {nom_famille}".strip()
    return nom or ''

# ============================================================
# UTILISATEUR DJANGO DEPUIS TOKEN SANCTUM — EASY EVENT
# ============================================================
def get_django_user_from_token(sanctum_token):
    if not sanctum_token:
        return None
    try:
        response = requests.get(
            f"{LARAVEL_URL}/api/user",   # ← /api/user (au lieu de /api/user/chatbot-data)
            headers={
                "Authorization": f"Bearer {sanctum_token}",
                "Accept": "application/json",
            },
            timeout=5
        )
        if response.status_code == 200:
            user_data = _extraire_user_data(response.json())
            user_email = user_data.get('email')
            user_name = _nom_complet(user_data)
            uid = user_data.get('id')
            if user_email or uid:
                return _get_or_create_django_user(user_email, user_name, f"easyevent_{uid}" if uid else None)
            print(f"Ni e-mail ni id dans la réponse Laravel: {user_data}")
        else:
            print(f"/api/user a retourné {response.status_code}")
    except Exception as e:
        print(f"Erreur récupération utilisateur depuis token: {e}")
    return None


# ============================================================
# UTILISATEUR DJANGO DEPUIS TOKEN SANCTUM — EASYCOOP
# ============================================================
def get_easycoop_user_from_token(sanctum_token):
    if not sanctum_token:
        return None
    try:
        response = requests.get(
            f"{EASYCOOP_API_URL}/api/user",
            headers={
                "Authorization": f"Bearer {sanctum_token}",
                "Accept": "application/json",
            },
            timeout=5
        )
        if response.status_code == 200:
            user_data = _extraire_user_data(response.json())
            user_email = user_data.get('email')
            user_name = _nom_complet(user_data)
            uid = user_data.get('id') or user_data.get('telephone') or user_data.get('phone')
            # Un membre EasyCoop peut s'être inscrit par téléphone, sans e-mail :
            # on l'identifie alors par son id EasyCoop au lieu de le laisser "Anonyme".
            if user_email or uid:
                return _get_or_create_django_user(user_email, user_name, f"easycoop_{uid}" if uid else None)
            print(f"[EasyCoop] Ni e-mail ni id dans la réponse : {user_data}")
        else:
            print(f"[EasyCoop] /api/user a retourné {response.status_code}")
    except Exception as e:
        print(f"[EasyCoop] Erreur récupération utilisateur depuis token: {e}")
    return None


def csrf_exempt_view(cls):
    cls.dispatch = method_decorator(csrf_exempt)(cls.dispatch)
    return cls


try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

if os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


def generate_conversation_title(conversation):
    msgs = conversation.messages.all().order_by('created_at')
    if not msgs.exists():
        return f"Conversation du {conversation.created_at.strftime('%d/%m/%Y')}"
    first_user_message = msgs.filter(role='user').first() or msgs.first()
    if first_user_message:
        content = first_user_message.content.strip()
        return content[:40] + "..." if len(content) > 40 else content
    return f"Conversation du {conversation.created_at.strftime('%d/%m/%Y')}"


# ==================== API VIEWS ====================

@csrf_exempt_view
class SendMessageView(APIView):
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        api_key = data['api_key']
        content = data['content']
        conversation_id = data.get('conversation_id')

        sanctum_token = data.get('sanctum_token') or request.headers.get('Authorization', '').replace('Bearer ', '')
        print(f"Token reçu par Django : {sanctum_token[:30] if sanctum_token else 'None'}...")

        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)

        # selon le tenant, exactement comme pour le choix du moteur IA plus bas.
        if tenant.api_key == EASYCOOP_TENANT_KEY:
            django_user = get_easycoop_user_from_token(sanctum_token)
        else:
            django_user = get_django_user_from_token(sanctum_token)
        print(f" django_user après get_django_user_from_token: {django_user}")

        # ==============================
        # Gestion de la conversation
        # ==============================
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)
            if django_user:
                display_name = django_user.first_name or django_user.username
                conversation.user = django_user
                conversation.user_name = display_name
                conversation.user_email = django_user.email
                conversation.save()
                print(f"Utilisateur {django_user.email} associé à la conversation {conversation.id}")
        else:
            display_name = (django_user.first_name or django_user.username) if django_user else None
            conversation = Conversation.objects.create(
                tenant=tenant,
                user=django_user,
                user_name=display_name,
                user_email=django_user.email if django_user else None,
            )
            print(f"Nouvelle conversation créée avec l'utilisateur {django_user.email if django_user else 'Anonyme'}")

        user_message = Message.objects.create(conversation=conversation, role='user', content=content)

        # Routage selon le tenant
        if tenant.api_key == EASYCOOP_TENANT_KEY:
            bot_response_text, bot_success = get_bot_response_easycoop(content, tenant, sanctum_token)
        else:
            bot_response_text, bot_success = get_bot_response(content, tenant, sanctum_token)

        if bot_success and bot_response_text:
            bot_message = Message.objects.create(conversation=conversation, role='bot', content=bot_response_text)
            return Response({
                'conversation_id': conversation.id,
                'user_message': MessageSerializer(user_message).data,
                'bot_message': MessageSerializer(bot_message).data
            }, status=status.HTTP_200_OK)

        # ── Escalade ──────────────────────────────────────────
        waiting_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content="⏳ Un agent va prendre en charge votre demande dans quelques instants. Merci de votre patience !"
        )
        conversation.escalated = True
        conversation.save()

        est_easycoop = tenant.api_key == EASYCOOP_TENANT_KEY
        user_name = (django_user.first_name or django_user.username) if django_user else "Anonyme"
        user_email = (django_user.email or "Non renseigné") if django_user else "Non renseigné"
        direct_conversation_link = f"{SUPPORT_URL}/conversations/{conversation.id}?username={user_name}"

        # ========== 1. NOTIFICATION DISCORD ==========
        print("=" * 60)
        print(f"[DISCORD] === DÉBUT BLOC DISCORD ===")
        print(f"[DISCORD] tenant.api_key = '{tenant.api_key}'")
        print(f"[DISCORD] tenant.name = '{tenant.name}'")
        print(f"[DISCORD] conversation.id = {conversation.id}")

        try:
            if est_easycoop:
                webhook_url = getattr(settings, 'DISCORD_WEBHOOK_EASYCOOP', '')
                print(f"[DISCORD] Branche EASYCOOP → DISCORD_WEBHOOK_EASYCOOP")
            else:
                webhook_url = getattr(settings, 'DISCORD_WEBHOOK_URL', '')
                print(f"[DISCORD] Branche EASY EVENT → DISCORD_WEBHOOK_URL")

            print(f"[DISCORD] webhook_url longueur = {len(webhook_url)}")
            print(f"[DISCORD] webhook_url début = '{webhook_url[:70]}'")

            if not webhook_url:
                print(f"[DISCORD] webhook_url est VIDE — abandon de l'envoi")
            else:
                discord_message = {
                    "embeds": [{
                        "title": f"Nouvelle conversation escaladée — {tenant.name}",
                        "color": 15051068 if est_easycoop else 1420420,  # doré EasyCoop / vert Easy Events
                        "fields": [
                            {"name": "Tenant", "value": tenant.name, "inline": True},
                            {"name": "Utilisateur", "value": user_name, "inline": True},
                            {"name": "Email", "value": user_email, "inline": True},
                            {"name": "Conversation", "value": f"#{conversation.id}", "inline": True},
                            {"name": "Date", "value": conversation.created_at.strftime('%d/%m/%Y à %H:%M'), "inline": True},
                            {"name": "Message", "value": f'"{content}"', "inline": False},
                            {"name": "Lien direct", "value": direct_conversation_link, "inline": False}
                        ],
                        "footer": {"text": f"{tenant.name} Support"},
                        "timestamp": conversation.created_at.isoformat()
                    }]
                }
                print(f"[DISCORD] Payload construit, envoi en cours...")
                resp = requests.post(webhook_url, json=discord_message, timeout=8)
                print(f"[DISCORD] Réponse status = {resp.status_code}")
                print(f"[DISCORD] Réponse body = {resp.text[:200]}")
                if resp.status_code == 204:
                    print(f"[DISCORD] Notification envoyée pour conversation {conversation.id}")
                else:
                    print(f"[DISCORD] Status inattendu: {resp.status_code} — {resp.text[:300]}")
        except Exception as e:
            print(f"[DISCORD] EXCEPTION: {type(e).__name__} — {e}")
            import traceback
            traceback.print_exc()

        print(f"[DISCORD] === FIN BLOC DISCORD ===")
        print("=" * 60)

        # ========== 2. NOTIFICATION EMAIL — thread async ==========
        _conv_id       = conversation.id
        _conv_obj      = conversation
        _user_name     = user_name
        _user_email    = user_email
        _content       = content
        _tenant_name   = tenant.name
        _lien          = direct_conversation_link

        def envoyer_email_async():
            try:
                send_fancy_email(
                    tenant_name=_tenant_name,
                    user_name=_user_name,
                    user_email=_user_email,
                    conversation_id=_conv_id,
                    message_content=_content,
                    created_at=_conv_obj.created_at.strftime('%d/%m/%Y à %H:%M'),
                    lien=_lien,
                )
                print(f"Email professionnel envoyé à l'admin")
            except Exception as e:
                print(f"Erreur envoi email: {e}")

        email_thread = threading.Thread(target=envoyer_email_async)
        email_thread.daemon = True
        email_thread.start()

        # ========== 3. NOTIFICATION À LARAVEL (FILAMENT) — Easy Event uniquement ==========
        # Les escalades EasyCoop ne doivent pas arriver dans le Filament d'Easy Event.
        # Envoi dans un thread pour ne pas faire attendre l'utilisateur.
        if not est_easycoop:
            escalation_data = {
                'conversation_id': conversation.id,
                'user_id': django_user.id if django_user else None,
                'user_name': user_name,
                'user_email': user_email,
                'message': content,
                'created_at': conversation.created_at.isoformat(),
                'status': 'pending'
            }

            def notifier_laravel():
                try:
                    resp = requests.post(
                        f"{LARAVEL_URL}/api/chatbot/escalations",
                        json=escalation_data,
                        headers={'Content-Type': 'application/json'},
                        timeout=30
                    )
                    print(f"Notification envoyée à Laravel Filament (status {resp.status_code})")
                except Exception as e:
                    print(f"Erreur envoi à Laravel: {e}")

            threading.Thread(target=notifier_laravel, daemon=True).start()

        return Response({
            'conversation_id': conversation.id,
            'user_message': MessageSerializer(user_message).data,
            'bot_message': MessageSerializer(waiting_message).data
        }, status=status.HTTP_200_OK)


@csrf_exempt_view
class ConversationDetailView(APIView):
    def get(self, request, conversation_id):
        api_key = request.query_params.get('api_key')
        if not api_key:
            return Response({"error": "API key requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        return Response(ConversationSerializer(conversation).data)


@csrf_exempt_view
class AgentReplyView(APIView):
    def post(self, request):
        api_key = request.data.get('api_key')
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')
        if not all([api_key, conversation_id, content]):
            return Response({"error": "api_key, conversation_id et content sont requis"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        agent_message = Message.objects.create(conversation=conversation, role='bot', content=content)
        conversation.escalated = False
        conversation.save()
        return Response({"success": True, "message": MessageSerializer(agent_message).data})


@csrf_exempt_view
class AdminConversationsListView(APIView):
    def get(self, request):
        support_username = request.headers.get('X-Support-Username')
        print(f"AdminConversationsListView - Header X-Support-Username: '{support_username}'")

        from django.db.models import Q
        escalated_filter = Q(escalated=True) | Q(
            messages__content__startswith="⏳ Un agent va prendre en charge"
        )

        if not support_username or support_username in ['anonymous', 'null', '', 'Anonyme', 'None']:
            conversations = Conversation.objects.filter(escalated_filter).distinct().order_by('-updated_at')
            print(f"User anonyme → {conversations.count()} conversations escaladées retournées")
        else:
            # Recherche par user_name OU par user.username, restreinte aux escaladées
            conversations = Conversation.objects.filter(
                (Q(user_name=support_username) | Q(user__username=support_username)) & escalated_filter
            ).distinct().order_by('-updated_at')
            if conversations.count() == 0:
                conversations = Conversation.objects.filter(escalated_filter).distinct().order_by('-updated_at')
                print(f"'{support_username}' non trouvé → conversations escaladées retournées")
            else:
                print(f"{conversations.count()} conversations escaladées trouvées pour '{support_username}'")

        data = []
        for conv in conversations:
            # Priorité au user_name stocké
            user_name = conv.user_name or (conv.user.username if conv.user else "Anonyme")
            messages_data = MessageSerializer(conv.messages.all()[:50], many=True).data
            title = generate_conversation_title(conv)
            data.append({
                'id': conv.id,
                'title': title,
                'user_name': user_name,
                'user_id': conv.user.id if conv.user else None,
                'created_at': conv.created_at,
                'updated_at': conv.updated_at,
                'escalated': conv.escalated,
                'messages': messages_data,
                'tenant_id': conv.tenant.id,
                'tenant_name': conv.tenant.name,
                'tenant_api_key': conv.tenant.api_key,
            })
        return Response(data)


@csrf_exempt_view
class UserConversationsView(APIView):
    """Historique des conversations de l'utilisateur connecté.

    Le widget peut envoyer la clé du projet (?api_key=... ou en-tête X-API-Key).
    - avec la clé : on vérifie le jeton auprès de la bonne API (Easy Event ou
      EasyCoop) et on ne renvoie que les conversations de ce projet ;
    - sans la clé (ancien widget) : on essaie Easy Event, puis EasyCoop.
    Avant, seule l'API Easy Event était interrogée : un membre EasyCoop
    recevait toujours "Authentification requise".
    """
    def get(self, request):
        sanctum_token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
        if not sanctum_token:
            return Response({"error": "Authentification requise"}, status=status.HTTP_401_UNAUTHORIZED)

        api_key = request.query_params.get('api_key') or request.headers.get('X-API-Key')
        tenant = Tenant.objects.filter(api_key=api_key).first() if api_key else None

        if tenant is not None:
            if tenant.api_key == EASYCOOP_TENANT_KEY:
                django_user = get_easycoop_user_from_token(sanctum_token)
            else:
                django_user = get_django_user_from_token(sanctum_token)
            if django_user is None:
                return Response({"error": "Authentification requise"}, status=status.HTTP_401_UNAUTHORIZED)
            conversations = Conversation.objects.filter(user=django_user, tenant=tenant)
        else:
            django_user = get_django_user_from_token(sanctum_token)
            if django_user is not None:
                conversations = Conversation.objects.filter(user=django_user).exclude(tenant__api_key=EASYCOOP_TENANT_KEY)
            else:
                django_user = get_easycoop_user_from_token(sanctum_token)
                if django_user is None:
                    return Response({"error": "Authentification requise"}, status=status.HTTP_401_UNAUTHORIZED)
                conversations = Conversation.objects.filter(user=django_user, tenant__api_key=EASYCOOP_TENANT_KEY)

        conversations = conversations.order_by('-updated_at')
        data = ConversationSerializer(conversations, many=True).data
        # Titre lisible pour la liste du widget (premier message de la conversation)
        for item, conv in zip(data, conversations):
            item['title'] = generate_conversation_title(conv)
        return Response(data)


@csrf_exempt_view
class AdminConversationDetailView(APIView):
    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        data = ConversationSerializer(conversation).data
        data['user_name'] = conversation.user_name or (conversation.user.username if conversation.user else "Anonyme")
        return Response(data)

    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        content = request.data.get('content')
        if not content:
            return Response({'error': 'Message requis'}, status=status.HTTP_400_BAD_REQUEST)
        agent_message = Message.objects.create(conversation=conversation, role='bot', content=content)
        conversation.escalated = False
        conversation.save()
        if conversation.tenant.api_key == EASYCOOP_TENANT_KEY:
            return Response({'success': True, 'message': MessageSerializer(agent_message).data})
        try:
            laravel_url = f"{LARAVEL_URL}/api/chatbot/escalations/mark-resolved-by-conversation"
            resp = requests.post(
                laravel_url,
                json={'conversation_id': conversation.id},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if resp.status_code == 200:
                print(f"Escalade #{conversation.id} marquée resolved dans Laravel")
        except Exception as e:
            print(f"Erreur appel Laravel pour resolved: {e}")
        return Response({'success': True, 'message': MessageSerializer(agent_message).data})


@csrf_exempt_view
class DeleteConversationView(APIView):
    """Supprime une conversation et tous ses messages (cascade)."""
    def delete(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=status.HTTP_404_NOT_FOUND)

        conv_id = conversation.id
        conversation.delete()

        print(f"Conversation #{conv_id} supprimée")
        return Response({'success': True, 'message': f'Conversation #{conv_id} supprimée'}, status=status.HTTP_200_OK)


@csrf_exempt_view
class UploadDocumentView(APIView):
    def post(self, request):
        api_key = request.data.get('api_key')
        title = request.data.get('title')
        file = request.FILES.get('file')
        if not all([api_key, title, file]):
            return Response({"error": "api_key, title et file sont requis"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        file_extension = os.path.splitext(file.name)[1].lower()
        content = ""
        doc_type = "pdf"
        if file_extension == '.pdf':
            doc_type = "pdf"
            if PyPDF2 is None:
                return Response({"error": "PyPDF2 non installé"}, status=500)
            pdf_reader = PyPDF2.PdfReader(file)
            full_text = []
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    full_text.append(f"\n{'='*60}\n📄 PAGE {page_num + 1}/{len(pdf_reader.pages)}\n{'='*60}\n")
                    full_text.append(page_text)
            content = "\n".join(full_text)
        elif file_extension == '.txt':
            doc_type = "txt"
            content = file.read().decode('utf-8')
        elif file_extension in ['.png', '.jpg', '.jpeg']:
            doc_type = "image"
            try:
                image = Image.open(file)
                content = pytesseract.image_to_string(image, lang='fra')
                if not content.strip():
                    content = pytesseract.image_to_string(image, lang='eng')
            except Exception as e:
                return Response({"error": f"Erreur lecture image: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({"error": "Formats acceptés: PDF, TXT, PNG, JPG, JPEG"}, status=status.HTTP_400_BAD_REQUEST)
        content = re.sub(r'[^\x20-\x7E\x0A\x0D\xC0-\xFF\u00C0-\u00FF]', ' ', content)
        content = re.sub(r'\s+', ' ', content).strip()
        document = Document.objects.create(tenant=tenant, title=title, document_type=doc_type, content=content)
        file_path = default_storage.save(f'documents/{tenant.id}/{file.name}', file)
        document.file = file_path
        document.save()
        KnowledgeItem.objects.create(tenant=tenant, question=None, answer=content[:10000], category='document')
        return Response({
            'success': True,
            'document_id': document.id,
            'title': document.title,
            'document_type': doc_type,
            'content_preview': content[:500],
            'content_length': len(content),
            'message': f"Document '{title}' analysé avec succès !"
        })


@csrf_exempt_view
class ListDocumentsView(APIView):
    def get(self, request):
        api_key = request.query_params.get('api_key')
        if not api_key:
            return Response({"error": "API key requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        documents = Document.objects.filter(tenant=tenant)
        data = [{'id': doc.id, 'title': doc.title, 'uploaded_at': doc.uploaded_at, 'content_preview': doc.content[:200]} for doc in documents]
        return Response(data)


@csrf_exempt_view
class DeleteDocumentView(APIView):
    def delete(self, request, document_id):
        api_key = request.data.get('api_key')
        if not api_key:
            return Response({"error": "API key requise"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            document = Document.objects.get(id=document_id, tenant=tenant)
            KnowledgeItem.objects.filter(tenant=tenant, answer=document.content, category='document').delete()
            if document.file:
                default_storage.delete(document.file.name)
            document.delete()
            return Response({'success': True})
        except Document.DoesNotExist:
            return Response({"error": "Document non trouvé"}, status=status.HTTP_404_NOT_FOUND)


# ==================== VUES AUTHENTIFICATION ====================

def register_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password1 = request.POST.get('password1')
        password2 = request.POST.get('password2')
        if password1 != password2:
            messages.error(request, 'Les mots de passe ne correspondent pas.')
            return render(request, 'chatbot/register.html')
        if User.objects.filter(username=username).exists():
            messages.error(request, "Ce nom d'utilisateur est déjà pris.")
            return render(request, 'chatbot/register.html')
        if User.objects.filter(email=email).exists():
            messages.error(request, 'Cet email est déjà utilisé.')
            return render(request, 'chatbot/register.html')
        user = User.objects.create_user(username=username, email=email, password=password1)
        login(request, user)
        messages.success(request, 'Compte créé avec succès !')
        return redirect('dashboard')
    return render(request, 'chatbot/register.html')


def dashboard_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    if request.user.is_staff:
        return redirect('http://localhost:5173')
    return render(request, 'chatbot/home.html', {'user': request.user})


def custom_password_reset(request):
    if request.method == 'POST':
        form = PasswordResetForm(request.POST)
        if form.is_valid():
            form.save(
                request=request,
                use_https=request.is_secure(),
                email_template_name='registration/password_reset_email.html',
                subject_template_name='registration/password_reset_subject.txt'
            )
            return redirect('password_reset_done')
    else:
        form = PasswordResetForm()
    return render(request, 'registration/password_reset_custom.html', {'form': form})


def custom_password_reset_done(request):
    return render(request, 'registration/password_reset_done_custom.html')


def full_dashboard_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    return render(request, 'chatbot/user_dashboard.html', {'user': request.user})


def home_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return redirect('login')


@csrf_exempt_view
class TenantsListView(APIView):
    def get(self, request):
        tenants = Tenant.objects.all().order_by('name')
        data = [
            {
                'id': t.id,
                'name': t.name,
                'api_key': t.api_key,
            }
            for t in tenants
        ]
        return Response(data)