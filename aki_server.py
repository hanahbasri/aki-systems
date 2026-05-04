import os
import uuid
import json
import tempfile
import traceback
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from supabase import create_client, Client

from aki_engine import AKIInput, ProductLine, CapexInput, calculate_aki
from aki_ai_reco import get_ai_recommendations
from aki_pdf_gen import generate_pdf

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5173",
                   os.getenv("FRONTEND_URL", "")])

# ── Supabase client ───────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Supabase env missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) in .env."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

OUTPUT_DIR = Path(tempfile.gettempdir()) / "aki_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)


# ── Auth middleware ───────────────────────────────────────────────────────────
def get_current_user(req):
    """Verify JWT from Authorization header, return user + profile."""
    auth = req.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, None
    token = auth.split(" ")[1]
    try:
        # Verify token with Supabase
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            return None, None

        profile_data = None
        try:
            profile = supabase.table("profiles").select("*").eq("id", user.user.id).single().execute()
            profile_data = profile.data
        except Exception:
            profile_data = None

        # Fallback: allow login even if profiles row doesn't exist yet (e.g. first OAuth login)
        if not profile_data:
            meta = getattr(user.user, "user_metadata", None) or {}
            profile_data = {
                "id": user.user.id,
                "full_name": meta.get("full_name") or meta.get("name") or "",
                "role": meta.get("role") or "solution",
            }

        return user.user, profile_data
    except Exception:
        return None, None


def require_auth(roles=None):
    """Decorator: require auth + optional role check."""
    def decorator(fn):
        def wrapper(*args, **kwargs):
            user, profile = get_current_user(request)
            if not user or not profile:
                return jsonify({"ok": False, "error": "Unauthorized"}), 401
            if roles and profile.get("role") not in roles:
                return jsonify({"ok": False, "error": f"Role {profile.get('role')} tidak diizinkan"}), 403
            request.current_user = user
            request.current_profile = profile
            return fn(*args, **kwargs)
        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator


# ── Helpers ───────────────────────────────────────────────────────────────────
def _parse_input(data: dict) -> AKIInput:
    products = []
    for p in data.get("products", []):
        if not p.get("name") or p.get("monthly_price") is None:
            continue
        products.append(ProductLine(
            name=p["name"], qty=int(p.get("qty", 1)),
            monthly_price=float(p["monthly_price"]),
            otc_price=float(p.get("otc_price", 0)),
            is_hsi=bool(p.get("is_hsi", False)),
            evp=float(p["evp"]) if p.get("evp") not in (None, "") else None,
            satuan=p.get("satuan", "Titik"),
            tipe=p.get("tipe", "Butuh JT"),
        ))
    capex_data = data.get("capex")
    capex = None
    if capex_data and (capex_data.get("material") or capex_data.get("jasa")):
        capex = CapexInput(
            material=float(capex_data.get("material", 0)),
            jasa=float(capex_data.get("jasa", 0)),
            lifetime_years=int(capex_data.get("lifetime_years", 5)),
        )
    return AKIInput(
        nama_program=data.get("nama_program", ""),
        nama_customer=data.get("nama_customer", ""),
        lokasi=data.get("lokasi", ""),
        cust_group=data.get("cust_group", ""),
        teknologi=data.get("teknologi", "FO"),
        rencana_selesai=int(data.get("rencana_selesai", 2025)),
        jumlah_lop=int(data.get("jumlah_lop", 1)),
        id_lop=data.get("id_lop", ""),
        kontrak_tahun=int(data.get("kontrak_tahun", 1)),
        kontrak_bulan=int(data.get("kontrak_bulan", 0)),
        products=products,
        capex=capex,
        om_pct=float(data.get("om_pct", 0.12)),
        start_month=int(data.get("start_month", 1)),
    )


def _serialize_result(result: dict) -> dict:
    def safe(v):
        if v is None: return None
        if isinstance(v, float):
            return round(v, 6) if abs(v) < 1e12 else None
        if isinstance(v, list): return [safe(x) for x in v]
        return v
    keys = ["layak","total_revenue","total_cogs","total_gross_profit","gpm",
            "total_opex","total_ebitda","total_dep","total_ebit","total_tax",
            "total_ni","nim","capex_total","npv","irr","mirr","payback",
            "payback_str","rev_by_year","dir_by_year","opx_by_year","ni_by_year",
            "dep_by_year","fcf_by_year","acc_fcf","pv_fcf","discount_factors",
            "months_per_year","npv_ok","irr_ok","pp_ok","nim_ok","gpm_ok",
            "wacc","min_irr","min_nim","min_gpm","tax_rate","kontrak_total_bulan"]
    return {k: safe(result[k]) for k in keys if k in result}


