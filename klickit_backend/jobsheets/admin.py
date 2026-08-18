from django.contrib import admin
from .models import JobSheet


@admin.register(JobSheet)
class JobSheetAdmin(admin.ModelAdmin):
    list_display = ("job_no", "branch", "status", "advance_paid", "is_repaired", "created_date", "eta", "updated_at")
    list_filter = ("branch", "status", "advance_paid", "is_repaired")
    search_fields = ("job_no",)
    ordering = ("-created_at",)
