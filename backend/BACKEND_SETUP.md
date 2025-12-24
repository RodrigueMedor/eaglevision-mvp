# Backend Setup Guide for Eagle Vision MVP

## Step 1: Project Initialization

1. Create and activate virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

2. Install required packages:
   ```bash
   pip install django djangorestframework django-cors-headers graphene-django django-filter psycopg2-binary python-dotenv
   ```

3. Create `requirements.txt`:
   ```bash
   pip freeze > requirements.txt
   ```

## Step 2: Django Project Setup

1. Create Django project and apps:
   ```bash
   django-admin startproject eaglevision .
   python manage.py startapp services
   python manage.py startapp appointments
   python manage.py startapp users
   ```

2. Update `eaglevision/settings.py`:
   ```python
   INSTALLED_APPS = [
       # Django apps
       'django.contrib.admin',
       'django.contrib.auth',
       'django.contrib.contenttypes',
       'django.contrib.sessions',
       'django.contrib.messages',
       'django.contrib.staticfiles',
       
       # Third-party apps
       'rest_framework',
       'corsheaders',
       'graphene_django',
       
       # Local apps
       'services',
       'appointments',
       'users',
   ]
   
   MIDDLEWARE = [
       'django.middleware.security.SecurityMiddleware',
       'corsheaders.middleware.CorsMiddleware',  # Add this line
       'django.contrib.sessions.middleware.SessionMiddleware',
       'django.middleware.common.CommonMiddleware',
       'django.middleware.csrf.CsrfViewMiddleware',
       'django.contrib.auth.middleware.AuthenticationMiddleware',
       'django.contrib.messages.middleware.MessageMiddleware',
       'django.middleware.clickjacking.XFrameOptionsMiddleware',
   ]
   
   # CORS settings
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",  # React frontend
   ]
   
   # Database
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'eaglevision',
           'USER': 'eaglevision_user',
           'PASSWORD': 'yourpassword',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   
   # GraphQL
   GRAPHENE = {
       'SCHEMA': 'eaglevision.schema.schema',
       'MIDDLEWARE': [
           'graphql_jwt.middleware.JSONWebTokenMiddleware',
       ],
   }
   
   AUTHENTICATION_BACKENDS = [
       'graphql_jwt.backends.JSONWebTokenBackend',
       'django.contrib.auth.backends.ModelBackend',
   ]
   ```

## Step 3: Database Models

1. Create models in `services/models.py`:
   ```python
   from django.db import models
   from django.contrib.auth import get_user_model
   
   User = get_user_model()
   
   class Service(models.Model):
       name = models.CharField(max_length=100)
       description = models.TextField(blank=True)
       duration = models.PositiveIntegerField(help_text="Duration in minutes")
       price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
       is_active = models.BooleanField(default=True)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)
   
       def __str__(self):
           return self.name
   ```

2. Create models in `appointments/models.py`:
   ```python
   from django.db import models
   from django.contrib.auth import get_user_model
   from services.models import Service
   
   User = get_user_model()
   
   class Appointment(models.Model):
       STATUS_CHOICES = [
           ('scheduled', 'Scheduled'),
           ('completed', 'Completed'),
           ('cancelled', 'Cancelled'),
           ('no_show', 'No Show'),
       ]
   
       user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
       service = models.ForeignKey(Service, on_delete=models.PROTECT)
       date = models.DateField()
       start_time = models.TimeField()
       end_time = models.TimeField()
       status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
       notes = models.TextField(blank=True)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)
   
       class Meta:
           ordering = ['date', 'start_time']
   
       def __str__(self):
           return f"{self.user.email} - {self.service.name} on {self.date} at {self.start_time}"
   ```

3. Create models in `users/models.py`:
   ```python
   from django.contrib.auth.models import AbstractUser
   from django.db import models
   
   class User(AbstractUser):
       ROLE_CHOICES = [
           ('client', 'Client'),
           ('staff', 'Staff'),
           ('admin', 'Admin'),
       ]
       
       email = models.EmailField(unique=True)
       phone = models.CharField(max_length=20, blank=True)
       role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='client')
       
       USERNAME_FIELD = 'email'
       REQUIRED_FIELDS = ['username']
   
       def __str__(self):
           return self.email
   ```

4. Run migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

## Step 4: GraphQL Schema

