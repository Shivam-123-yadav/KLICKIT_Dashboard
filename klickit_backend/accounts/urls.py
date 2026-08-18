from django.urls import path

from accounts.views import (
    RegisterAPIView,
    LoginAPIView,
    LogoutAPIView,
    EmployeeListAPIView,
)


urlpatterns = [

    path(
        "register/",
        RegisterAPIView.as_view(),
        name="register",
    ),

    path(
        "login/",
        LoginAPIView.as_view(),
        name="login",
    ),

    path(
        "logout/",
        LogoutAPIView.as_view(),
        name="logout",
    ),

    path(
        "employees/",
        EmployeeListAPIView.as_view(),
        name="employees",
    ),

]