from django.urls import path
from . import views

urlpatterns = [
    path("api/signup/", views.signup_request),
    path("api/verify/", views.verify_request),
    path("api/login/", views.login_request),
    path("api/check-auth/", views.check_auth),
    path("api/user/", views.get_user, name="get_user"),
    path("validate/upload/", views.upload_and_validate, name="validate_upload"),
    path("validate/download-dataset/<str:validation_id>/", views.download_transformed_dataset, name="download_dataset"),
    path("validate/download-report/<str:validation_id>/", views.download_report, name="download_report"),
]
