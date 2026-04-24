from django.db import models
from django.contrib.auth.models import User

class Tenant(models.Model):
    """Application cliente"""
    name = models.CharField(max_length=100)
    api_key = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class KnowledgeItem(models.Model):
    """Base de connaissance : FAQ et textes"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='knowledge_items')
    question = models.CharField(max_length=500, blank=True, null=True)
    answer = models.TextField()
    category = models.CharField(max_length=100, blank=True, default='general')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.question or f"Knowledge {self.id}"

class Conversation(models.Model):
    """Une conversation entre un client et le bot/agent"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations', null=True, blank=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    escalated = models.BooleanField(default=False)
    
    def __str__(self):
        user_name = self.user.username if self.user else "Anonyme"
        return f"Conversation {self.id} - {user_name} - {self.tenant.name}"

class Message(models.Model):
    """Un message dans une conversation"""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('bot', 'Bot'),
    ]
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class Document(models.Model):
    DOCUMENT_TYPES = [
        ('pdf', 'PDF'),
        ('txt', 'TXT'),
        ('image', 'Image'),
    ]
    
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/', blank=True, null=True)  # ← ajoute blank=True, null=True
    document_type = models.CharField(max_length=10, choices=DOCUMENT_TYPES, default='pdf')
    content = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"