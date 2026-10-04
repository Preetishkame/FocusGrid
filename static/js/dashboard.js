// =========================================
// FocusGrid
// dashboard.js
// Part 1
// =========================================

const API = "/api";
let dashboardAttendanceData = null;
let dashboardExamList = null;
const schoolReadyData = { timetable: null, homework: null, assignments: null, exams: null };
const inFlightGetRequests = new Map();
let schoolReadyDataReady = false;


// -----------------------------------------
// API REQUEST
// -----------------------------------------

async function apiRequest(endpoint, method = "GET", data = null) {

    const normalizedMethod = method.toUpperCase();
    if (normalizedMethod === "GET" && inFlightGetRequests.has(endpoint)) {
        return inFlightGetRequests.get(endpoint);
    }

    const options = {
        method: normalizedMethod,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const request = (async () => {
        const response = await fetch(API + endpoint, options);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Request Failed");
        }

        return result;
    })();

    if (normalizedMethod !== "GET") return request;
    inFlightGetRequests.set(endpoint, request);
    try { return await request; }
    finally { inFlightGetRequests.delete(endpoint); }

}



// -----------------------------------------
// PAGE LOAD
// -----------------------------------------





// -----------------------------------------
// INITIALIZE
// -----------------------------------------

let dashboardRefreshPromise = null;
async function initializeDashboard(options = {}) {
    if (dashboardRefreshPromise) return dashboardRefreshPromise;
    dashboardRefreshPromise = (async () => {
        const show = options.showLoading !== false;
        if (show) showLoading();
        try {
            schoolReadyDataReady = false;
            const tasks = [loadUser(), loadDashboard(), loadTodayTimetable(), loadUpcomingExams(), loadDashboardTaskPreviews(), loadSubjects(), loadHomework(), loadAssignments(), loadExams(), loadAttendance(), loadGeneratedTimetable()];
            const results = await Promise.allSettled(tasks);
            schoolReadyDataReady = true;
            renderSchoolReady();
            results.filter(x => x.status === "rejected").forEach(x => console.error("Dashboard section failed:", x.reason));
            await loadDailyStudyFeatures();
            if (results.every(x => x.status === "rejected")) showToast("Unable to load dashboard", "error");
            return results;
        } finally { if (show) hideLoading(); dashboardRefreshPromise = null; }
    })();
    return dashboardRefreshPromise;
}
// LOAD USER
// -----------------------------------------

async function loadUser() {

    const user = await apiRequest("/user");

    document.getElementById("welcome-user").textContent =
        user.name;

    document.getElementById("studentName").textContent =
        user.name;

    const profileName = document.getElementById("profileName");

    if (profileName)
        profileName.textContent = user.name;

    const profileEmail = document.getElementById("profileEmail");

    if (profileEmail)
        profileEmail.textContent = user.email;

}



// -----------------------------------------
// DASHBOARD SUMMARY
// -----------------------------------------

async function loadDashboard() {

    const data =
        await apiRequest("/dashboard/summary");

    document.getElementById("subjectCount").textContent =
        data.subjects;

    document.getElementById("assignmentCount").textContent =
        data.assignments;

    document.getElementById("homeworkCount").textContent =
        data.homework;

    document.getElementById("examCount").textContent =
        data.exams;

    document.getElementById("attendancePercent").textContent =
        data.attendance;

    document.getElementById("attendanceBar").style.width =
        data.attendance + "%";

}



// -----------------------------------------
// TODAY TIMETABLE
// -----------------------------------------

async function loadTodayTimetable() {

    const table =
        document.getElementById("todayTimetable");

    if (!table) return;

    const allSessions = await apiRequest("/timetable");
    schoolReadyData.timetable = allSessions;
    renderSchoolReady();
    const todayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    const timetable = allSessions
        .filter(item => item.day === todayName)
        .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));

    const heading = document.getElementById("todayTimetableHeading");
    const timeHeading = document.getElementById("todayTimetableTimeHeading");

    if (timetable.length === 0) {

        const weekdayIndex = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        const todayIndex = new Date().getDay();
        const upcoming = allSessions
            .map(item => ({
                ...item,
                dayDistance: ((weekdayIndex[item.day] ?? todayIndex) - todayIndex + 7) % 7 || 7
            }))
            .sort((a, b) => a.dayDistance - b.dayDistance || a.start_time.localeCompare(b.start_time))
            .slice(0, 3);

        if (upcoming.length) {
            if (heading) heading.textContent = "Next Scheduled Sessions";
            if (timeHeading) timeHeading.textContent = "Day & Time";
            table.replaceChildren(...upcoming.map(item => {
                const row = document.createElement("tr");
                const dayCell = document.createElement("td");
                const subjectCell = document.createElement("td");
                dayCell.textContent = `${item.day} · ${item.start_time} - ${item.end_time}`;
                subjectCell.textContent = item.subject;
                row.append(dayCell, subjectCell);
                return row;
            }));
            return;
        }

        if (heading) heading.textContent = "Today's Timetable";
        if (timeHeading) timeHeading.textContent = "Time";

        table.innerHTML = `
        <tr>
            <td colspan="2">
                <div class="timetable-empty-state">
                    <span>No timetable is scheduled for today.</span>
                    <button type="button" class="btn-outline" id="openTimetableGenerator">Generate a timetable</button>
                </div>
            </td>
        </tr>`;

        return;

    }

    if (heading) heading.textContent = "Today's Timetable";
    if (timeHeading) timeHeading.textContent = "Time";

    table.innerHTML = "";

    timetable.forEach(item => {

        table.innerHTML += `

        <tr>

            <td>

                ${item.start_time}
                -
                ${item.end_time}

            </td>

            <td>

                ${item.subject}

            </td>

        </tr>

        `;

    });

}
// =========================================
// PART 2
// SUBJECT MANAGEMENT
// =========================================


// -----------------------------------------
// LOAD SUBJECTS
// -----------------------------------------

async function loadSubjects() {

    const table =
    document.getElementById("subjectTable");

    if(!table) return;

    const subjects =
    await apiRequest("/subjects");

    if(subjects.length===0){

        table.innerHTML=`

        <tr>

            <td colspan="4">

                No subjects added.

            </td>

        </tr>

        `;

        return;

    }

    table.innerHTML="";

    subjects.forEach(subject=>{

        table.innerHTML+=`

        <tr>

            <td>

                ${subject.subject_name}

            </td>

            <td>

                ${subject.difficulty}

            </td>

            <td>

                ${subject.study_hours} hrs

            </td>

            <td>

                <button
                class="btn-danger"
                onclick="deleteSubject(${subject.id})">

                Delete

                </button>

            </td>

        </tr>

        `;

    });

}



