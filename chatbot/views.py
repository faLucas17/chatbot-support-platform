import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Tenant, Conversation, Message
from .serializers import SendMessageSerializer, MessageSerializer, ConversationSerializer
from .ai_engine import get_bot_response


class SendMessageView(APIView):
    """
    Endpoint pour envoyer un message et recevoir une réponse du bot
    """
    
    def post(self, request):
        # Valider les données entrantes
        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        api_key = data['api_key']
        content = data['content']
        conversation_id = data.get('conversation_id')
        
        # Vérifier la clé API
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Récupérer ou créer la conversation
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
        
        # Sauvegarder le message utilisateur
        user_message = Message.objects.create(
            conversation=conversation,
            role='user',
            content=content
        )
        
        # Obtenir la réponse du bot
        bot_response_text, bot_success = get_bot_response(content, tenant)
        
        # Si le bot a une réponse, la sauvegarder et la retourner immédiatement
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
        
        # Si le bot ne sait pas répondre : ne pas sauvegarder de message bot
        # Marquer la conversation pour escalation
        conversation.escalated = True
        conversation.save()
        
        # Envoyer notification Discord
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
        
        # Retourner seulement le message utilisateur, sans message bot
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
        
        # Vérifier la clé API
        try:
            tenant = Tenant.objects.get(api_key=api_key)
        except Tenant.DoesNotExist:
            return Response(
                {"error": "Clé API invalide"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Vérifier que la conversation appartient au tenant
        try:
            conversation = Conversation.objects.get(id=conversation_id, tenant=tenant)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Ajouter la réponse de l'agent
        agent_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content=content
        )
        
        # Réinitialiser le flag escalated
        conversation.escalated = False
        conversation.save()
        
        return Response({
            "success": True,
            "message": MessageSerializer(agent_message).data
        })


class AdminConversationsListView(APIView):
    """Liste des conversations pour l'admin - sans authentification"""
    
    def get(self, request):
        conversations = Conversation.objects.filter(
            escalated=True
        ).order_by('-updated_at')
        
        if not conversations.exists():
            conversations = Conversation.objects.all().order_by('-created_at')[:10]
        
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