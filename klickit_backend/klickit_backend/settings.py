"""
Django settings for klickit_backend project.
KLICKIT Job Sheet Dashboard — backend for the job-sheet tracker frontend.
"""

from pathlib import Path
from datetime import timedelta
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# SECURITY
# ---------------------------------------------------------------------------
SECRET_KEY = "django-insecure-CHANGE-THIS-KEY-BEFORE-DEPLOYMENT"

# DEBUG = False
# DEBUG = False
DEBUG = True

ALLOWED_HOSTS = [
    "thirdpartyboseservice.com",
    "www.thirdpartyboseservice.com",
    "127.0.0.1",
    "localhost",
]

AUTH_USER_MODEL = "accounts.User"
# ---------------------------------------------------------------------------
# APPLICATIONS
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "drf_spectacular",

    # third party
    "rest_framework",
    "corsheaders",
    "django_filters",

    # local apps
    "jobsheets",
    "accounts",
    "rest_framework_simplejwt.token_blacklist",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # must sit high, before CommonMiddleware
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "klickit_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "klickit_backend.wsgi.application"

# ---------------------------------------------------------------------------
# DATABASE  (SQLite for dev — swap to Postgres in prod, see comment below)
# ---------------------------------------------------------------------------
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.sqlite3",
#         "NAME": BASE_DIR / "db.sqlite3",
#     }
    
DATABASES = {
'default': {
'ENGINE': 'django.db.backends.mysql',
'NAME': 'shivam_db',
'USER': 'shivam',
'PASSWORD': 'ShivamPassword123!',
'HOST': 'localhost',
'PORT': '3306',
}
}

    # Production example (Postgres):
    # "default": {
    #     "ENGINE": "django.db.backends.postgresql",
    #     "NAME": "klickit",
    #     "USER": "klickit_user",
    #     "PASSWORD": "changeme",
    #     "HOST": "localhost",
    #     "PORT": "5432",
    # }


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# I18N
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# DJANGO REST FRAMEWORK
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10000,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=24),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
}

# ---------------------------------------------------------------------------
# CORS  (frontend runs on a different origin — e.g. localhost:5500, Vite, etc.)
# ---------------------------------------------------------------------------
# CORS_ALLOW_ALL_ORIGINS = True  # dev only
# CORS_ALLOW_ALL_ORIGINS = True  # dev only
CORS_ALLOWED_ORIGINS = [
    "https://thirdpartyboseservice.com",
    "https://www.thirdpartyboseservice.com",

]

CSRF_TRUSTED_ORIGINS = [
    "https://thirdpartyboseservice.com",
    "https://www.thirdpartyboseservice.com",
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")