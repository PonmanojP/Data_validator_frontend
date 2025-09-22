from django.urls import path
from . import views

urlpatterns = [
    path("api/signup/", views.signup_request),
    path("api/verify/", views.verify_request),
    path("api/login/", views.login_request),
    path("api/check-auth/", views.check_auth),
    path("api/user/", views.get_user, name="get_user"),
]
