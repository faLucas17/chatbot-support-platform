import os, re
import requests
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Tenant, Conversation, Message, KnowledgeItem, Document
from .serializers import SendMessageSerializer, MessageSerializer, ConversationSerializer
from .ai_engine import get_bot_response
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
SUPPORT_URL = os.getenv('SUPPORT_URL', 'https://support-platform-admin.onrender.com')

# ============================================================
# FONCTION POUR ENVOYER UN EMAIL PROFESSIONNEL AVEC COULEURS
# ============================================================
def send_fancy_email(subject, user_name, user_email, conversation_id, conversation_title, message_content, created_at):
    admin_email = settings.ADMIN_EMAIL
    support_link = f"{SUPPORT_URL}/conversations/{conversation_id}?username={user_name}"

    html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assistance requise</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="background: linear-gradient(90deg, #15AD84 0%, #FF9900 100%); height: 6px;"></td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 36px 48px 28px 48px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="50%"><span style="font-size: 22px; font-weight: 700; color: #15AD84; letter-spacing: -0.5px;">Easy</span><span style="font-size: 22px; font-weight: 700; color: #FF9900;">Event</span></td>
            <td width="50%" align="right"><span style="display: inline-block; background-color: #FFF4E0; color: #CC7A00; font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 20px;">Assistance requise</span></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 0 48px;"><div style="height: 1px; background-color: #EEEEEE;"></div></td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 36px 48px 12px 48px;">
        <p style="margin: 0; font-size: 13px; font-weight: 600; color: #15AD84; text-transform: uppercase; letter-spacing: 1px;">Support client</p>
        <h1 style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: #1A1A1A; line-height: 1.2;">Un utilisateur a besoin<br>d'une assistance humaine</h1>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 28px 48px 12px 48px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #15AD84 0%, #FF9900 100%); color: white; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">Sujet de la conversation</div>
        <h2 style="margin: 12px 0 0 0; font-size: 20px; font-weight: 600; color: #15AD84; line-height: 1.3;">{conversation_title}</h2>
      </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 28px 48px 0 48px;">
        <div style="border-left: 3px solid #FF9900; padding: 16px 20px; background-color: #FAFAFA;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #999999; text-transform: uppercase;">Message de l'utilisateur</p>
          <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6; font-style: italic;">"{message_content}"</p>
        </div>
       </td>
    </table>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 32px 48px 0 48px;">
        <p style="margin: 0 0 16px 0; font-size: 11px; font-weight: 600; color: #999999; text-transform: uppercase;">Détails</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="50%" style="padding-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #999999;">Nom</p>
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; font-weight: 600;">{user_name}</p>
            </td>
            <td width="50%" style="padding-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #999999;">Email</p>
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; font-weight: 600;">{user_email}</p>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #999999;">Date</p>
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; font-weight: 600;">{created_at}</p>
            </td>
            <td width="50%" style="padding-bottom: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #999999;">Référence</p>
              <p style="margin: 0; font-size: 15px; color: #1A1A1A; font-weight: 600;">#{conversation_id}</p>
            </td>
          </tr>
        </table>
       </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 0 48px;"><div style="height: 1px; background-color: #EEEEEE;"></div></td></tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr><td style="padding: 32px 48px 48px 48px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background: linear-gradient(90deg, #15AD84 0%, #FF9900 100%); border-radius: 8px;">
              <a href="{support_link}" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">Voir la conversation</a>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0 0; font-size: 12px; color: #AAAAAA;">Ou copiez ce lien : <a href="{support_link}" style="color: #15AD84;">{support_link}</a></p>
       </td>
    </tr>
  </table>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8F8F8; border-top: 1px solid #EEEEEE;">
    <tr><td style="padding: 24px 48px;">
        <table width="100%">
          <tr><td align="left"><p style="margin: 0; font-size: 12px; color: #AAAAAA;">EasyEvent Support — Assistance client automatisée</p></td>
          <td align="right"><a href="{SUPPORT_URL}" style="font-size: 12px; color: #15AD84; text-decoration: none;">Tableau de bord support</a></td>
          </tr>
        </table>
       </td>
    </tr>
  </table>

  <table width="100%">
    <tr><td style="background: linear-gradient(90deg, #15AD84 0%, #FF9900 100%); height: 4px;"></td></tr>
  追赶

</body>
</html>
    """

    text_content = f"""
EASY EVENT — SUPPORT CLIENT
Assistance requise

Sujet : {conversation_title}

Utilisateur : {user_name}
Email       : {user_email}
Référence   : #{conversation_id}
Date        : {created_at}

Message de l'utilisateur :
"{message_content}"

Lien direct : {support_link}

