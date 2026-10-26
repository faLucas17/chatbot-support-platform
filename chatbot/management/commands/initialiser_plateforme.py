"""
Recrée les données de base après la création d'une nouvelle base de données.

Utilisation (dans la "Build Command" de Render, ou en local) :
    python manage.py initialiser_plateforme

La commande peut être lancée plusieurs fois sans risque : elle ne crée que
ce qui manque.

Variables d'environnement utilisées :
    EASYEVENT_TENANT_KEY   clé d'API utilisée par le widget d'Easy Event (obligatoire)
    EASYCOOP_TENANT_KEY    clé d'API utilisée par le widget d'EasyCoop (défaut : easycoop-2026)
    DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD
                           compte d'accès à /admin (facultatif)
"""
import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from chatbot.models import Tenant


class Command(BaseCommand):
    help = "Crée les tenants Easy Events et EasyCoop, et le super-utilisateur, s'ils n'existent pas."

    def handle(self, *args, **options):
        tenants = [
            ("Easy Events", os.getenv("EASYEVENT_TENANT_KEY", "")),
            ("EasyCoop", os.getenv("EASYCOOP_TENANT_KEY", "easycoop-2026")),
        ]
        for nom, cle in tenants:
            if not cle:
                self.stdout.write(self.style.WARNING(f"Clé manquante pour {nom} : tenant non créé."))
                continue
            tenant, cree = Tenant.objects.get_or_create(api_key=cle, defaults={"name": nom})
            etat = "créé" if cree else "déjà présent"
            self.stdout.write(self.style.SUCCESS(f"Tenant {tenant.name} ({cle}) : {etat}"))

        username = os.getenv("DJANGO_SUPERUSER_USERNAME")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD")
        email = os.getenv("DJANGO_SUPERUSER_EMAIL", "")
        if username and password:
            if User.objects.filter(username=username).exists():
                self.stdout.write(f"Super-utilisateur {username} : déjà présent")
            else:
                User.objects.create_superuser(username=username, email=email, password=password)
                self.stdout.write(self.style.SUCCESS(f"Super-utilisateur {username} : créé"))
        else:
            self.stdout.write("Pas de DJANGO_SUPERUSER_USERNAME / PASSWORD : super-utilisateur ignoré.")