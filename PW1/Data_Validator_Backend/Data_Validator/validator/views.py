from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
import random, json

# In-memory OTP store
otp_store = {}

# ---------------- Signup ----------------
@csrf_exempt
def signup_request(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"})

    try:
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")
        username = data.get("username") or email.split("@")[0]

        if User.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "message": "Email already registered"})

        otp = random.randint(100000, 999999)
        otp_store[email] = {"otp": str(otp), "password": password, "username": username}

        send_mail(
            "Your Verification Code",
            f"Your OTP is {otp}",
            "your_email@gmail.com",  # replace
            [email],
            fail_silently=False,
        )
        return JsonResponse({"success": True, "email": email})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ---------------- OTP Verification ----------------
@csrf_exempt
def verify_request(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"})

    try:
        data = json.loads(request.body)
        email = data.get("email")
        otp = data.get("otp")

        if email in otp_store and otp_store[email]["otp"] == otp:
            user = User.objects.create_user(
                username=otp_store[email]["username"],
                email=email,
                password=otp_store[email]["password"],
            )
            del otp_store[email]
            return JsonResponse({"success": True, "message": "Account created"})
        else:
            return JsonResponse({"success": False, "message": "Invalid OTP"})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ---------------- Login ----------------
@csrf_exempt
def login_request(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid method"})

    try:
        data = json.loads(request.body)
        email = data.get("email")
        password = data.get("password")

        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            return JsonResponse({"success": False, "message": "Invalid credentials"})

        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)  # sets session cookie
            return JsonResponse({"success": True, "message": "Login successful"})
        else:
            return JsonResponse({"success": False, "message": "Invalid credentials"})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ---------------- Logout ----------------
@csrf_exempt
def logout_request(request):
    logout(request)
    return JsonResponse({"success": True, "message": "Logged out"})


# ---------------- Check Auth ----------------
@csrf_exempt
def check_auth(request):
    print(request.user, request.user.is_authenticated)
    return JsonResponse({"isAuthenticated": request.user.is_authenticated})

@login_required
def get_user(request):
    print(request.user.username)
    return JsonResponse({"username": request.user.username})
