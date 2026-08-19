# KLICKIT Job Sheet Dashboard

A full-stack job sheet management system for tracking branch-wise work orders, job statuses, repair status, ETA management, and analytics. The project combines a React + Vite frontend with a Django REST API backend and MySQL database.

## Overview


<img width="1359" height="646" alt="image" src="https://github.com/user-attachments/assets/80267577-63f6-437c-ba40-de64fdbe7c68" />

<img width="1362" height="644" alt="image" src="https://github.com/user-attachments/assets/66fb9e8e-1e12-460c-9bee-7cc46f6a328c" />

<img width="1366" height="688" alt="image" src="https://github.com/user-attachments/assets/8faa9d83-a58a-4b6f-be7d-893dadde2d1c" />



<img width="1365" height="692" alt="image" src="https://github.com/user-attachments/assets/d7beb3b3-db45-4066-8d18-a5b6703dd8fc" />


<img width="1358" height="646" alt="image" src="https://github.com/user-attachments/assets/803da03e-8b44-4a82-b89c-5586e57f5b15" />

This application is designed to manage and monitor job sheets across multiple branches. It includes:

- Job creation, editing, and deletion
- Branch-wise filtering and role-based visibility
- Job status tracking with repair and rejection handling
- Advance paid status tracking
- ETA and approved ETA management
- Dashboard analytics and branch statistics
- JWT-based authentication for users and employees
- REST API structure for frontend integration

## Tech Stack

### Frontend
- React 19
- Vite 8
- React Router DOM
- CSS modules / custom CSS
- JavaScript (ES modules)

### Backend
- Django 5.0
- Django REST Framework
- Django CORS Headers
- Django Filter
- SimpleJWT
- drf-spectacular
- MySQL client
- Pillow

### Database
- MySQL

### Tools / Integrations
- JWT authentication
- Role-based access logic
- REST API endpoints
- CORS configuration for frontend-backend communication

## Project Structure

```bash
.
├── README.md
├── package-lock.json
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── css/
│       ├── pages/
│       └── utils/
├── frontend_bk/
│   ├── assets/
│   ├── css/
│   └── js/
└── klickit_backend/
    ├── manage.py
    ├── requirements.txt
    ├── accounts/
    ├── jobsheets/
    └── klickit_backend/
```

## Features

### Dashboard
- Job sheet list with filters for branch, status, ETA, and search query
- Pagination support
- Sidebar summary and stats cards
- Create, edit, and delete actions
- Login and protected route access

### Analytics
- Tracking of open, closed, and rejected jobs
- ETA trend calculations
- Job volume by date
- Status donut chart and branch-wise bar views
- Repair outcome summary

### Authentication & Roles
- User registration
- Login and logout
- JWT token-based session handling
- Role-based branch visibility and admin access rules

### Job Model Fields
- Job number
- Branch
- Assigned employee
- Submission date
- ETA
- Approved ETA
- Status
- Advance paid status
- Repair flag (`is_repaired`)

## Backend API

Main backend routes are exposed under:

```bash
/api/
/api/auth/
```

Examples:

```bash
/api/auth/register/
/api/auth/login/
/api/auth/logout/
/api/auth/employees/

/api/apiview/jobsheets/
/api/apiview/jobsheets/<id>/
/api/apiview/jobsheets/stats/
/api/apiview/branches/
```

## Environment Setup

### 1. Clone the project

```bash
git clone <your-repository-url>
cd <project-folder>
```

### 2. Backend setup

```bash
cd klickit_backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Database configuration

Update the MySQL connection in:

- `klickit_backend/klickit_backend/settings.py`

Make sure your MySQL database exists and credentials match your local or server environment.

### 4. Run migrations

```bash
python manage.py migrate
```

### 5. Create admin user (optional)

```bash
python manage.py createsuperuser
```

### 6. Start Django server

```bash
python manage.py runserver
```

Default backend URL:

```bash
http://127.0.0.1:8000
```

### 7. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Default frontend URL:

```bash
http://localhost:5173
```

## Build for Production

```bash
cd frontend
npm run build
```

The production build is generated in the Vite output directory and can be served with a web server or deployed to hosting platforms.

## Notes

- The backend is configured for production-like CORS and trusted origins.
- The project uses MySQL for the main database, while the current development configuration can be adjusted for SQLite or cloud database usage.
- `frontend_bk` contains an older static HTML/JS version and can be treated as a legacy backup or reference.
- The app includes custom business logic for status handling such as `Closed`, `Rejected`, `Advance Paid`, and `is_repaired` tracking.

## License

This project is for internal business use unless a separate license is provided by the owner.

## Author / Maintainer

KLICKIT Job Sheet Management System
