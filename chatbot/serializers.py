from rest_framework import serializers
from .models import Conversation, Message, Tenant

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    # "id" est l'identifiant public (UUID) : c'est lui qui circule dans les liens
    # et entre les widgets et l'API. "numero" est le numéro interne, pour l'affichage.
    id = serializers.UUIDField(source='public_id', read_only=True)
    numero = serializers.IntegerField(source='pk', read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'numero', 'tenant', 'user_name', 'created_at', 'updated_at', 'escalated', 'messages']
    
    def get_user_name(self, obj):
        return obj.user_name or (obj.user.username if obj.user else "Anonyme")

class SendMessageSerializer(serializers.Serializer):
    api_key = serializers.CharField()
    # Identifiant public (UUID) de la conversation, renvoyé par l'API au premier message.
    # Texte libre : un ancien widget qui enverrait encore un numéro ne provoque pas
    # d'erreur, la vue démarre simplement une nouvelle conversation.
    conversation_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    content = serializers.CharField()
    sanctum_token = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class MessageResponseSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()
    user_message = MessageSerializer()
    bot_message = MessageSerializer()