def _save_submission(data: dict, result: dict, user_id: str, products: list) -> str:
    """Save submission + products to Supabase. Returns submission ID."""
    sub = {
        "created_by": user_id,
        "status": "draft",
        "nama_program": data.get("nama_program"),
        "nama_customer": data.get("nama_customer"),
        "cust_group": data.get("cust_group"),
        "lokasi": data.get("lokasi"),
        "teknologi": data.get("teknologi", "FO"),
        "rencana_selesai": data.get("rencana_selesai"),
        "jumlah_lop": data.get("jumlah_lop", 1),
        "id_lop": data.get("id_lop"),
        "kontrak_tahun": data.get("kontrak_tahun"),
        "kontrak_bulan": data.get("kontrak_bulan"),
        "start_month": data.get("start_month", 1),
        "capex_material": float(data.get("capex", {}).get("material", 0) or 0),
        "capex_jasa": float(data.get("capex", {}).get("jasa", 0) or 0),
        "capex_lifetime_years": data.get("capex", {}).get("lifetime_years", 5),
        "om_pct": data.get("om_pct", 0.12),
        # Results
        "total_revenue": result.get("total_revenue"),
        "total_cogs": result.get("total_cogs"),
        "total_gross_profit": result.get("total_gross_profit"),
        "gpm": result.get("gpm"),
        "total_opex": result.get("total_opex"),
        "total_ni": result.get("total_ni"),
        "nim": result.get("nim"),
        "capex_total": result.get("capex_total"),
        "npv": result.get("npv"),
        "mirr": result.get("mirr"),
        "payback": result.get("payback"),
        "payback_str": result.get("payback_str"),
        "layak": result.get("layak"),
        "npv_ok": result.get("npv_ok"),
        "irr_ok": result.get("irr_ok"),
        "pp_ok": result.get("pp_ok"),
        "nim_ok": result.get("nim_ok"),
        "gpm_ok": result.get("gpm_ok"),
    }
    res = supabase.table("aki_submissions").insert(sub).execute()
    sub_id = res.data[0]["id"]

    # Save products
    prod_rows = [
        {
            "submission_id": sub_id,
            "product_name": p.get("name"),
            "qty": p.get("qty", 1),
            "monthly_price": p.get("monthly_price", 0),
            "otc_price": p.get("otc_price", 0),
            "is_hsi": p.get("is_hsi", False),
            "satuan": p.get("satuan", "Titik"),
            "tipe": p.get("tipe", "Butuh JT"),
            "sort_order": i,
        }
        for i, p in enumerate(products)
    ]
    if prod_rows:
        supabase.table("aki_products").insert(prod_rows).execute()

    # History
    supabase.table("aki_history").insert({
        "submission_id": sub_id,
        "actor_id": user_id,
        "action": "created",
        "snapshot": json.dumps(_serialize_result(result)),
    }).execute()

    return sub_id


