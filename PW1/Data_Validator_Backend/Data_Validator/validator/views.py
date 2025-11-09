from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.core.mail import send_mail
from django.http import JsonResponse, StreamingHttpResponse, Http404, FileResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.urls import reverse
import os, uuid, traceback, json, threading, time, re, shutil
from queue import Queue, Empty
import sys
from contextlib import redirect_stdout, redirect_stderr
import random


# simple in-memory job store: job_id -> {"queue": Queue(), "done": bool}
JOB_STORE = {}
otp_store = {}
validation_store = {}
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

@csrf_exempt
def upload_and_validate(request):
    """
    Accepts POST multipart/form-data with input name 'file' and optional 'config' form field.
    Saves the uploaded CSV and runs the PrivacyPreservingValidator, then returns the final report JSON.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=400)

    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return JsonResponse({"error": "No file provided"}, status=400)

    upload_dir = os.path.join(settings.BASE_DIR, "validator", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}_{uploaded_file.name}"
    saved_path = os.path.join(upload_dir, filename)

    try:
        with open(saved_path, "wb+") as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)
    except Exception as e:
        return JsonResponse({"error": f"Failed to save file: {e}"}, status=500)

    # optional config (not used by main validator directly yet)
    config_json = request.POST.get("config")
    user_config_override = None
    if config_json:
        try:
            user_config_override = json.loads(config_json)
        except Exception:
            # ignore invalid config for now but inform client
            user_config_override = None

    try:
        # import here to avoid circular imports at module load time
        from .privacy_preserving_framework.main import PrivacyPreservingValidator

        validator = PrivacyPreservingValidator(saved_path)
        # Run synchronously for now; run() now returns a report dict when possible
        report = validator.run(max_iters=6)
        print(report)
        # Ensure JSON-serializable (coerce to strings where needed)
        try:
            safe_report = json.loads(json.dumps(report, default=str))
        except Exception:
            safe_report = {"report_raw": str(report)}

        # Get the transformed dataset path
        transformed_path = None
        try:
            out_dir = os.path.dirname(saved_path) or "."
            base = os.path.splitext(os.path.basename(saved_path))[0]
            out_name = f"{base}_privacy_enforced.csv"
            transformed_path = os.path.join(out_dir, out_name)
            # Check if file exists
            if not os.path.exists(transformed_path):
                transformed_path = None
        except Exception:
            transformed_path = None

        # Generate a unique ID for this validation session
        validation_id = uuid.uuid4().hex
        # Store the transformed path and report in a temporary store
        validation_store[validation_id] = {
            "transformed_path": transformed_path,
            "report": safe_report,
            "original_filename": uploaded_file.name
        }

        return JsonResponse({
            "status": "ok", 
            "report": safe_report,
            "validation_id": validation_id
        })
    except Exception as e:
        traceback_str = traceback.format_exc()
        return JsonResponse({"error": str(e), "traceback": traceback_str}, status=500)


@csrf_exempt
def download_transformed_dataset(request, validation_id):
    """Download the transformed dataset CSV file."""
    if validation_id not in validation_store:
        return JsonResponse({"error": "Validation session not found"}, status=404)
    
    validation_data = validation_store[validation_id]
    transformed_path = validation_data.get("transformed_path")
    
    if not transformed_path or not os.path.exists(transformed_path):
        return JsonResponse({"error": "Transformed dataset not found"}, status=404)
    
    try:
        original_filename = validation_data.get("original_filename", "dataset.csv")
        base_name = os.path.splitext(os.path.basename(original_filename))[0]
        download_filename = f"{base_name}_privacy_enforced.csv"
        
        response = FileResponse(
            open(transformed_path, 'rb'),
            as_attachment=True,
            filename=download_filename,
            content_type='text/csv'
        )
        return response
    except Exception as e:
        return JsonResponse({"error": f"Failed to download file: {str(e)}"}, status=500)


@csrf_exempt
def download_report(request, validation_id):
    """Download the validation report as PDF."""
    if validation_id not in validation_store:
        return JsonResponse({"error": "Validation session not found"}, status=404)
    
    validation_data = validation_store[validation_id]
    report = validation_data.get("report")
    
    if not report:
        return JsonResponse({"error": "Report not found"}, status=404)
    
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from io import BytesIO
        import base64
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#222'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#222'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        # Add logo if available
        logo_path = os.path.join(settings.BASE_DIR, "..", "Data_Validator_Frontend", "public", "logo.png")
        if os.path.exists(logo_path):
            try:
                logo = Image(logo_path, width=2*inch, height=2*inch)
                logo.hAlign = 'CENTER'
                story.append(logo)
                story.append(Spacer(1, 0.2*inch))
            except Exception:
                pass
        
        # Title
        story.append(Paragraph("Privacy Validation Report", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Dataset Information
        if report.get("dataset_name") or report.get("dataset_rows") or report.get("dataset_columns"):
            story.append(Paragraph("Dataset Information", heading_style))
            dataset_info = []
            if report.get("dataset_name"):
                dataset_info.append(["Dataset Name:", report["dataset_name"]])
            if report.get("dataset_rows") is not None:
                dataset_info.append(["Number of Rows:", str(report["dataset_rows"])])
            if report.get("dataset_columns") is not None:
                dataset_info.append(["Number of Columns:", str(report["dataset_columns"])])
            
            if dataset_info:
                dataset_table = Table(dataset_info, colWidths=[2*inch, 4*inch])
                dataset_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f5f5f5')),
                    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333')),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
                ]))
                story.append(dataset_table)
                story.append(Spacer(1, 0.2*inch))
        
        # Summary Metrics
        story.append(Paragraph("Privacy & Utility Summary", heading_style))
        summary_data = [["Metric", "Before", "After"]]
        
        # PES
        before_pes = report.get("before_pes", {})
        before_pes_val = before_pes.get("PES") or before_pes.get("score") or "N/A"
        if isinstance(before_pes_val, (int, float)):
            before_pes_val = f"{before_pes_val:.4f}"
        
        after_pes = report.get("after_pes", {})
        if isinstance(after_pes, dict):
            after_pes_val = after_pes.get("PES") or after_pes.get("score") or "N/A"
        else:
            after_pes_val = after_pes if after_pes is not None else "N/A"
        if isinstance(after_pes_val, (int, float)):
            after_pes_val = f"{after_pes_val:.4f}"
        
        summary_data.append(["Privacy Exposure Score (PES)", str(before_pes_val), str(after_pes_val)])
        
        # Utility
        initial_utility = report.get("initial_utility")
        final_utility = report.get("final_utility")
        summary_data.append([
            "Utility Score",
            f"{initial_utility:.4f}" if initial_utility is not None else "N/A",
            f"{final_utility:.4f}" if final_utility is not None else "N/A"
        ])
        
        summary_table = Table(summary_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#303030')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Techniques Applied
        if report.get("techniques_applied"):
            story.append(Paragraph("Privacy Techniques Applied", heading_style))
            techniques_data = [["Technique", "Parameters"]]
            technique_config = report.get("technique_config", [])
            for idx, tech in enumerate(report["techniques_applied"]):
                params = technique_config[idx] if idx < len(technique_config) else {}
                params_str = ", ".join([f"{k}: {v}" for k, v in params.items()]) if params else "No parameters"
                techniques_data.append([tech, params_str])
            
            tech_table = Table(techniques_data, colWidths=[2*inch, 4*inch])
            tech_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5f5f5')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e0e0e0')),
            ]))
            story.append(tech_table)
            story.append(Spacer(1, 0.3*inch))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        original_filename = validation_data.get("original_filename", "dataset.csv")
        base_name = os.path.splitext(os.path.basename(original_filename))[0]
        download_filename = f"{base_name}_validation_report.pdf"
        
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{download_filename}"'
        return response
        
    except ImportError:
        # If reportlab is not installed, return JSON report instead
        import json
        original_filename = validation_data.get("original_filename", "dataset.json")
        base_name = os.path.splitext(os.path.basename(original_filename))[0]
        download_filename = f"{base_name}_validation_report.json"
        
        response = HttpResponse(
            json.dumps(report, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{download_filename}"'
        return response
    except Exception as e:
        return JsonResponse({"error": f"Failed to generate report: {str(e)}"}, status=500)

# @csrf_exempt
# def upload_and_run(request):
#     """
#     Accepts a POST file upload (input name 'file'), optional form field 'config' (JSON string),
#     saves file under validator/uploads/, runs PrivacyEngine and returns JSON.
#     """
#     if request.method != "POST":
#         return JsonResponse({"error": "POST required"}, status=400)

