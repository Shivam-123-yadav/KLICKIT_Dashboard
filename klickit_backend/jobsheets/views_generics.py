"""
Generic-view-based endpoints.

DRF's generics.* classes already implement get()/post()/etc for you based
on a queryset + serializer_class. Less code, but less control than APIView
— great for standard CRUD, which is exactly what job sheets need.
"""

from datetime import date, timedelta

from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import JobSheet, Branch, JobStatus
from .serializers import JobSheetSerializer, JobSheetStatsSerializer
from .filters import JobSheetFilter
from accounts.permissions import IsAdminOrBranchUser


class JobSheetListCreateGenericView(generics.ListCreateAPIView):
    """
    GET  /api/generic/jobsheets/   -> list, filterable via query params:
                                       ?branch=Andheri&status=Pending&eta=2026-08-08&search=2032
    POST /api/generic/jobsheets/   -> create
    """
    permission_classes = [IsAdminOrBranchUser]
    queryset = JobSheet.objects.all()
    serializer_class = JobSheetSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = JobSheetFilter
    search_fields = ["job_no", "branch", "status"]
    ordering_fields = ["created_date", "eta", "created_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.role != "admin" and getattr(self.request.user, "branch", None) and self.request.user.branch != "Andheri":
        # if self.request.user.role != "admin" and getattr(self.request.user, "branch", None):
            queryset = queryset.filter(branch=self.request.user.branch)
        return queryset


class JobSheetDetailGenericView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/PATCH/DELETE  /api/generic/jobsheets/<pk>/
    """
    permission_classes = [IsAdminOrBranchUser]
    queryset = JobSheet.objects.all()
    serializer_class = JobSheetSerializer
    lookup_field = "pk"


class JobSheetStatsGenericView(APIView):
    """
    GET /api/generic/jobsheets/stats/
    (Stats aren't naturally a queryset-of-a-model, so this stays a plain
    APIView even in the "generics" module — that's normal in real projects.)
    """

    permission_classes = [IsAdminOrBranchUser]

    def get(self, request):
        qs = JobSheet.objects.all()
        
        if request.user.role != "admin" and getattr(request.user, "branch", None) and request.user.branch != "Andheri":
        # if request.user.role != "admin" and getattr(request.user, "branch", None):
            qs = qs.filter(branch=request.user.branch)
        today = date.today()
        tomorrow = today + timedelta(days=1)

        data = {
            "total": qs.count(),
            "pending": qs.filter(status=JobStatus.PENDING).count(),
            "ready": qs.filter(status=JobStatus.READY).count(),
            "approved_pending": qs.filter(status=JobStatus.APPROVED_PENDING).count(),
            "approved": qs.filter(status=JobStatus.APPROVED).count(),
            "closed": qs.filter(status=JobStatus.CLOSED).count(),
            "rejected": qs.filter(status=JobStatus.REJECTED).count(),
            "today_eta": qs.filter(eta=today).count(),
            "tomorrow_eta": qs.filter(eta=tomorrow).count(),
        }
        return Response(JobSheetStatsSerializer(data).data)


class BranchCountGenericView(APIView):
    """GET /api/generic/branches/"""

    permission_classes = [IsAdminOrBranchUser]

    def get(self, request):
        qs = JobSheet.objects.all()
        
        if request.user.role != "admin" and getattr(request.user, "branch", None) and request.user.branch != "Andheri":
        # if request.user.role != "admin" and getattr(request.user, "branch", None):
            qs = qs.filter(branch=request.user.branch)
        data = [
            {"branch": b.value, "count": qs.filter(branch=b.value).count()}
            for b in Branch
        ]
        return Response(data)
