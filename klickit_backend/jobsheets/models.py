from django.db import models
from django.contrib.auth.models import AbstractUser


class Branch(models.TextChoices):
    ANDHERI = "Andheri", "Andheri"
    THANE = "Thane", "Thane"
    DADAR = "Dadar", "Dadar"
    VASHI = "Vashi", "Vashi"


class JobStatus(models.TextChoices):
    PENDING = "Pending", "Pending"
    READY = "Ready", "Ready"
    APPROVED_PENDING = "Approved Pending", "Approved Pending"
    APPROVED = "Approved", "Approved"
    CLOSED = "Closed", "Closed"
    REJECTED = "Rejected", "Rejected"


# 👇 NEW: Advance Paid Choices
class AdvancePaidStatus(models.TextChoices):
    PAID = "Paid", "Paid"
    UNPAID = "Unpaid", "Unpaid"
    NA = "NA", "Not Applicable"


class JobSheet(models.Model):
    job_no = models.CharField(
        max_length=50,
        unique=True,
        help_text="e.g. 20320018110",
    )
    branch = models.CharField(max_length=20, choices=Branch.choices)
    assigned_by = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Employee who assigned the job",
    )
    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.PENDING,
    )
    created_date = models.DateField(help_text="Submission date")
    eta = models.DateField(help_text="Submit ETA date")
    approved_eta = models.DateField(
        null=True,
        blank=True,
        help_text="Approved ETA date",
    )
    
    # 👇 UPDATED: CharField with choices
    advance_paid = models.CharField(
        max_length=10,
        choices=AdvancePaidStatus.choices,
        default=AdvancePaidStatus.UNPAID,
        help_text="Advance payment status: Paid, Unpaid, or NA"
    )
    
    # 👇 Repair Status Field
    is_repaired = models.BooleanField(
        default=False,
        null=True,
        blank=True,
        help_text="Mark as repaired for Closed status, or unrepaired for Rejected status"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Job Sheet"
        verbose_name_plural = "Job Sheets"

    def __str__(self):
        return f"{self.job_no} · {self.branch} · {self.status}"