#     uploaded_file = request.FILES.get("file")
#     if not uploaded_file:
#         return JsonResponse({"error": "No file provided"}, status=400)

#     upload_dir = os.path.join(settings.BASE_DIR, "validator", "uploads")
#     os.makedirs(upload_dir, exist_ok=True)
#     filename = f"{uuid.uuid4().hex}_{uploaded_file.name}"
#     saved_path = os.path.join(upload_dir, filename)

#     with open(saved_path, "wb+") as f:
#         for chunk in uploaded_file.chunks():
#             f.write(chunk)

#     # parse optional user config JSON from form field 'config'
#     config_json = request.POST.get("config")
#     user_config_override = None
#     if config_json:
#         try:
#             user_config_override = json.loads(config_json)
#         except Exception:
#             return JsonResponse({"error": "Invalid JSON in 'config' field"}, status=400)

#     try:
#         engine = PrivacyEngine(raw_data_path=saved_path)
#         fernet = engine.load_or_create_encryption_key()
#         df_original, _ = engine.load_dataset(fernet)

#         # create preview: first 5 rows, fill NaNs with empty strings to ensure JSON serializable
#         try:
#             preview = df_original.head(5).fillna("").to_dict(orient="records")
#         except Exception:
#             preview = []  # fallback if df is not a pandas DataFrame