--
EasyEvent Support
    """

    send_mail(
        subject=subject,
        message=text_content,
        html_message=html_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[admin_email],
        fail_silently=True,
    )


# ============================================================
# FONCTION POUR RÉCUPÉRER L'UTILISATEUR DJANGO DEPUIS LE TOKEN SANCTUM
# ============================================================
def get_django_user_from_token(sanctum_token):
    """
    Récupère ou crée un utilisateur Django à partir du token Sanctum Laravel.
    """
    if not sanctum_token:
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
            user_email = user_data.get('email')
            user_name = user_data.get('name', '')
            
            if user_email:
                username = user_email.split('@')[0]
                user, created = User.objects.get_or_create(
                    email=user_email,
                    defaults={
                        'username': username,
                        'first_name': user_name,
                        'email': user_email
                    }
                )
                if created:
                    print(f"✅ Nouvel utilisateur Django créé: {user_email} ({user_name})")
                else:
                    if user.first_name != user_name and user_name:
                        user.first_name = user_name
                        user.save()
                        print(f"✅ Nom utilisateur mis à jour: {user_name}")
                return user
    except Exception as e:
        print(f"❌ Erreur récupération utilisateur depuis token: {e}")
    return None


# Appliquer csrf_exempt à TOUTES les méthodes de la classe
def csrf_exempt_view(cls):
    """Décorateur pour rendre une classe entière exempte de CSRF"""
    cls.dispatch = method_decorator(csrf_exempt)(cls.dispatch)
    return cls


# Extraction de texte pour PDF
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None


# Configurer le chemin de Tesseract pour Windows
if os.name == 'nt':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


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
        
        print(f"🔑 Token reçu par Django : {sanctum_token[:30] if sanctum_token else 'None'}...")
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        
        django_user = get_django_user_from_token(sanctum_token)
        
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
                if django_user and not conversation.user:
                    conversation.user = django_user
                    conversation.save()
                    print(f"✅ Utilisateur {django_user.email} associé à la conversation {conversation.id}")
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation = Conversation.objects.create(tenant=tenant, user=django_user)
            print(f"✅ Nouvelle conversation créée avec l'utilisateur {django_user.email if django_user else 'Anonyme'}")
        
        user_message = Message.objects.create(conversation=conversation, role='user', content=content)
        bot_response_text, bot_success = get_bot_response(content, tenant, sanctum_token)
        
        if bot_success and bot_response_text:
            bot_message = Message.objects.create(conversation=conversation, role='bot', content=bot_response_text)
            response_data = {
                'conversation_id': conversation.id,
                'user_message': MessageSerializer(user_message).data,
                'bot_message': MessageSerializer(bot_message).data
            }
            return Response(response_data, status=status.HTTP_200_OK)
        
        waiting_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content="⏳ Un agent va prendre en charge votre demande dans quelques instants. Merci de votre patience !"
        )
        
        conversation.escalated = True
        conversation.save()
        
        user_name = django_user.username if django_user else "Anonyme"
        user_email = django_user.email if django_user else "Non renseigné"
        
        # Construire le lien direct vers la conversation dans l'interface support
        direct_conversation_link = f"{SUPPORT_URL}/conversations/{conversation.id}?username={user_name}"
        
        # ========== 1. NOTIFICATION DISCORD ==========
        webhook_url = getattr(settings, 'DISCORD_WEBHOOK_URL', '')
        if webhook_url:
            discord_message = {
                "embeds": [
                    {
                        "title": "Nouvelle conversation escaladée",
                        "color": 1420420,
                        "fields": [
                            {"name": "Utilisateur", "value": user_name, "inline": True},
                            {"name": "Email", "value": user_email, "inline": True},
                            {"name": "Conversation", "value": f"#{conversation.id}", "inline": True},
                            {"name": "Date", "value": conversation.created_at.strftime('%d/%m/%Y à %H:%M'), "inline": True},
                            {"name": "Message", "value": f'"{content}"', "inline": False},
                            {"name": "Lien direct", "value": direct_conversation_link, "inline": False}
                        ],
                        "footer": {"text": "EasyEvent Support"},
                        "timestamp": conversation.created_at.isoformat()
                    }
                ]
            }
            try:
                response = requests.post(webhook_url, json=discord_message)
                if response.status_code == 204:
                    print(f"✅ Discord notification envoyée pour conversation {conversation.id}")
            except Exception as e:
                print(f"❌ Erreur envoi Discord: {e}")
        
        # ========== 2. NOTIFICATION EMAIL PROFESSIONNELLE ==========
        try:
            # Récupérer le titre de la conversation (premier message)
            conversation_title = generate_conversation_title(conversation)
            
            subject = f"[EasyEvent Support] Assistance requise - {user_name}"
            send_fancy_email(
                subject=subject,
                user_name=user_name,
                user_email=user_email,
                conversation_id=conversation.id,
                conversation_title=conversation_title,
                message_content=content,
                created_at=conversation.created_at.strftime('%d/%m/%Y à %H:%M:%S')
            )
            print(f"✅ Email professionnel envoyé à l'admin")
        except Exception as e:
            print(f"❌ Erreur envoi email: {e}")
        
        # ========== 3. NOTIFICATION À LARAVEL (FILAMENT) ==========
        try:
            laravel_notification_url = f"{LARAVEL_URL}/api/chatbot/escalations"
            escalation_data = {
                'conversation_id': conversation.id,
                'user_id': django_user.id if django_user else None,
                'user_name': user_name,
                'user_email': user_email,
                'message': content,
                'created_at': conversation.created_at.isoformat(),
                'status': 'pending'
            }
            response = requests.post(
                laravel_notification_url,
                json=escalation_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            print(f"✅ Notification envoyée à Laravel Filament (status {response.status_code})")
        except Exception as e:
            print(f"❌ Erreur envoi à Laravel: {e}")
        
        response_data = {
            'conversation_id': conversation.id,
            'user_message': MessageSerializer(user_message).data,
            'bot_message': MessageSerializer(waiting_message).data
        }
        return Response(response_data, status=status.HTTP_200_OK)


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
        
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)


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


def generate_conversation_title(conversation):
    """
    Génère un titre lisible pour une conversation basé sur son contenu.
    """
    messages = conversation.messages.all().order_by('created_at')
    
    if not messages.exists():
        return f"Conversation du {conversation.created_at.strftime('%d/%m/%Y')}"
    
    first_user_message = messages.filter(role='user').first()
    if not first_user_message:
        first_user_message = messages.first()
    
    if first_user_message:
        content = first_user_message.content
        content = content.strip()
        if len(content) > 40:
            content = content[:40] + "..."
        return content
    
    return f"Conversation du {conversation.created_at.strftime('%d/%m/%Y')}"


# ============================================================
# AdminConversationsListView
# ============================================================
@csrf_exempt_view
class AdminConversationsListView(APIView):
    def get(self, request):
        support_username = request.headers.get('X-Support-Username')
        
        print(f"🔍 AdminConversationsListView - Header X-Support-Username: '{support_username}'")
        
        # Si pas de username ou username invalide → toutes les conversations escaladées
        if not support_username or support_username in ['anonymous', 'null', '', 'Anonyme', 'None']:
            conversations = Conversation.objects.filter(escalated=True).order_by('-updated_at')
            print(f"📋 User anonyme → {conversations.count()} conversations escaladées retournées")
        else:
            try:
                user = User.objects.get(username=support_username)
                conversations = Conversation.objects.filter(user=user).order_by('-updated_at')
                print(f"📋 {conversations.count()} conversations trouvées pour '{support_username}'")
            except User.DoesNotExist:
                # Username pas trouvé → toutes les escalades
                conversations = Conversation.objects.filter(escalated=True).order_by('-updated_at')
                print(f"⚠️ '{support_username}' non trouvé → conversations escaladées retournées")
        
        data = []
        for conv in conversations:
            user_name = conv.user.username if conv.user else "Anonyme"
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
                'messages': messages_data
            })
        
        return Response(data)


@csrf_exempt_view
class UserConversationsView(APIView):
    def get(self, request):
        auth_header = request.headers.get('Authorization', '')
        sanctum_token = auth_header.replace('Bearer ', '')
        
        if sanctum_token:
            django_user = get_django_user_from_token(sanctum_token)
            if django_user:
                conversations = Conversation.objects.filter(user=django_user).order_by('-updated_at')
                serializer = ConversationSerializer(conversations, many=True)
                return Response(serializer.data)
        
        return Response({"error": "Authentification requise"}, status=status.HTTP_401_UNAUTHORIZED)


@csrf_exempt_view
class AdminConversationDetailView(APIView):
    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        
        data = ConversationSerializer(conversation).data
        data['user_name'] = conversation.user.username if conversation.user else "Anonyme"
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
        
        try:
            laravel_url = f"{LARAVEL_URL}/api/chatbot/escalations/mark-resolved-by-conversation"
            response = requests.post(
                laravel_url,
                json={'conversation_id': conversation.id},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if response.status_code == 200:
                print(f"✅ Escalade #{conversation.id} marquée resolved dans Laravel")
        except Exception as e:
            print(f"❌ Erreur appel Laravel pour resolved: {e}")
        
        return Response({'success': True, 'message': MessageSerializer(agent_message).data})


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
            messages.error(request, 'Ce nom d\'utilisateur est déjà pris.')
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
    else:
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