# FocusGrid

## 1. Introduction

FocusGrid is a web-based application designed to help students manage their studies and school activities in an organized way. Students often have to remember their timetable, homework, assignments, exams and attendance at the same time. Managing all these things can sometimes become difficult.

This project provides a platform where students can organize their study timetable and keep track of important academic activities. It includes **homework and assignment tracking, exams and revision planning, attendance, and School Ready checklists**.

The main aim of this project is to make student life more organized by bringing important academic information together in one place.

## 2. Objectives

The main objectives of FocusGrid are:

* To help students create and manage their study timetable.
* To remind students about upcoming examinations.
* To keep track of homework and assignments.
* To help students calculate their attendance percentage.
* To help students prepare their school bag and plan before leaving for school.
* To reduce the chances of forgetting important school work.
* To provide a simple and user-friendly web application.
* To help students manage their time more effectively.

## 3. Technologies Used

The project is developed using the following technologies:

**Python:** Used for the main programming and backend of the application.

**Flask:** A Python web framework used to connect the website with the backend.

**HTML:** Used to create the structure of the web pages.

**CSS:** Used to design the website and make it visually attractive.

**JavaScript:** Used to provide interactive features and improve the user experience.

**PostgreSQL:** Used as the database to store and manage user and application data.

These technologies work together to create a functional and easy-to-use web application.

## 4. Working of the Project

When the user opens the FocusGrid website, they can access different features from the application. The user can enter their academic information and use the available tools according to their needs.

The **Timetable** feature helps students organize their study schedule. The **Exam Reminder** helps them keep track of upcoming examinations. Similarly, students can add their **homework and assignments** so that they can remember and complete them on time.

The application also provides an **Attendance Calculator**. Students can enter the required attendance details, and the application calculates their attendance percentage.

The **Exam & Revision Manager** organizes exam dates and revision topics. **School Ready** uses the next day's timetable and due work to prepare a school checklist.

The backend of the application is developed using Python and Flask. The information entered by the user is processed by the application and stored or retrieved from the **PostgreSQL database** when required.

Thus, the frontend, backend and database work together to provide the different features of the application.

## 5. Main Features

### 1. Study Timetable

Students can organize their subjects and study time into a proper timetable. This helps them follow a planned study routine.

### 2. Exam Reminder

Students can add upcoming examinations and keep track of important exam dates. This helps them prepare in advance.

### 3. Homework Reminder

The application allows students to keep a record of their homework. It helps them remember pending work and complete it on time.

### 4. Assignment Reminder

Students can add assignment details and deadlines. This makes it easier to keep track of assignments.

### 5. Attendance Calculator

The attendance calculator helps students calculate their attendance percentage by entering the required attendance information.

### 6. PostgreSQL Database

PostgreSQL is used to store and manage the information required by the application.

### 7. User-Friendly Interface

The website is designed to be simple so that students can easily understand and use its different features.

### 8. Exam & Revision Manager

Students can add topics or chapters to revise for an exam, optionally plan a date, and mark each topic complete. Revision progress remains connected to the relevant exam.

### 9. School Ready

The dashboard prepares for the next school day using the saved timetable, homework, assignments and exams. It shows the first class and time, subject notebooks, work due, exams and reminders. Students can check items off, see their packing progress, and use the **I'm Ready** button. Checklist state is saved in the browser for that date.

## 6. Advantages

FocusGrid has several advantages for students. It brings different academic activities together in one application instead of requiring students to manage them separately.

The reminder features can help students remember exams, homework and assignments. The timetable feature helps in planning study time, while the attendance calculator makes attendance calculation easier.

The application can save time and help students stay more organized. It also demonstrates how programming and databases can be used to solve a real-life problem.

## 7. Future Scope

The project can be improved further in the future by adding more useful features for students. Some possible future features are:

* **Notifications:** Automatic notifications can remind students about exams, homework and assignments.
* **Study Progress Tracking:** Students could track their progress in different subjects.
* **Subject-wise Attendance:** Attendance could be calculated separately for each subject.
* **Personalized Study Suggestions:** The application could provide study suggestions according to the student's schedule and pending work.

These features can make FocusGrid more useful as a complete student-management application.

## 8. Conclusion

FocusGrid is a student-management web application developed using **Python, Flask, HTML, CSS, JavaScript and PostgreSQL**. It provides a study timetable, homework and assignment tracking, exam and revision management, attendance tools and the School Ready checklist.

Through this project, I learned the basics of Python programming, web development, database management and how frontend and backend components work together.

The project helped me understand how technology can be used to solve everyday problems faced by students. FocusGrid aims to make academic planning easier, more organized and more convenient for students.

## 9. Project Development Steps and Timeline

The following sequence describes how the project was developed, from its first working version to the current features. Dates are based on milestones recorded in the project Git history. Early commits record broad updates rather than an exact date for every individual screen or feature, so related work is grouped into date ranges.

### Step 1: Identify the student-planning problem — project planning

The project began with the goal of bringing study schedules, homework, assignments, exams and attendance tools into one place. The main users and the information they would need to manage were identified before building the application.

### Step 2: Set up the first application — 7 July 2026

The first project files and README were committed on 7 July. The application foundation was built with Flask for the server, HTML and CSS for the pages, JavaScript for browser interactions, and a database for saving student information.

### Step 3: Build the website pages and account flow — 7–10 July 2026

The home page, registration page, login page and dashboard were connected to the Flask application. Registration, login and logout were added so a student could access their dashboard. The initial visual design and browser-side application scripts were developed during this first implementation period.

### Step 4: Add student data and academic management — 7–10 July 2026

The database and backend routes were expanded to support subjects, timetable entries, homework, assignments, exams and attendance. Add, display, update or delete actions were connected between the dashboard and backend.

### Step 5: Add timetable generation and dashboard summaries — July 2026

Subject information was used to create study timetable entries. Dashboard summaries and tables were connected to saved data so students could see their academic information after logging in. The timetable and database received follow-up fixes through 10 July.

### Step 6: Update project documentation and database setup — 6–21 September 2026

The author information and project documentation were revised on 6 September. On 21 September, backend dependencies and PostgreSQL documentation were updated, and the project write-up was added and converted to Markdown format.

### Step 7: Improve the dashboard and add study tools — 4 October 2026

The dashboard was enhanced with clearer theme styling, search and refreshed schedule views. Study goals, study-time logging, streaks, reminders and recommendations were added or refined. The dashboard was adjusted so saved schedules and due items are easier to find.

### Step 8: Add Exam & Revision Manager — 4 October 2026

Exam records were extended with revision topics, optional planned dates and completion tracking. The dashboard can show revision progress and provides access to the revision manager.

### Step 9: Add School Ready — 4 October 2026

The school-bag checklist and before-you-leave reminders were combined into **School Ready**. It uses the next day's saved timetable, homework, assignments and exams to prepare notebooks and reminders. Interactive checklist progress is saved per date in the browser, and the **I'm Ready** action can complete the remaining items.

### Step 10: Review and prepare the project for use — ongoing

The pages, API connections, themes, dashboard refresh behavior and newly added features are reviewed as the project changes. README and this write-up are updated to describe implemented functionality. The deployed application uses PostgreSQL configuration supplied by its hosting environment.

This sequence shows the project moving from its initial idea and core website to academic management tools, then to personalized study planning and next-day school preparation.