// -----------------------------------------
// ADD SUBJECT
// -----------------------------------------

const subjectForm =
document.getElementById("subjectForm");

if(subjectForm){

subjectForm.addEventListener("submit",

async function(e){

    e.preventDefault();

    try{

        showLoading();

        await apiRequest(

            "/subjects",

            "POST",

            {

                subject:
                document.getElementById("subjectName").value,

                difficulty:
                document.getElementById("difficulty").value,

                hours:
                document.getElementById("studyHours").value

            }

        );

        subjectForm.reset();

        await loadSubjects();
        await loadDailyStudyFeatures();

        hideLoading();

        showToast(
            "Subject Added"
        );

    }

    catch(err){

        hideLoading();

        showToast(
            err.message,
            "error"
        );

    }

});

}



// -----------------------------------------
// DELETE SUBJECT
// -----------------------------------------

async function deleteSubject(id){

    if(!confirmDelete()) return;

    try{

        await apiRequest(

            "/subjects/"+id,

            "DELETE"

        );

        loadSubjects();
        loadDailyStudyFeatures();

        showToast(
            "Subject Deleted"
        );

    }

    catch(err){

        showToast(
            err.message,
            "error"
        );

    }

}



// =========================================
// AI TIMETABLE
// =========================================


// -----------------------------------------
// GENERATE
// -----------------------------------------

const generateBtn =
document.getElementById("generateBtn");

if(generateBtn){

generateBtn.addEventListener("click",

async ()=>{

    try{

        showLoading();

        const selectedDays = Array.from(
            document.querySelectorAll('input[name="studyDays"]:checked')
        ).map(input => input.value);

        await apiRequest(
            "/timetable/generate",
            "POST",
            {
                start_time: document.getElementById("scheduleStartTime")?.value || "16:00",
                end_time: document.getElementById("scheduleEndTime")?.value || "22:00",
                days: selectedDays,
                break_minutes: Number(document.getElementById("scheduleBreakMinutes")?.value || 15)
            }
        );

        await loadGeneratedTimetable();

        await loadTodayTimetable();
        await loadDailyStudyFeatures();

        hideLoading();

        showToast("Flexible timetable generated");

    }

    catch(err){

        hideLoading();

        showToast(
            err.message,
            "error"
        );

    }

});

}



// -----------------------------------------
// LOAD TIMETABLE
// -----------------------------------------

async function loadGeneratedTimetable(){

    const table=
    document.getElementById("generatedTable");

    if(!table) return;

    const timetable=
    await apiRequest("/timetable");
    schoolReadyData.timetable = timetable;
    renderSchoolReady();

    if(timetable.length===0){

        table.innerHTML=`

        <tr>

            <td colspan="4">

                No timetable generated.

            </td>

        </tr>

        `;

        return;

    }

    table.innerHTML="";

    timetable.forEach(item=>{

        table.innerHTML+=`

        <tr>

            <td>

                ${item.day}

            </td>

            <td>

                ${item.subject}

            </td>

            <td>

                ${item.start_time}

            </td>

            <td>

                ${item.end_time}

            </td>

        </tr>

        `;

    });

}



// -----------------------------------------
// INITIAL LOAD (subjects & timetable run when AI tab is first visited)
// -----------------------------------------
// =========================================
// PART 3
// HOMEWORK & ASSIGNMENTS
// =========================================



// =========================================
// HOMEWORK
// =========================================


// ------------------------------
// LOAD HOMEWORK
// ------------------------------

async function loadHomework(){

    const table =
    document.getElementById("homeworkTable");

    if(!table) return;

    const homework =
    await apiRequest("/homework");
    schoolReadyData.homework = homework;
    renderSchoolReady();

    if(homework.length===0){

        table.innerHTML=`
        <tr>
            <td colspan="5">
                No homework found.
            </td>
        </tr>
        `;

        return;

    }

    table.innerHTML="";

    homework.forEach(hw=>{

        table.innerHTML+=`

        <tr>

            <td>${hw.title}</td>

            <td>${hw.subject}</td>

            <td>${hw.due_date}</td>

            <td>${hw.status}</td>

            <td>

                <button
                class="btn-danger"
                onclick="deleteHomework(${hw.id})">

                Delete

                </button>

            </td>

        </tr>

        `;

    });

}



// ------------------------------
// ADD HOMEWORK
// ------------------------------

const homeworkForm =
document.getElementById("addHomeworkForm");

if(homeworkForm){

homeworkForm.addEventListener("submit",

async function(e){

    e.preventDefault();

    try{

        await apiRequest(

            "/homework",

            "POST",

            {

                title:
                document.getElementById("hwTitle").value,

                subject:
                document.getElementById("hwSubject").value,

                due_date:
                document.getElementById("hwDue").value

            }

        );

        homeworkForm.reset();

        loadHomework();
        refreshDashboardTaskPanels();

        showToast("Homework Added");

    }

    catch(err){

        showToast(err.message,"error");

    }

});

}



// ------------------------------
// DELETE HOMEWORK
// ------------------------------

async function deleteHomework(id){

    if(!confirmDelete()) return;

    await apiRequest(

        "/homework/"+id,

        "DELETE"

    );

    loadHomework();
    refreshDashboardTaskPanels();

    showToast("Homework Deleted");

}



// =========================================
// ASSIGNMENTS
// =========================================


// ------------------------------
// LOAD ASSIGNMENTS
// ------------------------------

async function loadAssignments(){

    const table =
    document.getElementById("assignmentTable");

    if(!table) return;

    const assignments =
    await apiRequest("/assignments");
    schoolReadyData.assignments = assignments;
    renderSchoolReady();

    if(assignments.length===0){

        table.innerHTML=`

        <tr>

            <td colspan="5">

                No assignments found.

            </td>

        </tr>

        `;

        return;

    }

    table.innerHTML="";

    assignments.forEach(item=>{

        table.innerHTML+=`

        <tr>

            <td>${item.title}</td>

            <td>${item.subject}</td>

            <td>${item.due_date}</td>

            <td>${item.status}</td>

            <td>

                <button
                class="btn-danger"
                onclick="deleteAssignment(${item.id})">

                Delete

                </button>

            </td>

        </tr>

        `;

    });

}



// ------------------------------
// ADD ASSIGNMENT
// ------------------------------

const assignmentForm =
document.getElementById("addAssignmentForm");

