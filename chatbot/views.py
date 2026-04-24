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

# Décorateur CSRF pour toutes les vues
csrf_exempt_view = method_decorator(csrf_exempt, name='dispatch')

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
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response({"error": "Clé API invalide"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user if request.user.is_authenticated else None
        
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
                if conversation.user is None and user:
                    conversation.user = user
                    conversation.save()
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation non trouvée"}, status=status.HTTP_404_NOT_FOUND)
        else:
            conversation = Conversation.objects.create(tenant=tenant, user=user)
        
        user_message = Message.objects.create(conversation=conversation, role='user', content=content)
        bot_response_text, bot_success = get_bot_response(content, tenant)
        
        # Si le bot a trouvé une réponse
        if bot_success and bot_response_text:
            bot_message = Message.objects.create(conversation=conversation, role='bot', content=bot_response_text)
            response_data = {
                'conversation_id': conversation.id,
                'user_message': MessageSerializer(user_message).data,
                'bot_message': MessageSerializer(bot_message).data
            }
            return Response(response_data, status=status.HTTP_200_OK)
        
        # Escalade : envoyer un message d'attente à l'utilisateur
        waiting_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content="⏳ Un agent va prendre en charge votre demande dans quelques instants. Merci de votre patience !"
        )
        
        conversation.escalated = True
        conversation.save()
        
        user_name = user.username if user else "Anonyme"
        
        # ========== 1. NOTIFICATION DISCORD ==========
        webhook_url = getattr(settings, 'DISCORD_WEBHOOK_URL', '')
        if webhook_url:
            discord_message = {
                "content": f"🚨 **Nouvelle conversation escaladée !**\n\n"
                          f"**Utilisateur:** {user_name}\n"
                          f"**Conversation ID:** {conversation.id}\n"
                          f"**Message client:** {content}\n\n"
                          f"**Admin:** http://localhost:5173"
            }
            try:
                response = requests.post(webhook_url, json=discord_message)
                if response.status_code == 204:
                    print(f"✅ Discord notification envoyée pour conversation {conversation.id}")
            except Exception as e:
                print(f"❌ Erreur envoi Discord: {e}")
        
        # ========== 2. NOTIFICATION EMAIL (à l'ADMIN) ==========
        try:
            admin_email = settings.ADMIN_EMAIL
            user_email = user.email if user and user.email else "Non renseigné" 
            
            subject = f"[Support IA] Nouvelle conversation escaladée #{conversation.id}"
            email_message = f"""
🚨 **NOUVELLE CONVERSATION ESCALADÉE**

Une nouvelle conversation a été escaladée car le bot n'a pas pu répondre.

📋 DÉTAILS :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email de l'utilisateur : {user_email}
👤 Utilisateur : {user_name}
🆔 Conversation ID : {conversation.id}
💬 Message : {content}
📅 Date : {conversation.created_at.strftime('%d/%m/%Y à %H:%M:%S')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Pour répondre, rendez-vous sur : http://localhost:5173

--
Support IA - Notification automatique
"""
            
            send_mail(
                subject=subject,
                message=email_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin_email],
                fail_silently=False,
            )
            print(f"✅ Email notification envoyée à l'admin ({admin_email})")
            
        except Exception as e:
            print(f"❌ Erreur envoi email: {e}")
        
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


@csrf_exempt_view
class AdminConversationsListView(APIView):
    def get(self, request):
        conversations = Conversation.objects.all().order_by('-updated_at')
        
        # Ajouter le nom d'utilisateur à chaque conversation
        data = []
        for conv in conversations:
            user_name = conv.user.username if conv.user else "Anonyme"
            data.append({
                'id': conv.id,
                'user_name': user_name,
                'user_id': conv.user.id if conv.user else None,
                'created_at': conv.created_at,
                'updated_at': conv.updated_at,
                'escalated': conv.escalated,
                'messages': MessageSerializer(conv.messages.all(), many=True).data
            })
        
        return Response(data)


@csrf_exempt_view
class UserConversationsView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentification requise"}, status=status.HTTP_401_UNAUTHORIZED)
        
        conversations = Conversation.objects.filter(user=request.user).order_by('-updated_at')
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)


@csrf_exempt_view
class AdminConversationDetailView(APIView):
    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=status.HTTP_404_NOT_FOUND)
        
        # Ajouter le nom d'utilisateur
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
        # Page d'accueil stylée avec bouton flottant
        return render(request, 'chatbot/home.html', {'user': request.user})

def custom_password_reset(request):
    """Page personnalisée de réinitialisation du mot de passe"""
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
    """Page de confirmation après l'envoi de l'email"""
    return render(request, 'registration/password_reset_done_custom.html')

def full_dashboard_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    
    return render(request, 'chatbot/user_dashboard.html', {'user': request.user})

def home_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    return redirect('login')