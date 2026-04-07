from django.urls import path
from . import views

urlpatterns = [
    # API endpoints (sans authentification)
    path('api/message/', views.SendMessageView.as_view(), name='send_message'),
    path('api/conversation/<int:conversation_id>/', views.ConversationDetailView.as_view(), name='conversation_detail'),
    path('api/agent/reply/', views.AgentReplyView.as_view(), name='agent_reply'),
    
    # Admin endpoints (sans authentification)
    path('admin/conversations/', views.AdminConversationsListView.as_view(), name='admin_conversations'),
    path('admin/conversations/<int:conversation_id>/', views.AdminConversationDetailView.as_view(), name='admin_conversation_detail'),
    
    # Upload documents
    path('api/documents/upload/', views.UploadDocumentView.as_view(), name='upload_document'),
    path('api/documents/', views.ListDocumentsView.as_view(), name='list_documents'),
    path('api/documents/<int:document_id>/', views.DeleteDocumentView.as_view(), name='delete_document'),
]