#         # infer defaults
#         direct, quasi, sensitive = engine.infer_attribute_categories(df_original)

#         # build default config and merge overrides if provided
#         default_config = {
#             "direct_identifiers": direct,
#             "quasi_identifiers": quasi,
#             "sensitive_attributes": sensitive,
#             "target_label": Config.TARGET_LABEL_HINT,
#             "weights": {"direct": Config.WEIGHT_DIRECT, "quasi": Config.WEIGHT_QUASI, "sensitive": Config.WEIGHT_SENSITIVE},
#             "alpha": Config.DEFAULT_ALPHA, "epsilon": Config.DEFAULT_EPSILON, "delta": Config.DEFAULT_DELTA,
#             "k_threshold": Config.DEFAULT_K, "l_threshold": Config.DEFAULT_L, "t_threshold": Config.DEFAULT_T,
#             "utility_gamma": {"retention": Config.GAMMA_RETENTION, "fidelity": Config.GAMMA_FIDELITY, "target": Config.GAMMA_TARGET},
#             "consent": "no",
#         }

#         if user_config_override:
#             # shallow-merge; override top-level keys; keep nested weights/utility_gamma if present
#             for k, v in user_config_override.items():
#                 default_config[k] = v
#         user_config = default_config

#         sensitivity_scores = engine.compute_sensitivity_score(df_original, user_config)
#         df_enforced, applied_methods, risk_history = engine.enforce_privacy_adaptive(df_original, user_config, sensitivity_scores)

#         compliant = engine.check_compliance(user_config, risk_history[-1], user_config.get("alpha", Config.DEFAULT_ALPHA))
#         df_enforced = engine.remove_fully_redacted_columns(df_enforced)
#         engine.save_dataset_chunks(df_enforced, engine.processed_path)

#         report = engine.generate_summary_report(df_original, df_enforced, user_config, sensitivity_scores, risk_history, applied_methods, compliant, engine.processed_path)

#         return JsonResponse({
#             "status": "ok",
#             "report": report,
#             "processed_path": engine.processed_path,
#             "compliant": bool(compliant),
#             "preview": preview,
#         })
#     except Exception as e:
#         traceback_str = traceback.format_exc()
#         return JsonResponse({"error": str(e), "traceback": traceback_str}, status=500)

# @csrf_exempt
# def upload_and_start(request):
#     """
#     Save uploaded file, create job, start background thread that runs PrivacyEngine.
#     Returns: job_id and initial preview (if available)
#     """
#     if request.method != "POST":
#         return JsonResponse({"error": "POST required"}, status=400)

