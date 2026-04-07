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

# Extraction de texte pour PDF
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

# Configurer le chemin de Tesseract pour Windows
if os.name == 'nt':  # Windows
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

class SendMessageView(APIView):
    """
    Endpoint pour envoyer un message et recevoir une réponse du bot
    """
    
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
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if conversation_id:
            try:
                conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
            except Conversation.DoesNotExist:
                return Response(
                    {"error": "Conversation non trouvée"},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            conversation = Conversation.objects.create(tenant=tenant)
        
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )
        
        bot_response_text, bot_success = get_bot_response(content, tenant)
        
        if bot_success and bot_response_text:
            bot_message = Message.objects.create(
                conversation=conversation,
                role='bot',
                content=bot_response_text
            )
            response_data = {
                'conversation_id': conversation.id,
                'user_message': MessageSerializer(user_message).data,
                'bot_message': MessageSerializer(bot_message).data
            }
            return Response(response_data, status=status.HTTP_200_OK)
        
        conversation.escalated = True
        conversation.save()
        
        webhook_url = getattr(settings, 'DISCORD_WEBHOOK_URL', '')
        
        if webhook_url:
            discord_message = {
                "content": f"🚨 **Nouvelle conversation escaladée !**\n\n"
                          f"**Conversation ID:** {conversation.id}\n"
                          f"**Message client:** {content}\n\n"
                          f"**Pour répondre via API:**\n"
                          f"```json\n"
                          f"{{\n"
                          f"  \"api_key\": \"{tenant.api_key}\",\n"
                          f"  \"conversation_id\": {conversation.id},\n"
                          f"  \"content\": \"ta réponse ici\"\n"
                          f"}}\n"
                          f"```\n\n"
                          f"**Admin:** http://127.0.0.1:8000/admin/chatbot/conversation/{conversation.id}/change/"
            }
            
            try:
                response = requests.post(webhook_url, json=discord_message)
                if response.status_code == 204:
                    print(f"✅ Discord notification envoyée pour conversation {conversation.id}")
                else:
                    print(f"⚠️ Discord response: {response.status_code}")
            except Exception as e:
                print(f"❌ Erreur envoi Discord: {e}")
        
        response_data = {
            'conversation_id': conversation.id,
            'user_message': MessageSerializer(user_message).data,
            'bot_message': None
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class ConversationDetailView(APIView):
    """
    Endpoint pour voir l'historique d'une conversation
    """
    
    def get(self, request, conversation_id):
        api_key = request.query_params.get('api_key')
        
        if not api_key:
            return Response(
                {"error": "API key requise"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)


class AgentReplyView(APIView):
    """
    Endpoint pour que l'agent réponde à une conversation
    """
    
    def post(self, request):
        api_key = request.data.get('api_key')
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')
        
        if not all([api_key, conversation_id, content]):
            return Response(
                {"error": "api_key, conversation_id et content sont requis"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        agent_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content=content
        )
        
        conversation.escalated = False
        conversation.save()
        
        return Response({
            "success": True,
            "message": MessageSerializer(agent_message).data
        })


class AdminConversationsListView(APIView):
    """Liste de TOUTES les conversations pour l'admin"""
    
    def get(self, request):
        # Récupérer TOUTES les conversations, pas seulement les escaladées
        conversations = Conversation.objects.all().order_by('-updated_at')
        
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)


class AdminConversationDetailView(APIView):
    """Détail d'une conversation pour l'admin - sans authentification"""
    
    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)
    
    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation non trouvée'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        content = request.data.get('content')
        if not content:
            return Response(
                {'error': 'Message requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        agent_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content=content
        )
        
        conversation.escalated = False
        conversation.save()
        
        return Response({
            'success': True,
            'message': MessageSerializer(agent_message).data
        })


# ==================== UPLOAD DOCUMENTS ====================

class UploadDocumentView(APIView):
    def post(self, request):
        api_key = request.data.get('api_key')
        title = request.data.get('title')
        file = request.FILES.get('file')
        
        if not all([api_key, title, file]):
            return Response(
                {"error": "api_key, title et file sont requis"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        file_extension = os.path.splitext(file.name)[1].lower()
        content = ""
        doc_type = "pdf"
        
        # 1. TRAITEMENT PDF
        if file_extension == '.pdf':
            doc_type = "pdf"
            if PyPDF2 is None:
                return Response({"error": "PyPDF2 non installé"}, status=500)
            
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            full_text = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                if page_text:
                    full_text.append(f"\n{'='*60}\n📄 PAGE {page_num + 1}/{total_pages}\n{'='*60}\n")
                    full_text.append(page_text)
                else:
                    full_text.append(f"\n⚠️ Page {page_num + 1} : contenu non extractible (peut-être une image)\n")
            
            content = "\n".join(full_text)
        
        # 2. TRAITEMENT TXT
        elif file_extension == '.txt':
            doc_type = "txt"
            content = file.read().decode('utf-8')
        
        # 3. TRAITEMENT IMAGES (PNG, JPG, JPEG)
        elif file_extension in ['.png', '.jpg', '.jpeg']:
            doc_type = "image"
            try:
                image = Image.open(file)
                # OCR en français
                content = pytesseract.image_to_string(image, lang='fra')
                if not content.strip():
                    content = pytesseract.image_to_string(image, lang='eng')
            except Exception as e:
                return Response(
                    {"error": f"Erreur lecture image: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        else:
            return Response(
                {"error": "Formats acceptés: PDF, TXT, PNG, JPG, JPEG"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Nettoyer le texte
        content = re.sub(r'[^\x20-\x7E\x0A\x0D\xC0-\xFF\u00C0-\u00FF]', ' ', content)
        content = re.sub(r'\s+', ' ', content).strip()
        
        # Sauvegarder
        document = Document.objects.create(
            tenant=tenant,
            title=title,
            document_type=doc_type,
            content=content
        )
        
        file_path = default_storage.save(f'documents/{tenant.id}/{file.name}', file)
        document.file = file_path
        document.save()
        
        # Ajouter à la base de connaissance
        KnowledgeItem.objects.create(
            tenant=tenant,
            question=None,
            answer=content[:10000],  # Limite pour la base
            category='document'
        )
        
        return Response({
            'success': True,
            'document_id': document.id,
            'title': document.title,
            'document_type': doc_type,
            'content_preview': content[:500],
            'content_length': len(content),
            'message': f"Document '{title}' analysé avec succès !"
        })

class ListDocumentsView(APIView):
    """Liste des documents uploadés"""
    
    def get(self, request):
        api_key = request.query_params.get('api_key')
        
        if not api_key:
            return Response(
                {"error": "API key requise"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        documents = Document.objects.filter(tenant=tenant)
        data = [{
            'id': doc.id,
            'title': doc.title,
            'uploaded_at': doc.uploaded_at,
            'content_preview': doc.content[:200]
        } for doc in documents]
        
        return Response(data)


class DeleteDocumentView(APIView):
    """Supprimer un document"""
    
    def delete(self, request, document_id):
        api_key = request.data.get('api_key')
        
        if not api_key:
            return Response(
                {"error": "API key requise"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            document = Document.objects.get(id=document_id, tenant=tenant)
            KnowledgeItem.objects.filter(tenant=tenant, answer=document.content, category='document').delete()
            if document.file:
                default_storage.delete(document.file.name)
            document.delete()
            return Response({'success': True})
        except Document.DoesNotExist:
            return Response(
                {"error": "Document non trouvé"},
                status=status.HTTP_404_NOT_FOUND
            )