if(assignmentForm){

assignmentForm.addEventListener("submit",

async function(e){

    e.preventDefault();

    try{

        await apiRequest(

            "/assignments",

            "POST",

            {

                title:
                document.getElementById("assignmentTitle").value,

                subject:
                document.getElementById("assignmentSubject").value,

                due_date:
                document.getElementById("assignmentDue").value

            }

        );

        assignmentForm.reset();

        loadAssignments();
        refreshDashboardTaskPanels();

        showToast("Assignment Added");

    }

    catch(err){

        showToast(err.message,"error");

    }

});

}



// ------------------------------
// DELETE ASSIGNMENT
// ------------------------------

async function deleteAssignment(id){

    if(!confirmDelete()) return;

    await apiRequest(

        "/assignments/"+id,

        "DELETE"

    );

    loadAssignments();
    refreshDashboardTaskPanels();

    showToast("Assignment Deleted");

}



// =========================================
// PENDING ASSIGNMENTS (dashboard widget)
// =========================================

async function loadPendingAssignments() {

    const container =
    document.getElementById("pendingAssignments");

    if (!container) return;

    try {

        const assignments =
        await apiRequest("/assignments/pending");

        if (assignments.length === 0) {

            container.innerHTML = "No pending assignments.";
            return;

        }

        container.innerHTML = "";

        container.replaceChildren(...assignments.map(item => {
            const row = document.createElement("div"); row.className = "list-item";
            row.dataset.dueDate = String(item.due_date || "").slice(0, 10);
            const title = document.createElement("strong"); title.textContent = item.title || "Assignment";
            const detail = document.createElement("div"); detail.textContent = [item.subject, item.due_date ? `Due ${item.due_date}` : "No due date"].filter(Boolean).join(" · ");
            row.append(title, detail); return row;
        }));

    } catch (err) {

        console.error("loadPendingAssignments:", err);

    }

}
// =========================================
async function loadDashboardTaskPreviews() {
    const homeworkBox = document.getElementById("dashboardHomeworkPreview");
    const assignmentBox = document.getElementById("dashboardAssignmentsPreview");
    const [homeworkResult, assignmentResult] = await Promise.allSettled([
        homeworkBox ? apiRequest("/homework/pending") : Promise.resolve([]),
        assignmentBox ? apiRequest("/assignments/pending") : Promise.resolve([])
    ]);

    const render = (box, result, emptyText) => {
        if (!box) return;
        if (result.status === "rejected") {
            box.textContent = "Could not load this list.";
            console.error("Dashboard preview failed:", result.reason);
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = result.value
            .filter(item => !/^(completed|done)$/i.test(item.status || ""))
            .sort((a, b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")))
            .slice(0, 4);
        if (!upcoming.length) {
            box.textContent = emptyText;
            return;
        }
        const cards = upcoming.map(item => {
            const card = document.createElement("div");
            card.className = "dashboard-preview-item";
            card.dataset.dueDate = String(item.due_date || "").slice(0, 10);
            const title = document.createElement("strong");
            title.textContent = item.title || item.subject || "Untitled";
            const meta = document.createElement("div");
            meta.className = "dashboard-preview-meta";
            meta.textContent = [item.subject, item.due_date ? `Due ${item.due_date}` : "No due date"]
                .filter(Boolean).join(" · ");
            card.append(title, meta);
            if (item.due_date) {
                const due = new Date(`${String(item.due_date).slice(0, 10)}T00:00:00`);
                const days = Math.round((due - today) / 86400000);
                if (days < 0) card.dataset.urgency = "overdue";
                else if (days === 0) card.dataset.urgency = "today";
                else if (days <= 2) card.dataset.urgency = "soon";
            }
            return card;
        });
        box.replaceChildren(...cards);
    };

    render(homeworkBox, homeworkResult, "No homework pending.");
    render(assignmentBox, assignmentResult, "No assignments pending.");
    const pendingBox = document.getElementById("pendingAssignments");
    render(pendingBox, assignmentResult, "No pending assignments.");
}

// PART 4
// EXAMS & ATTENDANCE
// =========================================



// =========================================
// EXAMS
// =========================================


// ------------------------------
// LOAD EXAMS
// ------------------------------

async function loadExams(){

    const table =
    document.getElementById("examTable");

    if(!table) return;

    const exams =
    await apiRequest("/exams");
    dashboardExamList = exams;
    schoolReadyData.exams = exams;
    renderSchoolReady();

    if(exams.length===0){

        table.innerHTML=`

        <tr>

            <td colspan="5">

                No exams added.

            </td>

        </tr>

        `;

        await loadRevisionManager(exams);

        return;

    }

    table.innerHTML="";

    exams.forEach(exam=>{

        table.innerHTML+=`

        <tr>

            <td>${exam.subject}</td>

            <td>${exam.exam_date}</td>

            <td>${exam.days_left}</td>

            <td>${exam.status}</td>

            <td>

                <button
                class="btn-danger"
                onclick="deleteExam(${exam.id})">

                Delete

                </button>

            </td>

        </tr>

        `;

    });

    await loadRevisionManager(exams);

}

async function loadRevisionManager(exams = null) {
    const select = document.getElementById("revisionExam");
    const groups = document.getElementById("revisionGroups");
    const summary = document.getElementById("revisionSummary");
    if (!select || !groups || !summary) return;

    let examList = exams;
    if (!Array.isArray(examList) && Array.isArray(dashboardExamList)) examList = dashboardExamList;
    if (!Array.isArray(examList)) {
        try { examList = await apiRequest("/exams"); }
        catch (error) {
            select.replaceChildren(new Option("Exams unavailable", ""));
            select.disabled = true;
            groups.textContent = "Could not load exams. Try refreshing the page.";
            summary.textContent = "Progress unavailable";
            renderDashboardRevisionPreview(null, []);
            console.error("Revision planner exam load failed:", error);
            return;
        }
    }

    const availableExams = examList.filter(exam => exam.status !== "Completed");
    select.replaceChildren(new Option(availableExams.length ? "Choose an upcoming exam" : "Add an upcoming exam first", ""));
    availableExams.forEach(exam => {
        const option = new Option(`${exam.subject} · ${exam.exam_date}`, String(exam.id));
        select.append(option);
    });
    select.disabled = availableExams.length === 0;

    let items;
    try { items = await apiRequest("/revisions"); }
    catch (error) {
        summary.textContent = "Progress unavailable";
        groups.textContent = "The revision planner is unavailable right now. Please refresh and try again.";
        renderDashboardRevisionPreview(null, availableExams);
        console.error("Revision planner load failed:", error);
        return;
    }

    const completed = items.filter(item => item.completed === true || item.completed === 1).length;
    const percent = items.length ? Math.round(completed / items.length * 100) : 0;
    summary.textContent = items.length ? `${completed} of ${items.length} sessions complete · ${percent}%` : "No revision sessions yet";
    renderDashboardRevisionPreview(items, availableExams);
    if (!items.length) {
        groups.textContent = "";
        const empty = document.createElement("p");
        empty.className = "revision-empty";
        empty.textContent = availableExams.length
            ? "Choose an upcoming exam and add the topics you want to revise. Your progress will appear here."
            : "Add an upcoming exam above to start a revision plan.";
        groups.append(empty);
        return;
    }

    const examGroups = new Map();
    items.forEach(item => {
        const key = String(item.exam_id);
        if (!examGroups.has(key)) examGroups.set(key, { subject: item.exam_subject, date: item.exam_date, items: [] });
        examGroups.get(key).items.push(item);
    });

    const cards = Array.from(examGroups.entries()).map(([examId, exam]) => {
        const card = document.createElement("section");
        card.className = "revision-exam-group";
        const head = document.createElement("div");
        head.className = "revision-exam-heading";
        const titleWrap = document.createElement("div");
        const title = document.createElement("h4"); title.textContent = exam.subject || "Exam";
        const date = document.createElement("p");
        const remaining = dateDistance(exam.date);
        date.textContent = `${exam.date || "Date not set"}${remaining !== null ? ` · ${remaining < 0 ? "Exam passed" : remaining === 0 ? "Today" : `${remaining} day${remaining === 1 ? "" : "s"} left`}` : ""}`;
        titleWrap.append(title, date);
        const doneCount = exam.items.filter(item => item.completed === true || item.completed === 1).length;
        const progress = document.createElement("span"); progress.className = "revision-group-count";
        progress.textContent = `${doneCount}/${exam.items.length} done`;
        head.append(titleWrap, progress);

        const track = document.createElement("div"); track.className = "revision-progress-track";
        track.setAttribute("role", "progressbar"); track.setAttribute("aria-label", `${exam.subject || "Exam"} revision progress`);
        track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "100");
        const fill = document.createElement("div"); fill.className = "revision-progress-fill";
        const examPercent = Math.round(doneCount / exam.items.length * 100);
        fill.style.width = `${examPercent}%`; track.setAttribute("aria-valuenow", String(examPercent)); track.append(fill);

        const list = document.createElement("div"); list.className = "revision-task-list";
        exam.items.forEach(item => {
            const row = document.createElement("div"); row.className = "revision-task";
            if (item.completed === true || item.completed === 1) row.dataset.completed = "true";
            const checkbox = document.createElement("input"); checkbox.type = "checkbox";
            checkbox.checked = item.completed === true || item.completed === 1;
            checkbox.dataset.revisionToggle = "true"; checkbox.dataset.revisionId = String(item.id);
            checkbox.setAttribute("aria-label", `${checkbox.checked ? "Mark incomplete" : "Mark complete"}: ${item.topic}`);
            const detail = document.createElement("div"); detail.className = "revision-task-detail";
            const topic = document.createElement("span"); topic.className = "revision-task-topic"; topic.textContent = item.topic;
            detail.append(topic);
            if (item.planned_date) {
                const planDate = document.createElement("small"); planDate.textContent = `Planned ${item.planned_date}`;
                const taskDays = dateDistance(item.planned_date);
                if (taskDays !== null && taskDays < 0 && !checkbox.checked) planDate.dataset.overdue = "true";
                detail.append(planDate);
            }
            const remove = document.createElement("button"); remove.type = "button"; remove.className = "revision-remove";
            remove.dataset.revisionDelete = String(item.id); remove.setAttribute("aria-label", `Remove ${item.topic}`);
            remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
            row.append(checkbox, detail, remove); list.append(row);
        });
        card.append(head, track, list);
        card.dataset.examId = examId;
        return card;
    });
    groups.replaceChildren(...cards);
}

function renderDashboardRevisionPreview(items, exams) {
    const preview = document.getElementById("dashboardRevisionPreview");
    if (!preview) return;
    if (!Array.isArray(items)) { preview.textContent = "Revision progress is unavailable right now."; return; }
    const finished = items.filter(item => item.completed === true || item.completed === 1).length;
    const percent = items.length ? Math.round(finished / items.length * 100) : 0;
    const summary = document.createElement("p");
    summary.className = "revision-dashboard-summary";
    summary.textContent = items.length ? `${finished} of ${items.length} revision topics complete · ${percent}%` : "No revision topics planned yet.";
    const track = document.createElement("div"); track.className = "revision-progress-track";
    track.setAttribute("role", "progressbar"); track.setAttribute("aria-label", "Overall revision progress");
    track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", "100"); track.setAttribute("aria-valuenow", String(percent));
    const fill = document.createElement("div"); fill.className = "revision-progress-fill"; fill.style.width = `${percent}%`; track.append(fill);
    const nextExam = (exams || []).filter(exam => dateDistance(exam.exam_date) !== null && dateDistance(exam.exam_date) >= 0)
        .sort((a, b) => dateDistance(a.exam_date) - dateDistance(b.exam_date))[0];
    const next = document.createElement("p"); next.className = "revision-dashboard-next";
    if (nextExam) {
        const examItems = items.filter(item => String(item.exam_id) === String(nextExam.id));
        next.textContent = `Next exam: ${nextExam.subject} · ${nextExam.exam_date}`;
        const pending = examItems.filter(item => !(item.completed === true || item.completed === 1)).slice(0, 3);
        const topics = document.createElement("ul"); topics.className = "revision-dashboard-topics";
        if (pending.length) pending.forEach(item => { const row = document.createElement("li"); row.textContent = item.topic; topics.append(row); });
        else {
            const row = document.createElement("li");
            row.textContent = examItems.length ? "All planned topics are complete." : "Add revision topics for this exam.";
            topics.append(row);
        }
        preview.replaceChildren(summary, track, next, topics);
    } else {
        next.textContent = exams?.length ? "No upcoming exams on your list." : "Add an exam to start planning revisions.";
        preview.replaceChildren(summary, track, next);
    }
}

const revisionForm = document.getElementById("addRevisionForm");
if (revisionForm && !revisionForm.dataset.bound) {
    revisionForm.dataset.bound = "true";
    revisionForm.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = document.getElementById("addRevisionButton");
        if (submit) submit.disabled = true;
        try {
            await apiRequest("/revisions", "POST", {
                exam_id: document.getElementById("revisionExam").value,
                topic: document.getElementById("revisionTopic").value,
                planned_date: document.getElementById("revisionDate").value
            });
            document.getElementById("revisionTopic").value = "";
            document.getElementById("revisionDate").value = "";
            await loadRevisionManager();
            showToast("Revision item added");
        } catch (error) { showToast(error.message || "Could not add revision item", "error"); }
        finally { if (submit) submit.disabled = false; }
    });
}

const revisionGroups = document.getElementById("revisionGroups");
if (revisionGroups && !revisionGroups.dataset.bound) {
    revisionGroups.dataset.bound = "true";
    revisionGroups.addEventListener("change", async event => {
        const checkbox = event.target.closest("[data-revision-toggle]");
        if (!checkbox) return;
        checkbox.disabled = true;
        try {
            await apiRequest(`/revisions/${checkbox.dataset.revisionId}`, "PUT", { completed: checkbox.checked });
            await loadRevisionManager();
        } catch (error) { checkbox.checked = !checkbox.checked; showToast(error.message || "Could not update progress", "error"); }
        finally { checkbox.disabled = false; }
    });
    revisionGroups.addEventListener("click", async event => {
        const button = event.target.closest("[data-revision-delete]");
        if (!button || !confirmDelete("Remove this revision item?")) return;
        button.disabled = true;
        try {
            await apiRequest(`/revisions/${button.dataset.revisionDelete}`, "DELETE");
            await loadRevisionManager();
            showToast("Revision item removed");
        } catch (error) { showToast(error.message || "Could not remove revision item", "error"); }
        finally { button.disabled = false; }
    });
}



// ------------------------------
// ADD EXAM
// ------------------------------

const examForm =
document.getElementById("addExamForm");

