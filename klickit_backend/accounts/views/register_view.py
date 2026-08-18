from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.serializers import RegisterSerializer

from drf_spectacular.utils import extend_schema


class RegisterAPIView(APIView):

    permission_classes = []

    @extend_schema(
        request=RegisterSerializer,
        responses={200: None},
    )
    def post(self, request):

        serializer = RegisterSerializer(
            data=self.request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {
                "status": True,
                "message": "User registered successfully",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )