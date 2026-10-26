import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-l7wj*4r0etn1xhqs5yfturbuc*t%hycbhi!izx5u-joj#@g!k*')

DEBUG = os.getenv('DEBUG', 'False') == 'True'

LARAVEL_URL = os.getenv('LARAVEL_URL', 'https://api-easyevent.bakeli.tech')
EASYCOOP_API_URL = os.getenv('EASYCOOP_API_URL', 'https://easy-coop-api.onrender.com')
SUPPORT_URL = os.getenv('SUPPORT_URL', 'https://support-platform-admin.onrender.com')


ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'rest_framework',
    'corsheaders',
    'chatbot',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'crispy_forms',
    'crispy_bootstrap5',
    'rest_framework.authtoken',
]

AUTH_USER_MODEL = 'auth.User'
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/admin'
LOGOUT_REDIRECT_URL = '/login/'

SITE_ID = 1
ACCOUNT_LOGIN_METHODS = {'email', 'username'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']
ACCOUNT_EMAIL_VERIFICATION = 'optional'

CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'support_platform.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'support_platform.wsgi.application'

# Base de données : Render fournit DATABASE_URL automatiquement
DATABASE_URL = os.getenv('DATABASE_URL')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'support_platform',
            'USER': 'postgres',
            'PASSWORD': 'postgres123',
            'HOST': 'localhost',
            'PORT': '5432',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL', '')

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-support-username',
    'x-api-key',
]

CSRF_TRUSTED_ORIGINS = [
    'https://support-platform-api-0h06.onrender.com',
    'https://support-platform-admin.onrender.com',
    'https://easy-event.bakeli.tech',
    'https://api-easyevent.bakeli.tech',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
]

# ============================================================
# E-MAILS : API HTTP de Brevo
# Render (offre gratuite) bloque les ports SMTP sortants (25, 465, 587).
# On passe donc par l'API HTTPS de Brevo (port 443), qui n'est pas bloquée.
# Variables à définir sur Render :
#   BREVO_API_KEY       clé d'API Brevo (commence par "xkeysib-"), PAS la clé SMTP
#   BREVO_SENDER_EMAIL  adresse d'expéditeur VALIDÉE dans Brevo (Senders & IP)
#   BREVO_SENDER_NAME   nom affiché (facultatif)
#   ADMIN_EMAIL         adresse qui reçoit les escalades
# ============================================================
BREVO_API_KEY = os.getenv('BREVO_API_KEY', '')
BREVO_SENDER_EMAIL = os.getenv('BREVO_SENDER_EMAIL', '')
BREVO_SENDER_NAME = os.getenv('BREVO_SENDER_NAME', 'Easy Desk Support')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

# SMTP gardé seulement pour le local (réinitialisation de mot de passe, etc.)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = BREVO_SENDER_EMAIL or EMAIL_HOST_USER

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

DISCORD_WEBHOOK_EASYCOOP = os.getenv('DISCORD_WEBHOOK_EASYCOOP', '')