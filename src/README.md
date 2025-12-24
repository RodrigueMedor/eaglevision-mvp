# Eagle Vision MVP - Backend Setup Guide

This guide provides step-by-step instructions for setting up the Python backend with GraphQL and PostgreSQL for the Eagle Vision MVP project.

## Prerequisites

- Python 3.9 or higher
- PostgreSQL 13 or higher
- pip (Python package manager)
- Node.js and npm (for frontend development)

## Backend Setup

### 1. Clone the Repository (if not already cloned)
```bash
git clone <repository-url>
cd eaglevision-mvp
```

### 2. Set Up Python Virtual Environment
```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Set Up PostgreSQL
1. Install PostgreSQL if not already installed
2. Create a new database for the project:
   ```sql
   CREATE DATABASE eaglevision_db;
   CREATE USER eaglevision_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE eaglevision_db TO eaglevision_user;
   ```

### 5. Configure Environment Variables
Create a `.env` file in the backend directory with the following variables:
```
DATABASE_URL=postgresql://eaglevision_user:your_secure_password@localhost:5432/eaglevision_db
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 6. Run Database Migrations
```bash
python manage.py migrate
```

### 7. Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

### 8. Start the Development Server
```bash
python manage.py runserver
```

The GraphQL playground will be available at: http://localhost:8000/graphql/

## Frontend Development

### 1. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the frontend directory:
```
REACT_APP_GRAPHQL_ENDPOINT=http://localhost:8000/graphql/
REACT_APP_API_URL=http://localhost:8000
```

### 3. Start the Frontend Development Server
```bash
npm start
```

The frontend will be available at: http://localhost:3000

## Project Structure

```
eaglevision-mvp/
├── backend/                 # Python backend
│   ├── eaglevision/         # Main project package
│   ├── users/               # User management app
│   ├── appointments/        # Appointments app
│   ├── services/            # Services app
│   ├── manage.py            # Django management script
│   └── requirements.txt     # Python dependencies
├── frontend/               # React frontend (existing)
│   ├── public/
│   └── src/
└── README.md               # This file
```

## Available GraphQL Endpoints

- **GraphiQL Interface**: http://localhost:8000/graphql/
- **GraphQL API**: http://localhost:8000/graphql/

## Development Workflow

1. Make changes to the backend code
2. Run tests: `python manage.py test`
3. Create and apply migrations if you've changed models:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```
4. Test your changes using the GraphiQL interface
5. Commit and push your changes

## Deployment

For production deployment, you'll need to:
1. Set `DEBUG=False` in your production settings
2. Configure a production database
3. Set up a production-grade WSGI server (Gunicorn, uWSGI)
4. Configure a web server (Nginx, Apache)
5. Set up SSL certificates
6. Configure environment variables in production

## Troubleshooting

- **Database connection issues**: Verify your PostgreSQL service is running and credentials are correct
- **Missing dependencies**: Run `pip install -r requirements.txt`
- **Port conflicts**: Ensure no other service is using ports 8000 (backend) or 3000 (frontend)

## Support

For any issues or questions, please contact the development team.