if(examForm){

examForm.addEventListener("submit",

async function(e){

    e.preventDefault();

    try{

        await apiRequest(

            "/exams",

            "POST",

            {

                subject:
                document.getElementById("examSubject").value,

                exam_date:
                document.getElementById("examDate").value

            }

        );

        examForm.reset();

        loadExams();

        loadUpcomingExams();
        loadDailyStudyFeatures();

        loadDashboard();

        showToast("Exam Added");

    }

    catch(err){

        showToast(err.message,"error");

    }

});

}



// ------------------------------
// DELETE EXAM
// ------------------------------

async function deleteExam(id){

    if(!confirmDelete()) return;

    await apiRequest(

        "/exams/"+id,

        "DELETE"

    );

    loadExams();

    loadUpcomingExams();
    loadDailyStudyFeatures();

    loadDashboard();

    showToast("Exam Deleted");

}



// ------------------------------
// UPCOMING EXAMS
// ------------------------------

async function loadUpcomingExams(){

    const container =
    document.getElementById("upcomingExams");

    if(!container) return;

    let exams;
    try { exams = await apiRequest("/exams/upcoming"); }
    catch (err) { container.textContent = "Upcoming exams are unavailable right now."; console.error("Upcoming exams:", err); return; }

    if(exams.length===0){

        container.innerHTML=

        "No upcoming exams.";

        return;

    }

    container.innerHTML="";

    container.replaceChildren(...exams.map(exam => {
        const item = document.createElement("div");
        item.className = "list-item";
        const title = document.createElement("strong");
        title.textContent = exam.subject || "Exam";
        const date = document.createElement("div");
        date.textContent = exam.exam_date || "Date not set";
        item.append(title, date);
        const days = Math.round((new Date(`${String(exam.exam_date).slice(0,10)}T00:00:00`) - new Date(new Date().setHours(0,0,0,0))) / 86400000);
        item.dataset.urgency = days <= 2 ? "soon" : "upcoming";
        return item;
    }));

}



// =========================================
// ATTENDANCE
// =========================================


// ------------------------------
// LOAD ATTENDANCE
// ------------------------------

async function loadAttendance(){

    const data =
    await apiRequest("/attendance");
    dashboardAttendanceData = data;

    document.getElementById(
        "attendancePercentage"
    ).textContent =
    data.percentage;

    document.getElementById(
        "attendanceProgress"
    ).style.width =
    data.percentage+"%";

    document.getElementById(
        "attendanceStatus"
    ).textContent =
    data.status;

    document.getElementById(
        "classesNeeded"
    ).textContent =
    data.need;

    const history =
    document.getElementById(
        "attendanceHistory"
    );

    if(history){

        history.innerHTML=`

        <tr>

            <td>

                ${data.attended}

            </td>

            <td>

                ${data.total}

            </td>

            <td>

                ${data.percentage}%

            </td>

            <td>

                ${data.status}

            </td>

        </tr>

        `;

    }

}



// ------------------------------
// SAVE ATTENDANCE
// ------------------------------

const attendanceForm =
document.getElementById(
"attendanceForm"
);

if(attendanceForm){

attendanceForm.addEventListener(

"submit",

async function(e){

    e.preventDefault();

    try{

        await apiRequest(

            "/attendance",

            "POST",

            {

                attended:
                document.getElementById("attended").value,

                total:
                document.getElementById("totalClasses").value

            }

        );

        loadAttendance();

        loadDashboard();

        showToast(
            "Attendance Updated"
        );

    }

    catch(err){

        showToast(
            err.message,
            "error"
        );

    }

});

}



// =========================================
// SETTINGS PAGE BUTTONS
// =========================================

const settingsThemeToggle =
document.getElementById("settingsThemeToggle");

if (settingsThemeToggle) {

    settingsThemeToggle.addEventListener("click", () => {

        const dark =
        document.documentElement.getAttribute("data-theme");

        if (dark === "dark") {

            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("theme", "light");

        } else {

            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("theme", "dark");

        }

    });

}

const settingsLogoutBtn =
document.getElementById("settingsLogoutBtn");

if (settingsLogoutBtn) {

    settingsLogoutBtn.addEventListener("click", async () => {

        await fetch("/logout");
        window.location = "/login";

    });

}
// =========================================
// PART 5
// FINAL
// =========================================



// =========================================
// LOGOUT
// =========================================

const logoutBtn =
document.getElementById("logoutBtn");

if(logoutBtn){

logoutBtn.addEventListener("click",

async ()=>{

    try{

        await fetch("/logout");

        window.location="/login";

    }

    catch(err){

        console.log(err);

    }

});

}



// =========================================
// SEARCH SUBJECT
// =========================================

const searchBox =
document.getElementById("searchBox");

