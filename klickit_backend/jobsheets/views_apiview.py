"""
APIView-based endpoints.

This is the "manual" DRF style — you write get()/post()/put()/delete()
yourself, so you have full control over each step (filtering, validation,
response shape). Good to know for cases where a generic view doesn't fit.
"""

from datetime import date, timedelta

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import JobSheet, Branch, JobStatus
from .serializers import JobSheetSerializer, JobSheetStatsSerializer
from accounts.permissions import IsAdminOrBranchUser


class JobSheetListCreateAPIView(APIView):
    """
    GET  /api/apiview/jobsheets/           -> list (supports ?branch=&status=&eta=&search=)
    POST /api/apiview/jobsheets/           -> create
    """

    permission_classes = [IsAdminOrBranchUser]

    def get(self, request):
        queryset = JobSheet.objects.all()
        if request.user.role not in ["admin", "viewer"] and getattr(request.user, "branch", None):

        # if request.user.role != "admin" and getattr(request.user, "branch", None):
            queryset = queryset.filter(branch=request.user.branch)

        branch = request.query_params.get("branch")
        if branch and branch != "All":
            queryset = queryset.filter(branch=branch)

        job_status = request.query_params.get("status")
        if job_status and job_status != "All":
            queryset = queryset.filter(status=job_status)

        eta_filter = request.query_params.get("eta")  # "Today" | "Tomorrow"
        if eta_filter == "Today":
            queryset = queryset.filter(eta=date.today())
        elif eta_filter == "Tomorrow":
            queryset = queryset.filter(eta=date.today() + timedelta(days=1))

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(job_no__icontains=search)

        serializer = JobSheetSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = JobSheetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JobSheetDetailAPIView(APIView):
    """
    GET    /api/apiview/jobsheets/<pk>/    -> retrieve
    PUT    /api/apiview/jobsheets/<pk>/    -> full update
    PATCH  /api/apiview/jobsheets/<pk>/    -> partial update
    DELETE /api/apiview/jobsheets/<pk>/    -> delete
    """

    permission_classes = [IsAdminOrBranchUser]

    def get_object(self, pk):
        return get_object_or_404(JobSheet, pk=pk)

    def get(self, request, pk):
        job = self.get_object(pk)
        self.check_object_permissions(request, job)
        serializer = JobSheetSerializer(job)
        return Response(serializer.data)

    def put(self, request, pk):
        job = self.get_object(pk)
        self.check_object_permissions(request, job)
        serializer = JobSheetSerializer(job, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        job = self.get_object(pk)
        self.check_object_permissions(request, job)
        serializer = JobSheetSerializer(job, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        job = self.get_object(pk)
        self.check_object_permissions(request, job)
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class JobSheetStatsAPIView(APIView):
    """
    GET /api/apiview/jobsheets/stats/  -> counts that feed the stat cards + chips
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
        serializer = JobSheetStatsSerializer(data)
        return Response(serializer.data)


class BranchCountAPIView(APIView):
    """
    GET /api/apiview/branches/  -> per-branch counts for the sidebar branch list
    """

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
