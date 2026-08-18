from django.urls import path

from .views_apiview import (
    JobSheetListCreateAPIView,
    JobSheetDetailAPIView,
    JobSheetStatsAPIView,
    BranchCountAPIView,
)
from .views_generics import (
    JobSheetListCreateGenericView,
    JobSheetDetailGenericView,
    JobSheetStatsGenericView,
    BranchCountGenericView,
)

urlpatterns = [
    # ---------- APIView style (manual) ----------
    path("apiview/jobsheets/", JobSheetListCreateAPIView.as_view(), name="apiview-jobsheet-list"),
    path("apiview/jobsheets/<int:pk>/", JobSheetDetailAPIView.as_view(), name="apiview-jobsheet-detail"),
    path("apiview/jobsheets/stats/", JobSheetStatsAPIView.as_view(), name="apiview-jobsheet-stats"),
    path("apiview/branches/", BranchCountAPIView.as_view(), name="apiview-branch-count"),

    # ---------- Generic view style (concise) ----------
    path("generic/jobsheets/", JobSheetListCreateGenericView.as_view(), name="generic-jobsheet-list"),
    path("generic/jobsheets/<int:pk>/", JobSheetDetailGenericView.as_view(), name="generic-jobsheet-detail"),
    path("generic/jobsheets/stats/", JobSheetStatsGenericView.as_view(), name="generic-jobsheet-stats"),
    path("generic/branches/", BranchCountGenericView.as_view(), name="generic-branch-count"),
]