1. Create `eaglevision/schema.py`:
   ```python
   import graphene
   import graphql_jwt
   from graphene_django import DjangoObjectType
   from django.contrib.auth import get_user_model
   from services.models import Service
   from appointments.models import Appointment
   
   class UserType(DjangoObjectType):
       class Meta:
           model = get_user_model()
           exclude = ('password',)
   
   class ServiceType(DjangoObjectType):
       class Meta:
           model = Service
           fields = '__all__'
   
   class AppointmentType(DjangoObjectType):
       class Meta:
           model = Appointment
           fields = '__all__'
   
   class Query(graphene.ObjectType):
       all_services = graphene.List(ServiceType)
       service = graphene.Field(ServiceType, id=graphene.Int())
       all_appointments = graphene.List(AppointmentType)
       my_appointments = graphene.List(AppointmentType)
   
       def resolve_all_services(self, info, **kwargs):
           return Service.objects.filter(is_active=True)
   
       def resolve_service(self, info, id):
           return Service.objects.get(pk=id)
   
       def resolve_all_appointments(self, info, **kwargs):
           user = info.context.user
           if not user.is_authenticated or not user.is_staff:
               raise Exception("Authentication credentials were not provided")
           return Appointment.objects.all()
   
       def resolve_my_appointments(self, info, **kwargs):
           user = info.context.user
           if not user.is_authenticated:
               raise Exception("Authentication credentials were not provided")
           return Appointment.objects.filter(user=user)
   
   class CreateAppointment(graphene.Mutation):
       class Arguments:
           service_id = graphene.Int(required=True)
           date = graphene.Date(required=True)
           start_time = graphene.Time(required=True)
           notes = graphene.String()
   
       appointment = graphene.Field(AppointmentType)
   
       def mutate(self, info, service_id, date, start_time, notes=None):
           user = info.context.user
           if not user.is_authenticated:
               raise Exception("Authentication credentials were not provided")
   
           service = Service.objects.get(pk=service_id)
           end_time = (datetime.combine(date, start_time) + timedelta(minutes=service.duration)).time()
   
           appointment = Appointment(
               user=user,
               service=service,
               date=date,
               start_time=start_time,
               end_time=end_time,
               notes=notes,
               status='scheduled'
           )
           appointment.save()
   
           return CreateAppointment(appointment=appointment)
   
   class Mutation(graphene.ObjectType):
       token_auth = graphql_jwt.ObtainJSONWebToken.Field()
       verify_token = graphql_jwt.Verify.Field()
       refresh_token = graphql_jwt.Refresh.Field()
       
       create_appointment = CreateAppointment.Field()
   
   schema = graphene.Schema(query=Query, mutation=Mutation)
   ```

## Step 5: Authentication Setup

1. Install required packages:
   ```bash
   pip install django-graphql-jwt
   ```

2. Update `eaglevision/urls.py`:
   ```python
   from django.contrib import admin
   from django.urls import path
   from django.views.decorators.csrf import csrf_exempt
   from graphene_django.views import GraphQLView
   from django.views.generic import TemplateView
   
   urlpatterns = [
       path('admin/', admin.site.urls),
       path('graphql/', csrf_exempt(GraphQLView.as_view(graphiql=True))),
   ]
   ```

## Step 6: Testing the Backend

1. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

2. Run the development server:
   ```bash
   python manage.py runserver
   ```

3. Access the GraphiQL interface at: http://localhost:8000/graphql/

4. Test the API with these sample queries:

   ```graphql
   # Get all services
   {
     allServices {
       id
       name
       description
       duration
       price
     }
   }
   
   # Create an appointment (requires authentication)
   mutation {
     tokenAuth(username: "admin", password: "yourpassword") {
       token
     }
   }
   
   # Use the token in the HTTP Headers:
   # {"Authorization": "JWT <token>"}
   
   mutation {
     createAppointment(
       serviceId: 1,
       date: "2025-11-15",
       startTime: "14:00:00",
       notes: "Initial consultation"
     ) {
       appointment {
         id
         service {
           name
         }
         date
         startTime
         endTime
         status
       }
     }
   }
   ```

## Next Steps

1. Set up environment variables using `python-dotenv`
2. Add more GraphQL mutations and queries
3. Implement input validation
4. Add error handling
5. Write unit tests
6. Set up CI/CD pipeline

Would you like me to explain any part of this setup in more detail or help you with the next steps?
