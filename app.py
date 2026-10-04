from flask import Flask, make_response, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import os
import re
import sqlite3

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "student_timetable_ai_secret_key")
# Keep edited templates visible during local use even when Flask debug mode is off.
app.config["TEMPLATES_AUTO_RELOAD"] = True

LOCAL_DB_PATH = os.environ.get(
    "LOCAL_SQLITE_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "student_timetable_test.db")
)


class SQLiteCompatCursor:
    """Translate the app's small PostgreSQL SQL subset for local SQLite testing."""
    def __init__(self, cursor):
        self._cursor = cursor

    @staticmethod
    def _sqlite_sql(sql):
        sql = re.sub(r"\bBIGSERIAL\s+PRIMARY\s+KEY\b", "INTEGER PRIMARY KEY AUTOINCREMENT", sql, flags=re.I)
        sql = re.sub(r"\bTIMESTAMPTZ\b", "TEXT", sql, flags=re.I)
        sql = re.sub(r"\bDOUBLE\s+PRECISION\b", "REAL", sql, flags=re.I)
        sql = re.sub(r"\bBIGINT\b", "INTEGER", sql, flags=re.I)
        sql = re.sub(r"\bILIKE\b", "LIKE", sql, flags=re.I)
        return sql.replace("%s", "?")

    def execute(self, sql, params=()):
        self._cursor.execute(self._sqlite_sql(sql), params)
        return self

    def fetchone(self): return self._cursor.fetchone()
    def fetchall(self): return self._cursor.fetchall()
    def __enter__(self): return self
    def __exit__(self, exc_type, exc, tb): self._cursor.close()


class SQLiteCompatConnection:
    def __init__(self, path):
        self._connection = sqlite3.connect(path, timeout=10)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")

    def cursor(self): return SQLiteCompatCursor(self._connection.cursor())
    def commit(self): return self._connection.commit()
    def rollback(self): return self._connection.rollback()
    def close(self): return self._connection.close()


def using_local_sqlite():
    return not os.environ.get("DATABASE_URL", "").strip()

# Render PostgreSQL provides DATABASE_URL automatically when the database is linked.
# Local development can also use DATABASE_URL from a .env/environment variable.
def get_database_url():
    """Return a normalized PostgreSQL connection URL."""
    database_url = os.environ.get("DATABASE_URL", "").strip()

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Please configure the DATABASE_URL "
            "environment variable."
        )

    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://"):]

    return database_url 


def get_db():
    """Use local SQLite for development; use Render PostgreSQL when DATABASE_URL exists."""
    if using_local_sqlite():
        return SQLiteCompatConnection(LOCAL_DB_PATH)

    if psycopg2 is None:
        raise RuntimeError("psycopg2 is not installed. Add psycopg2-binary to requirements.txt.")

    return psycopg2.connect(
        get_database_url(),
        cursor_factory=RealDictCursor,
        sslmode=os.environ.get("PGSSLMODE", "require")
    )


def query_one(sql, params=()):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone()
    finally:
        conn.close()


def query_all(sql, params=()):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        conn.close()


def execute(sql, params=(), fetchone=False):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            result = cur.fetchone() if fetchone else None
        conn.commit()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# -------------------------------
