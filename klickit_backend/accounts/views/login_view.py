from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response

from accounts.serializers import LoginSerializer

from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema


class LoginAPIView(APIView):

    permission_classes = []

    @extend_schema(
        request=LoginSerializer,
        responses={200: None},
    )
    def post(self, request):

        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "status": True,
                "message": "Login Successful",
                "data": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "role": getattr(user, "role", ""),
                    "branch": getattr(user, "branch", "") or "",
                },
            },
            status=status.HTTP_200_OK,
        )