#     uploaded_file = request.FILES.get("file")
#     if not uploaded_file:
#         return JsonResponse({"error": "No file provided"}, status=400)

#     upload_dir = os.path.join(settings.BASE_DIR, "validator", "uploads")
#     os.makedirs(upload_dir, exist_ok=True)
#     filename = f"{uuid.uuid4().hex}_{uploaded_file.name}"
#     saved_path = os.path.join(upload_dir, filename)

#     with open(saved_path, "wb+") as f:
#         for chunk in uploaded_file.chunks():
#             f.write(chunk)

#     config_json = request.POST.get("config")
#     user_config_override = None
#     if config_json:
#         try:
#             user_config_override = json.loads(config_json)
#         except Exception:
#             return JsonResponse({"error": "Invalid JSON in 'config' field"}, status=400)

#     job_id = uuid.uuid4().hex
#     q = Queue()
#     JOB_STORE[job_id] = {"queue": q, "done": False, "status": "Queued", "processed_path": None, "compliant": None}

#     # start background thread
#     t = threading.Thread(target=run_privacy_job, args=(job_id, saved_path, user_config_override), daemon=True)
#     t.start()

#     return JsonResponse({"job_id": job_id})

# def job_status(request, job_id):
#     job = JOB_STORE.get(job_id)
#     if not job:
#         return JsonResponse({"error": "Job not found"}, status=404)
#     download_url = None
#     if job.get("zip_path"):
#         try:
#             download_url = request.build_absolute_uri(reverse('validate_download', args=[job_id]))
#         except Exception:
#             download_url = f"/api/validate/download/{job_id}/"
#     return JsonResponse({
#         "job_id": job_id,
#         "status": job.get("status", "Unknown"),
#         "done": bool(job.get("done")),
#         "processed_path": job.get("processed_path"),
#         "compliant": job.get("compliant"),
#         "download_url": download_url,
#     })

# def job_report(request, job_id):
#     job = JOB_STORE.get(job_id)
#     if not job:
#         return JsonResponse({"error": "Job not found"}, status=404)
#     processed_path = job.get("processed_path")
#     if not processed_path:
#         return JsonResponse({"error": "Report not ready"}, status=400)
#     report_file = os.path.join(processed_path, "privacy_report.json")
#     if not os.path.exists(report_file):
#         return JsonResponse({"error": "Report file missing"}, status=404)
#     try:
#         with open(report_file, "r") as f:
#             report_json = json.load(f)
#         return JsonResponse(report_json)
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=500)

# def download_zip(request, job_id):
#     job = JOB_STORE.get(job_id)
#     if not job:
#         return JsonResponse({"error": "Job not found"}, status=404)
#     zip_path = job.get("zip_path")
#     if not zip_path or not os.path.exists(zip_path):
#         return JsonResponse({"error": "Archive not available"}, status=404)
#     try:
#         response = FileResponse(open(zip_path, 'rb'), as_attachment=True, filename=os.path.basename(zip_path))
#         return response
#     except Exception as e:
#         return JsonResponse({"error": str(e)}, status=500)

# def sse_events(request, job_id):
#     """
#     SSE endpoint that streams messages for the given job_id.
#     Format: SSE data: <json>\n\n
#     """
#     job = JOB_STORE.get(job_id)
#     if not job:
#         raise Http404("Job not found")

#     q = job["queue"]

#     def event_stream():
#         # keep streaming until job marked done AND queue empty for a short timeout
#         while True:
#             try:
#                 msg = q.get(timeout=0.5)
#             except Empty:
#                 if job.get("done"):
#                     break
#                 continue
#             # send JSON-encoded message as SSE 'data'
#             try:
#                 data = json.dumps(msg, default=str)
#             except Exception:
#                 data = json.dumps({"type": "log", "text": str(msg)})
#             yield f"data: {data}\n\n"
#         # final ping to indicate stream end
#         yield f"data: {json.dumps({'type':'closed'})}\n\n"

#     response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
#     response['Cache-Control'] = 'no-cache'
#     response['X-Accel-Buffering'] = 'no'  # disable buffering for nginx
#     return response
