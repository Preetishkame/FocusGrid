# 📚 FocusGrid

An AI-powered student management website built using **Python (Flask), HTML, CSS, JavaScript, and PostgreSQL**.

Smart Timetable AI helps students organize their studies by managing homework, assignments, exams, attendance, and generating a personalized study timetable.

---

## 🚀 Features

* 🔐 User Registration & Login
* 📅 Smart Timetable Generator
* 📖 Homework Manager
* 📝 Assignment Tracker
* 📚 Exam Schedule & Reminders
* 📊 Attendance Calculator
* 🤖 AI Study Timetable Generator
* 🎒 School Ready Checklist
* 📈 Dashboard Overview
* 🗄️ PostgreSQL Database
* 📱 Responsive Design

---

## 🛠️ Built With

* Python 3
* Flask
* PostgreSQL
* HTML5
* CSS3
* JavaScript
* Flask-CORS
* Werkzeug

---

## 📂 Project Structure

```
Smart-Timetable-AI/
│
├── app.py
├── requirements.txt
├── README.md
├── write_up.md
│
├── templates/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── dashboard.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── app.js
│       ├── auth.js
│       └── dashboard.js
```

---

## ⚙️ Installation

Open your browser

```
https://student-timetable-ai.onrender.com/
```



## 💻 Screens

- Home Page
- Login Page
- Register Page
- Dashboard
- Homework
- Assignments
- Attendance
- Exams
- AI Timetable Generator

---

## 🤖 AI Timetable Generator

The AI Timetable Generator creates a personalized study schedule based on information provided by the student.

It can consider:

* Subjects
* Available study hours
* Wake-up time
* Study requirements

The application organizes study sessions according to the available time and creates a structured study schedule.

---

## 📚 Academic Reminders

### 📝 Homework Reminder

Students can add their homework and keep track of pending work and deadlines.

### 📋 Assignment Reminder

Students can record assignments and their due dates so they can complete them on time.

### 📖 Exam Reminder

Students can add upcoming examinations and keep track of important exam dates for better preparation.

---

## 📊 Attendance Calculator

The Attendance Calculator helps students calculate their attendance percentage.

Students can enter:

* Classes attended
* Total classes

The application calculates the attendance percentage and displays the result.

---

## 🗄️ Database

**PostgreSQL** is used as the database for the application.

It stores and manages information such as:

* Users
* Subjects
* Homework
* Assignments
* Exams
* Attendance
* Timetable

PostgreSQL provides reliable data storage and also makes the application suitable for online deployment.

---

## 🌐 Deployment

The application can be deployed online using a cloud hosting service with a PostgreSQL database.

The database connection can be configured using environment variables, making the project suitable for deployment platforms such as Render.

---

## 📌 Future Scope

Smart Timetable AI can be improved further by adding more useful features in the future.

Other possible improvements include:

* 🔔 Notification and reminder alerts
* 📅 Calendar integration
* 🤖 More personalized AI study recommendations
* 📈 Study progress tracking
* 📊 Subject-wise attendance
* 📱 Mobile application
* ☁️ Cloud-based data management

---

## 📄 Project Write-up

A detailed project write-up is included in the file:

```text
write_up.md
```

The write-up contains:

* Introduction
* Objectives
* Technologies Used
* Working of the Project
* Main Features
* Advantages
* Future Scope
* Conclusion

---

## 👨‍💻 Author

**Preetish**

Class 10 Student

---

## 📄 License

This project is created for educational purposes and school projects.

---

## 🎒 School Ready

**School Ready** combines the school bag checklist and before-you-leave reminders into one dashboard feature. It prepares a checklist for the next calendar day using the student's existing timetable, homework, assignments, and exams.

The panel can show:

* Tomorrow's date and day
* The first scheduled class and its time
* Notebooks needed for tomorrow's subjects
* Homework and assignments due tomorrow
* Exams or tests scheduled for tomorrow
* Helpful reminders, such as leaving on time and keeping due work ready

Checklist items can be checked or unchecked. The packed count and progress bar update immediately, and the **I'm Ready** button marks the remaining items as ready. Checklist progress is saved in the browser for that date, so refreshing the dashboard does not clear it. A new checklist is shown for each date.
