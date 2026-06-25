import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-l7wj*4r0etn1xhqs5yfturbuc*t%hycbhi!izx5u-joj#@g!k*')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

# ============================================================
#  URLs DE PRODUCTION (Mises à jour)
# ============================================================
LARAVEL_URL = os.getenv('LARAVEL_URL', 'https://api-easyevent.bakeli.tech')
SUPPORT_URL = os.getenv('SUPPORT_URL', 'https://chatbot-support-platform.onrender.com')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://easy-event.bakeli.tech')

# ============================================================
#  ALLOWED_HOSTS mis à jour
# ============================================================
ALLOWED_HOSTS = [
    'chatbot-support-platform.onrender.com',
    'api-easyevent.bakeli.tech',
    'easy-event.bakeli.tech',
    'localhost',
    '127.0.0.1',
    '*',  # Pour le développement
]

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
]

# Configuration d'authentification
AUTH_USER_MODEL = 'auth.User'

LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/admin'
LOGOUT_REDIRECT_URL = '/login/'

# Django Allauth
SITE_ID = 1
ACCOUNT_LOGIN_METHODS = {'email', 'username'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']
ACCOUNT_EMAIL_VERIFICATION = 'optional'

# Crispy Forms
CRISPY_ALLOWED_TEMPLATE_PACKS = "bootstrap5"
CRISPY_TEMPLATE_PACK = "bootstrap5"

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
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

# ============================================================
# BASE DE DONNÉES - Utilise DATABASE_URL de Render
# ============================================================
DATABASES = {
    'default': dj_database_url.config(
        default='postgresql://postgres:postgres123@localhost:5432/support_platform',
        conn_max_age=600
    )
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

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL', '')

# ============================================================
#  CORS - Configuration pour production
# ============================================================
CORS_ALLOWED_ORIGINS = [
    "https://easy-event.bakeli.tech",
    "https://api-easyevent.bakeli.tech",
    "https://chatbot-support-platform.onrender.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8000",
    "http://localhost:8001",
]

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
]

# ============================================================
# CSRF TRUSTED ORIGINS - Production
# ============================================================
CSRF_TRUSTED_ORIGINS = [
    "https://api-easyevent.bakeli.tech",
    "https://easy-event.bakeli.tech",
    "https://chatbot-support-platform.onrender.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8001",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# ============================================================
# ✅ Email configuration
# ============================================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.getenv('EMAIL_HOST_USER')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')

# ============================================================
# Sécurité pour production
# ============================================================
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# ============================================================
# Logging (optionnel pour debug)
# ============================================================
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