if(searchBox){

searchBox.addEventListener(

"keyup",

async function(){

    const keyword=this.value;

    try{

        const subjects=
        await apiRequest(
            "/subjects/search?q="+keyword
        );

        const table=
        document.getElementById(
            "subjectTable"
        );

        if(subjects.length===0){

            table.innerHTML=`

            <tr>

            <td colspan="4">

            No Subject Found

            </td>

            </tr>

            `;

            return;

        }

        table.innerHTML="";

        subjects.forEach(subject=>{

            table.innerHTML+=`

            <tr>

                <td>

                ${subject.subject_name}

                </td>

                <td>

                ${subject.difficulty}

                </td>

                <td>

                ${subject.study_hours}

                </td>

                <td>

                <button
                class="btn-danger"
                onclick="deleteSubject(${subject.id})">

                Delete

                </button>

                </td>

            </tr>

            `;

        });

    }

    catch(err){

        console.log(err);

    }

});

}



// =========================================
// TAB NAVIGATION
// =========================================

const tabs=
document.querySelectorAll(".sidebar a");

tabs.forEach(tab=>{

tab.addEventListener("click",

function(e){

    e.preventDefault();

    const target=
    this.getAttribute("data-tab");

    document
    .querySelectorAll(".tab-content")

    .forEach(page=>{

        page.style.display="none";

    });

    const section=
    document.getElementById(

        target

    );

    if(section){

        section.style.display="block";

    }

    tabs.forEach(btn=>{

        btn.classList.remove("active");

    });

    this.classList.add("active");

});

});




// =========================================
// DAILY STUDY GOAL, STREAK, RECOMMENDATIONS AND REFRESH
const STUDY_KEY = "smartTimetableStudyTracker";
const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function studyState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STUDY_KEY) || "{}");
        const today = dayKey();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const last = saved.last || "";
        const streak = last === today || last === dayKey(yesterday) ? Number(saved.streak) || 0 : 0;
        return { date: today, minutes: saved.date === today ? Math.max(0, Number(saved.minutes) || 0) : 0, goal: Math.min(1440, Math.max(15, Number(saved.goal) || 120)), streak, last };
    } catch (_) { return { date: dayKey(), minutes: 0, goal: 120, streak: 0, last: "" }; }
}
function saveStudyState(state) { try { localStorage.setItem(STUDY_KEY, JSON.stringify(state)); } catch (error) { console.error("Study progress could not be saved:", error); } }
function renderStudyState() {
    const state = studyState();
    const label = document.getElementById("dailyStudyGoal");
    const bar = document.getElementById("studyGoalBar");
    const streak = document.getElementById("studyStreak");
    const goalInput = document.getElementById("studyGoalHours");
    const percent = Math.min(100, Math.round(state.minutes / state.goal * 100));
    if (label) label.textContent = `${(state.minutes / 60).toFixed(1)} / ${(state.goal / 60).toFixed(1)} hrs`;
    if (bar) { bar.style.width = `${percent}%`; bar.setAttribute("aria-valuenow", String(percent)); }
    if (bar?.parentElement) bar.parentElement.setAttribute("aria-valuenow", String(percent));
    if (streak) streak.textContent = String(state.streak);
    if (goalInput && document.activeElement !== goalInput) goalInput.value = (state.goal / 60).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}