# CREATE TABLES
# -------------------------------
def init_db():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGSERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS subjects (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    subject_name TEXT,
                    difficulty TEXT,
                    study_hours DOUBLE PRECISION
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS timetable (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    day TEXT,
                    start_time TEXT,
                    end_time TEXT,
                    subject TEXT
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS assignments (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT,
                    subject TEXT,
                    due_date TEXT,
                    status TEXT DEFAULT 'Pending'
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS homework (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title TEXT,
                    subject TEXT,
                    due_date TEXT,
                    status TEXT DEFAULT 'Pending'
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS exams (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    subject TEXT,
                    exam_date TEXT
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS revision_items (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
                    topic TEXT NOT NULL,
                    planned_date TEXT,
                    completed BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS attendance (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    attended INTEGER DEFAULT 0,
                    total INTEGER DEFAULT 0
                )
            """)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# -------------------------------
# LOGIN REQUIRED
# -------------------------------
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return wrapper


def clean_email(email):
    return (email or "").strip().lower()


def date_info(value):
    today = datetime.now().date()
    try:
        due = datetime.strptime(value, "%Y-%m-%d").date()
        return (due - today).days, due < today
    except (TypeError, ValueError):
        return None, False


# -------------------------------
# HOME
# -------------------------------
@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("index.html")


# -------------------------------
# REGISTER
# -------------------------------
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        email = clean_email(request.form.get("email"))
        password = request.form.get("password") or ""
        confirm_password = request.form.get("confirm_password") or ""

        if not name or not email or not password:
            return jsonify({"success": False, "message": "Please fill all fields."}), 400
        if password != confirm_password:
            return jsonify({"success": False, "message": "Passwords do not match."}), 400
        if len(password) < 6:
            return jsonify({"success": False, "message": "Password must be at least 6 characters."}), 400

        existing = query_one("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (email,))
        if existing:
            return jsonify({"success": False, "message": "An account with this email already exists."}), 409

        hashed = generate_password_hash(password)
        try:
            execute(
                "INSERT INTO users(name, email, password) VALUES(%s, %s, %s)",
                (name, email, hashed)
            )
        except Exception:
            # SQLite and PostgreSQL report unique conflicts with different exception types.
            if query_one("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (email,)):
                return jsonify({"success": False, "message": "An account with this email already exists."}), 409
            raise

        return jsonify({"success": True, "message": "Registration Successful!"})

    return render_template("register.html")


# -------------------------------
# LOGIN
# -------------------------------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = clean_email(request.form.get("email"))
        password = request.form.get("password") or ""

        user = query_one("SELECT * FROM users WHERE LOWER(email) = LOWER(%s)", (email,))

        if user and check_password_hash(user["password"], password):
            session.clear()
            session["user_id"] = user["id"]
            session["user_name"] = user["name"]
            return redirect(url_for("dashboard"))

        flash("Invalid email or password.")

    return render_template("login.html")


# -------------------------------
# LOGOUT
# -------------------------------
@app.route("/logout")
@login_required
def logout():
    session.clear()
    return redirect(url_for("login"))


# -------------------------------
# DASHBOARD
# -------------------------------
@app.route("/dashboard")
@login_required
def dashboard():
    response = make_response(render_template("dashboard.html", username=session["user_name"]))
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


# -------------------------------
# USER INFO
# -------------------------------
@app.route("/api/user")
@login_required
def user_info():
    row = query_one("SELECT email FROM users WHERE id=%s", (session["user_id"],))
    return jsonify({
        "id": session["user_id"],
        "name": session["user_name"],
        "email": row["email"] if row else ""
    })


# ============================================
# SUBJECT MANAGEMENT
# ============================================
@app.route("/api/subjects", methods=["GET", "POST"])
@login_required
def subjects():
    uid = session["user_id"]

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        subject = (data.get("subject") or "").strip()
        difficulty = data.get("difficulty")
        hours = data.get("hours")

        if not subject:
            return jsonify({"success": False, "message": "Subject required"}), 400

        execute(
            "INSERT INTO subjects(user_id, subject_name, difficulty, study_hours) VALUES(%s, %s, %s, %s)",
            (uid, subject, difficulty, hours)
        )
        return jsonify({"success": True, "message": "Subject Added"})

    rows = query_all("SELECT * FROM subjects WHERE user_id=%s ORDER BY id", (uid,))
    return jsonify([dict(x) for x in rows])


@app.route("/api/subjects/<int:id>", methods=["PUT", "DELETE"])
@login_required
def subject_by_id(id):
    uid = session["user_id"]

    if request.method == "DELETE":
        execute("DELETE FROM subjects WHERE id=%s AND user_id=%s", (id, uid))
        return jsonify({"success": True})

    data = request.get_json(silent=True) or {}
    execute("""
        UPDATE subjects
        SET subject_name=%s, difficulty=%s, study_hours=%s
        WHERE id=%s AND user_id=%s
    """, (data.get("subject"), data.get("difficulty"), data.get("hours"), id, uid))
    return jsonify({"success": True, "message": "Subject Updated"})


@app.route("/api/subjects/search")
@login_required
def search_subjects():
    keyword = request.args.get("q", "")
    rows = query_all("""
        SELECT * FROM subjects
        WHERE user_id=%s AND subject_name ILIKE %s
        ORDER BY id
    """, (session["user_id"], f"%{keyword}%"))
    return jsonify([dict(x) for x in rows])


# ============================================
# SMART TIMETABLE
# ============================================
def generate_timetable(user_id, start_time="16:00", end_time="22:00", days=None, break_minutes=15):
    subjects_rows = query_all("SELECT * FROM subjects WHERE user_id=%s ORDER BY id", (user_id,))

    if not subjects_rows:
        return 0

    days = days or ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    today = datetime.now().strftime("%A")
    if today in days:
        today_index = days.index(today)
        days = days[today_index:] + days[:today_index]
    start_minutes = int(start_time[:2]) * 60 + int(start_time[3:])
    end_minutes = int(end_time[:2]) * 60 + int(end_time[3:])
    available_minutes = end_minutes - start_minutes
    if available_minutes <= 0:
        raise ValueError("End time must be later than start time.")

    durations = []
    for subject in subjects_rows:
        try:
            hours = float(subject["study_hours"] or 1)
        except (TypeError, ValueError):
            hours = 1
        if subject["difficulty"] == "Hard":
            hours += 0.5
        duration = max(30, int(round(hours * 60 / 30) * 30))
        if duration > available_minutes:
            raise ValueError(f"{subject['subject_name']} needs more time than your selected daily study window.")
        durations.append(duration)

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM timetable WHERE user_id=%s", (user_id,))
            cursors = {day: start_minutes for day in days}
            session_counts = {day: 0 for day in days}
            for subject, duration in zip(subjects_rows, durations):
                # Balance sessions across selected days, skipping days without enough room.
                possible = [day for day in days if cursors[day] + duration <= end_minutes]
                if not possible:
                    raise ValueError("Your selected days and study hours do not fit all subjects. Add a day or widen your study window.")
                day = min(possible, key=lambda candidate: (session_counts[candidate], cursors[candidate]))
                start = cursors[day]
                finish = start + duration
                start_text = f"{start // 60:02d}:{start % 60:02d}"
                end_text = f"{finish // 60:02d}:{finish % 60:02d}"
                cur.execute("""
                    INSERT INTO timetable(user_id, day, start_time, end_time, subject)
                    VALUES(%s, %s, %s, %s, %s)
                """, (user_id, day, start_text, end_text, subject["subject_name"]))
                cursors[day] = finish + break_minutes
                session_counts[day] += 1
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return len(subjects_rows)


@app.route("/api/timetable/generate", methods=["POST"])
@login_required
def create_timetable():
    data = request.get_json(silent=True) or {}
    valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    days = [day for day in data.get("days", valid_days) if day in valid_days]
    if not days:
        return jsonify({"success": False, "message": "Select at least one study day."}), 400
    start_time = data.get("start_time", "16:00")
    end_time = data.get("end_time", "22:00")
    try:
        datetime.strptime(start_time, "%H:%M")
        datetime.strptime(end_time, "%H:%M")
        break_minutes = int(data.get("break_minutes", 15))
        if not 0 <= break_minutes <= 120:
            raise ValueError
        total = generate_timetable(session["user_id"], start_time, end_time, days, break_minutes)
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc) or "Enter a valid time window and break length."}), 400
    if not total:
        return jsonify({"success": False, "message": "Add subjects before generating a timetable."}), 400
    return jsonify({"success": True, "message": "Flexible timetable generated successfully."})


@app.route("/api/timetable", methods=["GET", "DELETE"])
@login_required
def timetable():
    uid = session["user_id"]
    if request.method == "DELETE":
        execute("DELETE FROM timetable WHERE user_id=%s", (uid,))
        return jsonify({"success": True})

    rows = query_all("""
        SELECT * FROM timetable
        WHERE user_id=%s
        ORDER BY CASE day
            WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 ELSE 7 END,
            start_time
    """, (uid,))
    return jsonify([dict(x) for x in rows])


@app.route("/api/timetable/today")
@login_required
def today_timetable():
    rows = query_all("""
        SELECT * FROM timetable
        WHERE user_id=%s AND day=%s
        ORDER BY start_time
    """, (session["user_id"], datetime.now().strftime("%A")))
    return jsonify([dict(x) for x in rows])


# ============================================
# ASSIGNMENTS
# ============================================
@app.route("/api/assignments", methods=["GET", "POST"])
@login_required
def assignments():
    uid = session["user_id"]
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        title = data.get("title")
        subject = data.get("subject")
        due_date = data.get("due_date")
        if not title or not subject or not due_date:
            return jsonify({"success": False, "message": "Please fill all fields."}), 400
        execute("""
            INSERT INTO assignments(user_id,title,subject,due_date,status)
            VALUES(%s,%s,%s,%s,%s)
        """, (uid, title, subject, due_date, "Pending"))
        return jsonify({"success": True, "message": "Assignment Added"})

    rows = query_all("SELECT * FROM assignments WHERE user_id=%s ORDER BY due_date ASC", (uid,))
    result = []
    for row in rows:
        item = dict(row)
        item["days_left"], item["overdue"] = date_info(item.get("due_date"))
        result.append(item)
    return jsonify(result)


@app.route("/api/assignments/<int:id>", methods=["PUT", "DELETE"])
@login_required
def assignment_by_id(id):
    uid = session["user_id"]
    if request.method == "DELETE":
        execute("DELETE FROM assignments WHERE id=%s AND user_id=%s", (id, uid))
        return jsonify({"success": True})

    data = request.get_json(silent=True) or {}
    execute("""
        UPDATE assignments
        SET title=%s, subject=%s, due_date=%s, status=%s
        WHERE id=%s AND user_id=%s
    """, (data.get("title"), data.get("subject"), data.get("due_date"), data.get("status"), id, uid))
    return jsonify({"success": True})


@app.route("/api/assignments/pending")
@login_required
def pending_assignments():
    rows = query_all("""
        SELECT * FROM assignments
        WHERE user_id=%s AND status='Pending'
        ORDER BY due_date LIMIT 5
    """, (session["user_id"],))
    return jsonify([dict(x) for x in rows])


# ============================================
# HOMEWORK
# ============================================
@app.route("/api/homework", methods=["GET", "POST"])
@login_required
def homework():
    uid = session["user_id"]
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        if not data.get("title") or not data.get("subject") or not data.get("due_date"):
            return jsonify({"success": False, "message": "Please fill all fields."}), 400
        execute("""
            INSERT INTO homework(user_id,title,subject,due_date,status)
            VALUES(%s,%s,%s,%s,%s)
        """, (uid, data.get("title"), data.get("subject"), data.get("due_date"), "Pending"))
        return jsonify({"success": True, "message": "Homework Added"})

    rows = query_all("SELECT * FROM homework WHERE user_id=%s ORDER BY due_date ASC", (uid,))
    result = []
    for row in rows:
        item = dict(row)
        item["days_left"], item["overdue"] = date_info(item.get("due_date"))
        result.append(item)
    return jsonify(result)


@app.route("/api/homework/<int:id>", methods=["PUT", "DELETE"])
@login_required
def homework_by_id(id):
    uid = session["user_id"]
    if request.method == "DELETE":
        execute("DELETE FROM homework WHERE id=%s AND user_id=%s", (id, uid))
        return jsonify({"success": True})

    data = request.get_json(silent=True) or {}
    execute("""
        UPDATE homework
        SET title=%s, subject=%s, due_date=%s, status=%s
        WHERE id=%s AND user_id=%s
    """, (data.get("title"), data.get("subject"), data.get("due_date"), data.get("status"), id, uid))
    return jsonify({"success": True})


@app.route("/api/homework/pending")
@login_required
def pending_homework():
    rows = query_all("""
        SELECT * FROM homework
        WHERE user_id=%s AND status='Pending'
        ORDER BY due_date LIMIT 5
    """, (session["user_id"],))
    return jsonify([dict(x) for x in rows])


# ============================================
# EXAMS
# ============================================
@app.route("/api/exams", methods=["GET", "POST"])
@login_required
def exams():
    uid = session["user_id"]
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        if not data.get("subject") or not data.get("exam_date"):
            return jsonify({"success": False, "message": "Please fill all fields."}), 400
        execute("INSERT INTO exams(user_id,subject,exam_date) VALUES(%s,%s,%s)",
                (uid, data.get("subject"), data.get("exam_date")))
        return jsonify({"success": True, "message": "Exam Added"})

    rows = query_all("SELECT * FROM exams WHERE user_id=%s ORDER BY exam_date ASC", (uid,))
    result = []
    today = datetime.now().date()
    for row in rows:
        item = dict(row)
        try:
            d = datetime.strptime(item["exam_date"], "%Y-%m-%d").date()
            item["days_left"] = (d - today).days
            item["status"] = "Upcoming" if d >= today else "Completed"
        except (TypeError, ValueError):
            item["days_left"] = None
            item["status"] = "Unknown"
        result.append(item)
    return jsonify(result)


@app.route("/api/exams/<int:id>", methods=["PUT", "DELETE"])
@login_required
def exam_by_id(id):
    uid = session["user_id"]
    if request.method == "DELETE":
        execute("DELETE FROM exams WHERE id=%s AND user_id=%s", (id, uid))
        return jsonify({"success": True})

    data = request.get_json(silent=True) or {}
    execute("""
        UPDATE exams SET subject=%s, exam_date=%s
        WHERE id=%s AND user_id=%s
    """, (data.get("subject"), data.get("exam_date"), id, uid))
    return jsonify({"success": True})


@app.route("/api/exams/upcoming")
@login_required
def upcoming_exams():
    today = datetime.now().strftime("%Y-%m-%d")
    rows = query_all("""
        SELECT * FROM exams
        WHERE user_id=%s AND exam_date>=%s
        ORDER BY exam_date LIMIT 5
    """, (session["user_id"], today))
    return jsonify([dict(x) for x in rows])


# ============================================
# EXAM REVISION PLAN
# ============================================
@app.route("/api/revisions", methods=["GET", "POST"])
@login_required
def revision_items():
    uid = session["user_id"]
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        topic = (data.get("topic") or "").strip()
        try:
            exam_id = int(data.get("exam_id"))
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Choose an exam for this revision item."}), 400
        planned_date = (data.get("planned_date") or "").strip() or None
        if not topic:
            return jsonify({"success": False, "message": "Enter a topic to revise."}), 400
        if planned_date:
            try:
                datetime.strptime(planned_date, "%Y-%m-%d")
            except ValueError:
                return jsonify({"success": False, "message": "Choose a valid revision date."}), 400
        exam = query_one("SELECT id FROM exams WHERE id=%s AND user_id=%s", (exam_id, uid))
        if not exam:
            return jsonify({"success": False, "message": "That exam was not found."}), 404
        execute("""
            INSERT INTO revision_items(user_id, exam_id, topic, planned_date)
            VALUES(%s, %s, %s, %s)
        """, (uid, exam_id, topic, planned_date))
        return jsonify({"success": True, "message": "Revision item added."}), 201

    rows = query_all("""
        SELECT r.id, r.exam_id, r.topic, r.planned_date, r.completed,
               e.subject AS exam_subject, e.exam_date
        FROM revision_items r
        JOIN exams e ON e.id=r.exam_id AND e.user_id=r.user_id
        WHERE r.user_id=%s
        ORDER BY e.exam_date ASC, r.planned_date ASC, r.id ASC
    """, (uid,))
    return jsonify([dict(row) for row in rows])


@app.route("/api/revisions/<int:item_id>", methods=["PUT", "DELETE"])
@login_required
def revision_item_by_id(item_id):
    uid = session["user_id"]
    if request.method == "DELETE":
        execute("DELETE FROM revision_items WHERE id=%s AND user_id=%s", (item_id, uid))
        return jsonify({"success": True})

    data = request.get_json(silent=True) or {}
    completed = data.get("completed")
    if not isinstance(completed, bool):
        return jsonify({"success": False, "message": "Revision status must be complete or pending."}), 400
    execute("UPDATE revision_items SET completed=%s WHERE id=%s AND user_id=%s", (completed, item_id, uid))
    return jsonify({"success": True})


# ============================================
# ATTENDANCE
# ============================================
@app.route("/api/attendance", methods=["GET", "POST"])
@login_required
def attendance():
    uid = session["user_id"]

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        try:
            attended = max(0, int(data.get("attended", 0)))
            total = max(0, int(data.get("total", 0)))
        except (TypeError, ValueError):
            return jsonify({"success": False, "message": "Attendance values must be numbers."}), 400

        if attended > total:
            return jsonify({"success": False, "message": "Attended classes cannot exceed total classes."}), 400

        execute("""
            INSERT INTO attendance(user_id, attended, total)
            VALUES(%s,%s,%s)
            ON CONFLICT (user_id)
            DO UPDATE SET attended=EXCLUDED.attended, total=EXCLUDED.total
        """, (uid, attended, total))
        return jsonify({"success": True, "message": "Attendance Saved"})

    row = query_one("SELECT attended,total FROM attendance WHERE user_id=%s", (uid,))
    if not row:
        return jsonify({"attended": 0, "total": 0, "percentage": 0, "need": 0, "status": "No Data"})

    attended = int(row["attended"] or 0)
    total = int(row["total"] or 0)
    percentage = round(attended / total * 100, 2) if total else 0

    need = 0
    if percentage < 75:
        # Minimum future classes needed to reach 75%.
        #  (attended + n) / (total + n) >= 0.75
        need = max(0, (3 * total - 4 * attended + 2) // 1)
        # Exact integer ceiling of (3*total - 4*attended) / 1 for 75%.
        if total:
            numerator = 3 * total - 4 * attended
            need = max(0, numerator)

    return jsonify({
        "attended": attended,
        "total": total,
        "percentage": percentage,
        "need": need,
        "status": "Good" if percentage >= 75 else "Below 75%"
    })


# ============================================
# DASHBOARD APIs
# ============================================
def attendance_percentage(uid):
    row = query_one("SELECT attended,total FROM attendance WHERE user_id=%s", (uid,))
    if not row or not row["total"]:
        return 0
    return round(row["attended"] / row["total"] * 100, 2)


@app.route("/api/dashboard")
@login_required
def dashboard_api():
    uid = session["user_id"]
    counts = {}
    for table in ["assignments", "homework", "exams", "timetable"]:
        row = query_one(f"SELECT COUNT(*) AS count FROM {table} WHERE user_id=%s", (uid,))
        counts[table] = int(row["count"])

    return jsonify({
        **counts,
        "attendance": attendance_percentage(uid),
        "username": session["user_name"]
    })


@app.route("/api/dashboard/summary")
@login_required
def dashboard_summary():
    uid = session["user_id"]
    data = {}
    for table in ["subjects", "assignments", "homework", "exams", "timetable"]:
        row = query_one(f"SELECT COUNT(*) AS count FROM {table} WHERE user_id=%s", (uid,))
        data[table] = int(row["count"])
    data["attendance"] = attendance_percentage(uid)
    data["username"] = session["user_name"]
    return jsonify(data)


# ============================================
# HEALTH CHECK
# ============================================
@app.route("/api/status")
def status():
    try:
        query_one("SELECT 1 AS ok")
        return jsonify({
            "status": "online",
            "database": "postgresql",
            "application": "FocusGrid",
            "version": "3.0"
        })
    except Exception as exc:
        return jsonify({
            "status": "online",
            "database": "error",
            "application": "FocusGrid",
            "version": "3.0",
            "error": str(exc) if app.debug else "Database connection failed"
        }), 503


# ============================================
# ERROR HANDLERS
# ============================================
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "message": "Page Not Found"}), 404


@app.errorhandler(500)
def internal_error(error):
    # Keep the response JSON, but do not expose database credentials/details in production.
    return jsonify({"success": False, "message": "Internal Server Error"}), 500


# Initialize PostgreSQL when the Flask process starts.
# This is intentionally outside if __name__ == '__main__' so it also works with Gunicorn on Render.
try:
    init_db()
except Exception as startup_error:
    # Do not prevent Gunicorn from starting if PostgreSQL is temporarily unavailable.
    # The first database request will return an appropriate error instead.
    print(f"[DATABASE STARTUP WARNING] {startup_error}")


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "0") == "1", host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
