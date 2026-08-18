import django_filters
from .models import JobSheet


class JobSheetFilter(django_filters.FilterSet):
    branch = django_filters.CharFilter(field_name="branch", lookup_expr="exact")
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    eta = django_filters.DateFilter(field_name="eta", lookup_expr="exact")
    eta_from = django_filters.DateFilter(field_name="eta", lookup_expr="gte")
    eta_to = django_filters.DateFilter(field_name="eta", lookup_expr="lte")

    class Meta:
        model = JobSheet
        fields = ["branch", "status", "eta"]