# ── Auth Routes ───────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    """Register new user."""
    data = request.get_json()
    try:
        res = supabase.auth.sign_up({
            "email": data["email"],
            "password": data["password"],
            "options": {
                "data": {
                    "full_name": data.get("full_name", ""),
                }
            }
        })

        return jsonify({"ok": True, "message": "Registrasi berhasil, cek email untuk verifikasi"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/auth/login", methods=["POST"])
def login():
    """Login and return JWT tokens."""
    data = request.get_json()
    try:
        res = supabase.auth.sign_in_with_password({
            "email": data["email"],
            "password": data["password"],
        })
        profile = supabase.table("profiles").select("*").eq("id", res.user.id).single().execute()
        return jsonify({
            "ok": True,
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "profile": profile.data,
            }
        })
    except Exception as e:
        return jsonify({"ok": False, "error": "Email atau password salah"}), 401


@app.route("/api/auth/me", methods=["GET"])
@require_auth()
def me():
    return jsonify({"ok": True, "profile": request.current_profile})


# ── AKI Routes ────────────────────────────────────────────────────────────────

@app.route("/api/calculate", methods=["POST"])
@require_auth()
def calculate():
    """Calculate AKI. Optionally save to DB."""
    try:
        data = request.get_json()
        aki_input = _parse_input(data)
        result = calculate_aki(aki_input)
        serialized = _serialize_result(result)

        # Auto-save for all authenticated users (skip if RLS error)
        sub_id = None

        return jsonify({"ok": True, "result": serialized, "submission_id": sub_id})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/recommend", methods=["POST"])
@require_auth()
def recommend():
    """Get AI recommendations for not-layak project."""
    try:
        data = request.get_json()
        aki_input = _parse_input(data)
        result = calculate_aki(aki_input)

        if result["layak"]:
            return jsonify({"ok": True, "recommendations": None, "message": "Proyek sudah LAYAK"})

        reco = get_ai_recommendations(result)

        # Save recos to submission if submission_id provided
        sub_id = data.get("submission_id")
        if sub_id:
            supabase.table("aki_submissions").update({
                "ai_recommendations": json.dumps(reco)
            }).eq("id", sub_id).execute()

        return jsonify({"ok": True, "recommendations": reco})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/export-pdf", methods=["POST"])
@require_auth()
def export_pdf():
    """Generate PDF ringkasan AKI."""
    try:
        data = request.get_json()
        aki_input = _parse_input(data)
        result = calculate_aki(aki_input)
        pdf_bytes = generate_pdf(result, aki_input)
        filename = f"AKI_{aki_input.nama_customer.replace(' ', '_')}_{uuid.uuid4().hex[:6]}.pdf"
        from io import BytesIO
        return send_file(
            BytesIO(pdf_bytes),
            as_attachment=True,
            download_name=filename,
            mimetype="application/pdf",
        )
    except Exception as e:
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/submissions", methods=["GET"])
@require_auth()
def get_submissions():
    """Get submissions list based on role."""
    try:
        profile = request.current_profile
        status = request.args.get("status")

        query = supabase.table("aki_submissions_view").select("*").eq("created_by", profile["id"]).order("created_at", desc=True)

        if status:
            query = query.eq("status", status)

        res = query.limit(50).execute()
        return jsonify({"ok": True, "data": res.data})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/submissions/<sub_id>", methods=["GET"])
@require_auth()
def get_submission(sub_id):
    """Get single submission with products."""
    try:
        sub = supabase.table("aki_submissions_view").select("*").eq("id", sub_id).single().execute()
        products = supabase.table("aki_products").select("*").eq("submission_id", sub_id).order("sort_order").execute()
        history = supabase.table("aki_history").select("*, profiles(full_name, role)").eq("submission_id", sub_id).order("created_at").execute()
        return jsonify({"ok": True, "submission": sub.data, "products": products.data, "history": history.data})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/submissions/<sub_id>/submit", methods=["POST"])
@require_auth()
def submit_for_approval(sub_id):
    """Submit AKI to manager for approval."""
    try:
        from datetime import datetime
        supabase.table("aki_submissions").update({
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        }).eq("id", sub_id).execute()

        supabase.table("aki_history").insert({
            "submission_id": sub_id,
            "actor_id": request.current_profile["id"],
            "action": "submitted",
            "notes": "Submitted untuk approval Manager",
        }).execute()

        return jsonify({"ok": True, "message": "Berhasil disubmit ke Manager"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/submissions/<sub_id>/review", methods=["POST"])
@require_auth()
def review_submission(sub_id):
    """Manager approve or reject submission."""
    try:
        from datetime import datetime
        data = request.get_json()
        action = data.get("action")  # "approved" | "rejected"
        notes = data.get("notes", "")

        if action not in ("approved", "rejected"):
            return jsonify({"ok": False, "error": "Action harus 'approved' atau 'rejected'"}), 400

        supabase.table("aki_submissions").update({
            "status": action,
            "reviewed_by": request.current_profile["id"],
            "reviewed_at": datetime.utcnow().isoformat(),
            "manager_notes": notes,
        }).eq("id", sub_id).execute()

        supabase.table("aki_history").insert({
            "submission_id": sub_id,
            "actor_id": request.current_profile["id"],
            "action": action,
            "notes": notes,
        }).execute()

        return jsonify({"ok": True, "message": f"Submission {action}"})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "status": "AKI API v2 running"})


if __name__ == "__main__":
    app.run(debug=True, port=5050)
