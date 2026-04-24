from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    # API endpoints (avec csrf_exempt)
    path('api/message/', csrf_exempt(views.SendMessageView.as_view()), name='send_message'),
    path('api/conversation/<int:conversation_id>/', csrf_exempt(views.ConversationDetailView.as_view()), name='conversation_detail'),
    path('api/agent/reply/', csrf_exempt(views.AgentReplyView.as_view()), name='agent_reply'),
    path('admin/conversations/', csrf_exempt(views.AdminConversationsListView.as_view()), name='admin_conversations'),
    path('admin/conversations/<int:conversation_id>/', csrf_exempt(views.AdminConversationDetailView.as_view()), name='admin_conversation_detail'),
    path('api/documents/upload/', csrf_exempt(views.UploadDocumentView.as_view()), name='upload_document'),
    path('api/documents/', csrf_exempt(views.ListDocumentsView.as_view()), name='list_documents'),
    path('api/documents/<int:document_id>/', csrf_exempt(views.DeleteDocumentView.as_view()), name='delete_document'),
    path('api/user/conversations/', csrf_exempt(views.UserConversationsView.as_view()), name='user_conversations'),
    
    # Authentification
    path('login/', auth_views.LoginView.as_view(template_name='registration/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('register/', views.register_view, name='register'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    
    path('password-reset/', views.custom_password_reset, name='password_reset'),
    path('password-reset/done/', views.custom_password_reset_done, name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='registration/password_reset_confirm.html'), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(template_name='registration/password_reset_complete.html'), name='password_reset_complete'),
    # Home
    path('', views.home_view, name='home'),
    path('dashboard/full/', views.full_dashboard_view, name='full_dashboard'),
]