from rest_framework import serializers
from .models import Conversation, Message, Tenant

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'tenant', 'created_at', 'updated_at', 'escalated', 'messages']

class SendMessageSerializer(serializers.Serializer):
    api_key = serializers.CharField()
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    content = serializers.CharField()

class MessageResponseSerializer(serializers.Serializer):
    conversation_id = serializers.IntegerField()
    user_message = MessageSerializer()
    bot_message = MessageSerializer()