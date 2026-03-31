from django.urls import path
from . import views

urlpatterns = [
    path('api/message/', views.SendMessageView.as_view(), name='send_message'),
    path('api/conversation/<int:conversation_id>/', views.ConversationDetailView.as_view(), name='conversation_detail'),
]