function bindStudyControls() {
    const goalInput = document.getElementById("studyGoalHours");
    if (goalInput && !goalInput.dataset.studyBound) {
        goalInput.dataset.studyBound = "1";
        goalInput.addEventListener("change", () => {
            const hours = Number(goalInput.value);
            if (!(hours >= 0.25 && hours <= 24)) { showToast("Choose a goal between 0.25 and 24 hours.", "error"); renderStudyState(); return; }
            const state = studyState(); state.goal = Math.round(hours * 60); saveStudyState(state); renderStudyState(); buildStudyRecommendations();
        });
    }
    const logButton = document.getElementById("logStudySession");
    if (logButton && !logButton.dataset.studyBound) {
        logButton.dataset.studyBound = "1";
        logButton.addEventListener("click", () => {
            const input = document.getElementById("studyMinutes");
            const minutes = Math.round(Number(input?.value));
            if (!(minutes > 0 && minutes <= 1440)) { showToast("Enter study time from 1 to 1440 minutes.", "error"); return; }
            const state = studyState(), today = dayKey();
            if (state.last !== today) state.streak = state.last === dayKey(new Date(Date.now() - 86400000)) ? state.streak + 1 : 1;
            state.last = today; state.date = today; state.minutes += minutes; saveStudyState(state);
            if (input) input.value = "";
            renderStudyState(); buildStudyRecommendations(); showToast("Study time saved");
        });
    }
}
function dateDistance(value) {
    if (!value) return null;
    const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

function schoolReadyDayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderSchoolReady() {
    const root = document.getElementById("schoolReady");
    const content = document.getElementById("schoolReadyContent");
    if (!root || !content || !schoolReadyDataReady) return;

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = schoolReadyDayKey(tomorrow);
    const dayName = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(tomorrow);
    const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(tomorrow);
    document.getElementById("schoolReadyDate").textContent = dateLabel;

    const classes = (schoolReadyData.timetable || [])
        .filter(item => item.day === dayName)
        .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));
    const firstClass = classes[0] || null;
    const subjects = Array.from(new Map(classes.map(item => [String(item.subject || "").trim().toLocaleLowerCase(), String(item.subject || "").trim()])).values()).filter(Boolean);
    const dueTomorrow = (schoolReadyData.homework || []).filter(item => String(item.due_date || "").slice(0, 10) === dateKey && !/^(completed|done)$/i.test(item.status || ""));
    const assignmentsTomorrow = (schoolReadyData.assignments || []).filter(item => String(item.due_date || "").slice(0, 10) === dateKey && !/^(completed|done)$/i.test(item.status || ""));
    const examsTomorrow = (schoolReadyData.exams || []).filter(item => String(item.exam_date || "").slice(0, 10) === dateKey);

    const groups = [];
    const checklist = [];
    const addGroup = (title, items) => {
        if (items.length) groups.push({ title, items });
        checklist.push(...items);
    };
    if (firstClass) {
        groups.push({
            title: "First class",
            summary: `${firstClass.subject} · ${firstClass.start_time}${firstClass.end_time ? `–${firstClass.end_time}` : ""}`
        });
        addGroup("Pack notebooks", subjects.map(subject => ({ id: `notebook:${subject.toLocaleLowerCase()}`, label: `${subject} notebook`, detail: "Required for tomorrow's classes" })));
        addGroup("Tomorrow's classes", classes.map(item => ({ id: `class:${item.start_time}:${item.subject}`, label: `${item.subject} · ${item.start_time}${item.end_time ? `–${item.end_time}` : ""}`, detail: "Check this class on your timetable" })));
    } else {
        groups.push({ title: "First class", summary: "No classes are listed for tomorrow." });
    }
    addGroup("Homework due tomorrow", dueTomorrow.map(item => ({ id: `homework:${item.id ?? `${item.subject}:${item.title}`}`, label: item.title || item.subject || "Homework", detail: [item.subject, "Due tomorrow"].filter(Boolean).join(" · ") })));
    addGroup("Assignments due tomorrow", assignmentsTomorrow.map(item => ({ id: `assignment:${item.id ?? `${item.subject}:${item.title}`}`, label: item.title || item.subject || "Assignment", detail: [item.subject, "Due tomorrow"].filter(Boolean).join(" · ") })));
    addGroup("Exams & tests tomorrow", examsTomorrow.map(item => ({ id: `exam:${item.id ?? item.subject}`, label: item.subject || "Exam", detail: "Exam / test tomorrow" })));

    const reminders = [];
    if (firstClass) reminders.push({ id: "reminder:leave", label: `Leave on time for your ${firstClass.start_time} first class`, detail: `${classes.length} class${classes.length === 1 ? "" : "es"} scheduled tomorrow` });
    if (dueTomorrow.length || assignmentsTomorrow.length) reminders.push({ id: "reminder:due-work", label: "Keep tomorrow's due homework and assignments ready", detail: `${dueTomorrow.length + assignmentsTomorrow.length} item${dueTomorrow.length + assignmentsTomorrow.length === 1 ? "" : "s"} due` });
    if (examsTomorrow.length) reminders.push({ id: "reminder:exam", label: "Keep your exam materials and stationery ready", detail: "You have an exam or test tomorrow" });
    if (!reminders.length) reminders.push({ id: "reminder:check", label: "Check your school timetable and pack your essentials", detail: "No classes or due work found for tomorrow" });
    addGroup("Important reminders", reminders);

    let saved = {};
    const storageKey = `focusgridSchoolReady:${dateKey}`;
    try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch (_) { saved = {}; }
    const makeSection = group => {
        const section = document.createElement("section");
        section.className = "school-ready-section";
        const title = document.createElement("h4"); title.textContent = group.title; section.append(title);
        if (group.summary) {
            const summary = document.createElement("p"); summary.className = "school-ready-first-class"; summary.textContent = group.summary; section.append(summary);
        }
        (group.items || []).forEach(item => {
            const checked = Boolean(saved[item.id]);
            const row = document.createElement("div");
            row.className = "school-ready-item";
            row.dataset.checkId = item.id;
            row.dataset.packed = String(checked);
            row.setAttribute("role", "checkbox");
            row.setAttribute("aria-checked", String(checked));
            row.tabIndex = 0;
            const mark = document.createElement("span"); mark.className = "school-ready-mark"; mark.textContent = checked ? "✓" : "☐";
            const copy = document.createElement("span"); copy.className = "school-ready-item-copy";
            const label = document.createElement("strong"); label.textContent = item.label;
            const detail = document.createElement("small"); detail.textContent = item.detail || "";
            copy.append(label); if (item.detail) copy.append(detail);
            row.append(mark, copy); section.append(row);
        });
        return section;
    };
    content.replaceChildren(...groups.map(makeSection));

    const checkedCount = checklist.filter(item => Boolean(saved[item.id])).length;
    const totalCount = checklist.length;
    const percent = totalCount ? Math.round(checkedCount / totalCount * 100) : 0;
    const progress = root.querySelector(".school-ready-progress");
    document.getElementById("schoolReadyProgressText").textContent = `${checkedCount}/${totalCount} items packed`;
    document.getElementById("schoolReadyProgressBar").style.width = `${percent}%`;
    if (progress) progress.setAttribute("aria-valuenow", String(percent));
    const button = document.getElementById("schoolReadyButton");
    if (button) {
        button.disabled = totalCount === 0;
        button.innerHTML = totalCount > 0 && checkedCount === totalCount ? '<i class="fa-solid fa-check"></i> Ready for tomorrow ✓' : '<i class="fa-solid fa-check"></i> I\'m Ready';
    }

    if (!root.dataset.schoolReadyBound) {
        root.dataset.schoolReadyBound = "1";
        content.addEventListener("click", event => {
            const row = event.target.closest(".school-ready-item");
            if (row) toggleSchoolReadyItem(row);
        });
        content.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const row = event.target.closest(".school-ready-item");
            if (!row) return;
            event.preventDefault(); toggleSchoolReadyItem(row);
        });
        button?.addEventListener("click", markAllSchoolReadyItems);
    }
}

function getSchoolReadyState(storageKey) {
    try {
        const state = JSON.parse(localStorage.getItem(storageKey) || "{}");
        return state && typeof state === "object" && !Array.isArray(state) ? state : {};
    }
    catch (_) { return {}; }
}

