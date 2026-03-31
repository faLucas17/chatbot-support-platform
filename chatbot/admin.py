from django.contrib import admin
from .models import Tenant, KnowledgeItem, Conversation, Message

admin.site.register(Tenant)
admin.site.register(KnowledgeItem)
admin.site.register(Conversation)
admin.site.register(Message)