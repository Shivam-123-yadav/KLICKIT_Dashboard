from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    
    ROLE_CHOICE = (
        ("admin", "Admin"),
        ("branch_user", "Branch User"),
        ("viewer", "Viewer"),
    )
    
    BRANCH_CHOICE = (
        ("Andheri", "Andheri"),
        ("Thane", "Thane"),
        ("Dadar", "Dadar"),
        ("Vashi", "Vashi")
    )
    
    phone = models.CharField(max_length=15, blank= True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICE, default="branch_user")
    branch = models.CharField(max_length=20, choices=BRANCH_CHOICE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.username