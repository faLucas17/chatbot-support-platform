from rest_framework import serializers
from .models import Conversation, Message, Tenant

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = ['id', 'tenant', 'user_name', 'created_at', 'updated_at', 'escalated', 'messages']
    
    def get_user_name(self, obj):
        return obj.user_name or (obj.user.username if obj.user else "Anonyme")

class SendMessageSerializer(serializers.Serializer):
    api_key = serializers.CharField()
    conversation_id = serializers.IntegerField(required=False, allow_null=True)
    content = serializers.CharField()
    sanctum_token = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class MessageResponseSerializer(serializers.Serializer):
    conversation_id = serializers.IntegerField()
    user_message = MessageSerializer()
    bot_message = MessageSerializer()