from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


User = get_user_model()


class EmployeeListAPIView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        branch = request.query_params.get("branch") or getattr(request.user, "branch", None)

        if branch:
            users = User.objects.filter(branch=branch)
        else:
            users = User.objects.none()

        data = [
            {"username": user.username, "fullName": user.get_full_name() or user.username}
            for user in users
        ]
        return Response(data)