function schoolReadyStorageKey() {
    const tomorrow = new Date(); tomorrow.setHours(0, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
    return `focusgridSchoolReady:${schoolReadyDayKey(tomorrow)}`;
}

function toggleSchoolReadyItem(row) {
    const storageKey = schoolReadyStorageKey();
    const state = getSchoolReadyState(storageKey);
    const next = row.getAttribute("aria-checked") !== "true";
    state[row.dataset.checkId] = next;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch (error) { console.error("School Ready checklist could not be saved:", error); }
    renderSchoolReady();
    Array.from(document.querySelectorAll("#schoolReadyContent .school-ready-item"))
        .find(item => item.dataset.checkId === row.dataset.checkId)?.focus();
}

function markAllSchoolReadyItems() {
    const root = document.getElementById("schoolReady");
    const storageKey = schoolReadyStorageKey();
    const state = getSchoolReadyState(storageKey);
    root?.querySelectorAll(".school-ready-item").forEach(row => { state[row.dataset.checkId] = true; });
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch (error) { console.error("School Ready checklist could not be saved:", error); }
    renderSchoolReady();
    if (root?.querySelectorAll(".school-ready-item").length) showToast("You're ready for tomorrow!");
}

function markUrgency(container) {
    if (!container) return;
    container.querySelectorAll(".list-item, .dashboard-preview-item").forEach(item => {
        const distance = dateDistance(item.dataset.dueDate || item.textContent.match(/\d{4}-\d{2}-\d{2}/)?.[0]);
        if (distance === null) return;
        item.dataset.urgency = distance < 0 ? "overdue" : distance === 0 ? "today" : distance <= 2 ? "soon" : "upcoming";
        if (distance <= 2 && !item.querySelector("[data-reminder]")) {
            const note = document.createElement("span"); note.dataset.reminder = "1";
            note.className = "dashboard-reminder-label";
            note.textContent = distance < 0 ? "Overdue" : distance === 0 ? "Due today" : `Due in ${distance} day${distance === 1 ? "" : "s"}`;
            item.append(" · ", note);
        }
    });
}
function buildImportantReminders() {
    const box = document.getElementById("dashboardReminders");
    if (!box) return;
    const reminders = [];
    document.querySelectorAll("#dashboardHomeworkPreview .dashboard-preview-item, #dashboardAssignmentsPreview .dashboard-preview-item, #pendingAssignments .list-item, #upcomingExams .list-item").forEach(item => {
        const date = item.dataset.dueDate || item.textContent.match(/\d{4}-\d{2}-\d{2}/)?.[0];
        const days = dateDistance(date);
        if (days === null || days > 7) return;
        reminders.push({ days, text: `${item.querySelector("strong")?.textContent || "Upcoming item"} · ${days < 0 ? "Overdue" : days === 0 ? "Today" : `in ${days} day${days === 1 ? "" : "s"}`}` });
    });
    const todaySlots = document.querySelectorAll("#todayTimetable tr");
    todaySlots.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length === 2 && !/no timetable/i.test(cells[0].textContent)) reminders.push({ days: 0, text: `${cells[1].textContent.trim()} class · ${cells[0].textContent.trim()}` });
    });
    reminders.sort((a, b) => a.days - b.days);
    const unique = Array.from(new Map(reminders.map(item => [item.text, item])).values()).slice(0, 5);
    if (!unique.length) { box.textContent = "No urgent reminders. Your upcoming tasks and exams will appear here."; return; }
    box.replaceChildren(...unique.map(reminder => { const row = document.createElement("div"); row.className = "dashboard-preview-item"; row.textContent = reminder.text; if (reminder.days < 0) row.dataset.urgency = "overdue"; else if (reminder.days <= 2) row.dataset.urgency = reminder.days === 0 ? "today" : "soon"; return row; }));
}
function buildStudyRecommendations() {
    const box = document.getElementById("smartRecommendations");
    if (!box) return;
    const state = studyState(), recommendations = [];
    const nearestExam = Array.from(document.querySelectorAll("#upcomingExams .list-item"))
        .map(item => ({ item, distance: dateDistance(item.textContent.match(/\d{4}-\d{2}-\d{2}/)?.[0]) }))
        .filter(entry => entry.distance !== null && entry.distance >= 0).sort((a, b) => a.distance - b.distance)[0];
    if (nearestExam) {
        const subject = nearestExam.item.querySelector("strong")?.textContent || "your exam subject";
        const difficulty = Array.from(document.querySelectorAll("#subjectTable tr")).find(row => row.cells?.[0]?.textContent.trim().toLowerCase() === subject.toLowerCase())?.cells?.[1]?.textContent.trim();
        recommendations.push(`Focus on ${subject} first — its exam is ${nearestExam.distance === 0 ? "today" : `in ${nearestExam.distance} day${nearestExam.distance === 1 ? "" : "s"}`}${difficulty ? ` and it is marked ${difficulty.toLowerCase()}` : ""}.`);
    }
    const urgent = Array.from(document.querySelectorAll("#dashboardHomeworkPreview .dashboard-preview-item, #dashboardAssignmentsPreview .dashboard-preview-item"))
        .map(item => ({ item, distance: dateDistance(item.dataset.dueDate) })).filter(x => x.distance !== null && x.distance <= 2).sort((a, b) => a.distance - b.distance)[0];
    if (urgent) recommendations.push(`Make time for “${urgent.item.querySelector("strong")?.textContent || "your upcoming task"}”${urgent.distance < 0 ? " — it is overdue" : urgent.distance === 0 ? " — due today" : " — due soon"}.`);
    recommendations.push(state.minutes < state.goal ? `You have ${state.goal - state.minutes} minutes left in today’s study goal.` : "Your daily study goal is complete. A short review can help reinforce today’s learning.");
    const subjectRows = Array.from(document.querySelectorAll("#subjectTable tr")).filter(row => row.cells?.length >= 3);
    const hardest = subjectRows.sort((a, b) => ({ Hard: 3, Medium: 2, Easy: 1 }[b.cells[1].textContent.trim()] || 0) - ({ Hard: 3, Medium: 2, Easy: 1 }[a.cells[1].textContent.trim()] || 0))[0];
    if (!nearestExam && hardest) recommendations.unshift(`Start with ${hardest.cells[0].textContent.trim()}, your highest-difficulty subject (${hardest.cells[2].textContent.trim()} planned study hours).`);
    const attendance = Number(document.getElementById("attendancePercent")?.textContent);
    if (dashboardAttendanceData?.total > 0 && Number.isFinite(attendance) && attendance < 75) recommendations.push(`Attendance is ${attendance.toFixed(1)}%; attending upcoming classes will help you get back on track.`);
    box.replaceChildren(...recommendations.slice(0, 4).map(text => { const item = document.createElement("div"); item.className = "list-item"; item.textContent = text; return item; }));
}
async function loadDailyStudyFeatures() { bindStudyControls(); renderStudyState(); markUrgency(document.getElementById("pendingAssignments")); markUrgency(document.getElementById("upcomingExams")); markUrgency(document.getElementById("dashboardHomeworkPreview")); markUrgency(document.getElementById("dashboardAssignmentsPreview")); buildImportantReminders(); buildStudyRecommendations(); }
async function refreshDashboardTaskPanels() { await loadDashboardTaskPreviews(); await loadDailyStudyFeatures(); }
async function refreshDashboard(notify = true) {
    if (dashboardRefreshPromise) return dashboardRefreshPromise;
    const promise = initializeDashboard({ showLoading: true });
    try { await promise; if (notify) showToast("Dashboard Updated"); return promise; }
    finally { /* initializeDashboard owns the loading state and in-flight lock */ }
}
const refreshBtn = document.getElementById("refreshDashboard");
if (refreshBtn && !refreshBtn.dataset.refreshBound) { refreshBtn.dataset.refreshBound = "1"; refreshBtn.addEventListener("click", () => refreshDashboard()); }
window.addEventListener("unhandledrejection", event => console.error(event.reason));
document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
    bindStudyControls();
    window.setInterval(() => { if (document.visibilityState === "visible") refreshDashboard(false); }, 60000);
});

document.addEventListener("click", event => {
    const button = event.target.closest("#openRevisionManager, #openTimetableGenerator");
    if (!button) return;
    const tabId = button.id === "openRevisionManager" ? "tab-exams" : "tab-ai-generator";
    document.querySelector(`.sidebar a[data-tab="${tabId}"]`)?.click();
});
