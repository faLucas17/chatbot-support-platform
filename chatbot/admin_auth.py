"""
Connexion des agents à Easy Desk.

Avant : Easy Desk vérifiait l'e-mail et le mot de passe dans le navigateur
(identifiants écrits dans le code JavaScript) et l'API d'administration
répondait à n'importe qui.

Maintenant :
- l'agent se connecte avec son compte Django (is_staff), vérifié par le serveur ;
- le serveur lui donne un jeton ;
- les vues d'administration refusent toute requête sans jeton valide (401) ;
- le jeton expire au bout de ADMIN_TOKEN_DUREE_HEURES heures (12 par défaut).
"""
import os
from datetime import timedelta

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import exceptions, status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

DUREE_JETON = timedelta(hours=int(os.getenv('ADMIN_TOKEN_DUREE_HEURES', '12')))


class JetonAvecExpiration(TokenAuthentication):
    """Jeton DRF classique ("Authorization: Token xxx"), avec une durée de vie."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if timezone.now() - token.created > DUREE_JETON:
            token.delete()
            raise exceptions.AuthenticationFailed('Session expirée, reconnectez-vous.')
        return user, token


class AdminSeulement:
    """À placer avant APIView : la vue n'accepte que les agents connectés."""
    authentication_classes = [JetonAvecExpiration]
    permission_classes = [IsAdminUser]


class LimiteConnexion(AnonRateThrottle):
    # Freine les essais de mots de passe en série
    rate = '10/min'


class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [LimiteConnexion]

    def post(self, request):
        identifiant = (request.data.get('email') or request.data.get('username') or '').strip()
        mot_de_passe = request.data.get('password') or ''
        if not identifiant or not mot_de_passe:
            return Response({'error': 'Identifiant et mot de passe requis.'}, status=status.HTTP_400_BAD_REQUEST)

        # On accepte l'e-mail ou le nom d'utilisateur
        username = identifiant
        if '@' in identifiant:
            compte = User.objects.filter(email__iexact=identifiant).first()
            username = compte.username if compte else identifiant

        user = authenticate(request, username=username, password=mot_de_passe)
        if user is None or not user.is_active or not user.is_staff:
            # Même message dans tous les cas : on ne dit pas si le compte existe
            return Response({'error': 'Email ou mot de passe incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Un nouveau jeton à chaque connexion (l'ancien est invalidé)
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'email': user.email,
            'expire_dans_heures': int(DUREE_JETON.total_seconds() // 3600),
        })


class AdminLogoutView(AdminSeulement, APIView):
    def post(self, request):
        if request.auth is not None:
            request.auth.delete()
        return Response({'success': True})


class AdminMeView(AdminSeulement, APIView):
    def get(self, request):
        return Response({'username': request.user.username, 'email': request.user.email})