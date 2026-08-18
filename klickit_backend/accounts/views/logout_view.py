from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken


class LogoutAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        refresh_token = request.data.get("refresh")

        try:

            token = RefreshToken(refresh_token)

            token.blacklist()

            return Response(
                {
                    "status": True,
                    "message": "Logout Successfully",
                },
                status=status.HTTP_200_OK,
            )

        except Exception:

            return Response(
                {
                    "status": False,
                    "message": "Invalid Refresh Token",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )