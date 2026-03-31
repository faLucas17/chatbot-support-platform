from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Tenant, Conversation, Message
from .serializers import SendMessageSerializer, MessageResponseSerializer, MessageSerializer
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
        
        # Sauvegarder la réponse du bot
        bot_message = Message.objects.create(
            conversation=conversation,
            role='bot',
            content=bot_response_text
        )
        
        # Si le bot n'a pas pu répondre, marquer la conversation pour escalation
        if not bot_success:
            conversation.escalated = True
            conversation.save()
            # TODO: Envoyer notification Discord (Jour 2)
        
        # Retourner la réponse
        response_data = {
            'conversation_id': conversation.id,
            'user_message': MessageSerializer(user_message).data,
            'bot_message': MessageSerializer(bot_message).data
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
        
        from .serializers import ConversationSerializer
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)