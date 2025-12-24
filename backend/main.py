import os
import sys
import json
import logging
import base64
import requests
import datetime
from typing import Any, Dict, List, Optional, Union, Callable, Awaitable
from contextlib import asynccontextmanager

# Add the project root to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Load environment variables first
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO'))
logger = logging.getLogger(__name__)

# FastAPI and related imports
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.exceptions import RequestValidationError, HTTPException as FastAPIHTTPException
from fastapi.responses import JSONResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.authentication import AuthenticationMiddleware
from pydantic import BaseModel, EmailStr, validator, root_validator
from sqlalchemy.orm import Session
from sqlalchemy import text

# Security imports
from backend.security import setup_security, limiter
from backend.redis_client import redis_client

# GraphQL imports will be done after app initialization to avoid circular imports

# Local imports
from backend.auth import oauth2_scheme, get_current_active_user
from backend.database import get_db, init_db, SessionLocal
from backend.contact_routes import router as contact_router
from backend.routers.auth import router as auth_router
from backend.routers.profile import router as profile_router

# Import the DocuSign SDK
import docusign_esign as docusign
from docusign_esign import (
    ApiClient,
    EnvelopesApi,
    EnvelopeDefinition,
    Document,
    Signer,
    Tabs,
    SignHere,
    DateSigned,
    EventNotification, 
    CustomFields, 
    TextCustomField, 
    RecipientEmailNotification,
    Notification, 
    Expirations, 
    Reminders,
    Recipients,
    RecipientViewRequest,
    AccountsApi,
    ApiException
)

# For backward compatibility
try:
    from docusign_esign.rest import ApiException as DocusignApiException
except ImportError:
    DocusignApiException = Exception

# ----------------------------------------------------------------------
# Logging & env
# ----------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(override=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    
    # Initialize database
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise
    
    # Check Redis connection
    try:
        if redis_client.is_healthy():
            logger.info("Redis connection established successfully")
        else:
            logger.warning("Redis connection failed, some features may be limited")
    except Exception as e:
        logger.error(f"Redis connection error: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail if isinstance(exc.detail, str) else exc.detail.get("message", str(exc.detail))},
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": "Validation error", "errors": exc.errors()},
    )

# Initialize FastAPI app with lifespan
app = FastAPI(
    exception_handlers={
        HTTPException: http_exception_handler,
        RequestValidationError: validation_exception_handler,
    },
    title="EagleVision MVP API",
    description="""
    Backend API for EagleVision MVP
    
    ## Authentication
    Most endpoints require authentication using JWT tokens.
    Use the `/api/auth/login` endpoint to get an access token.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "persistAuthorization": True,
        "displayRequestDuration": True,
    },  # Hide schemas by default
    contact={
        "name": "EagleVision Support",
        "email": "support@eaglevision.com"
    },
    license_info={
        "name": "Proprietary",
    },
    openapi_tags=[
        {
            "name": "authentication",
            "description": "User authentication and authorization"
        },
        {
            "name": "appointments",
            "description": "Manage appointments"
        },
        {
            "name": "documents",
            "description": "Document signing and management"
        }
    ],
    lifespan=lifespan
)

# Setup security middleware
setup_security(app)

# Add session middleware
if not os.getenv("SESSION_SECRET"):
    logger.warning("SESSION_SECRET not set. Using a temporary secret key. This is not recommended for production.")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", os.urandom(32).hex()),
    session_cookie="sessionid",
    max_age=14 * 24 * 60 * 60,  # 14 days
)

# In production, enable HTTPS redirection
if os.getenv("ENV") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# CORS configuration is now handled in security.py

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import GraphQL router after app is initialized
from backend.gql.router import router as graphql_router

# Create GraphQL application with proper configuration
class GraphQLConfig:
    def __init__(self, db_session: SessionLocal):
        self.db = db_session

def get_context_value(request: Request, data: Dict[str, Any]) -> Dict[str, Any]:
    # This function creates a context for each GraphQL request
    # You can add authentication here if needed for specific operations
    db = next(get_db())
    return {
        "request": request,
        "db": db,
        "user": None  # No user by default, can be set by auth middleware if needed
    }

# Add a test endpoint for basic GraphQL functionality
@app.get("/graphql/test")
@limiter.limit("5/minute")
async def test_graphql(request: Request):
    return {"status": "GraphQL endpoint is working"}

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(profile_router)

# Mount GraphQL router at /graphql
app.include_router(graphql_router, prefix="/graphql")

# CORS middleware is now added before the GraphQL router

# Add a route for the root path to redirect to GraphiQL
@app.get("/")
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/graphql")

logger.info("GraphQL endpoint mounted at /graphql")

# Set up static file serving
from backend.static_files import setup_static_files
setup_static_files(app)

# Serve docs static files
docs_static = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "docs")
os.makedirs(docs_static, exist_ok=True)
app.mount("/static/docs", StaticFiles(directory=docs_static), name="docs")

# Serve GraphiQL interface directly
@app.get("/graphiql")
async def graphiql():
    return HTMLResponse("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>GraphiQL</title>
        <style>
            body { margin: 0; padding: 0; height: 100vh; overflow: hidden; }
            #graphiql { height: 100vh; }
        </style>
        <link href="https://unpkg.com/graphiql@0.17.5/graphiql.css" rel="stylesheet" />
    </head>
    <body>
        <div id="graphiql">Loading GraphiQL...</div>
        <script src="https://unpkg.com/react@15.6.1/dist/react.min.js"></script>
        <script src="https://unpkg.com/react-dom@15.6.1/dist/react-dom.min.js"></script>
        <script src="https://unpkg.com/graphiql@0.17.5/graphiql.min.js"></script>
        <script>
            function graphQLFetcher(params) {
                return fetch('/graphql', {
                    method: 'post',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                }).then(res => res.json());
            }
            ReactDOM.render(
                React.createElement(GraphiQL, { fetcher: graphQLFetcher }),
                document.getElementById('graphiql')
            );
        </script>
    </body>
    </html>
    """)

# Add a simple root endpoint that redirects to GraphiQL
@app.get("/")
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/graphiql")

# ----------------------------------------------------------------------
# Pydantic models
# ----------------------------------------------------------------------
class SignerInfo(BaseModel):
    email: str
    name: str
    client_user_id: Optional[str] = None  # Make client_user_id optional


class AppointmentDetails(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    service: str
    date: str  # ISO format date string
    time: str  # Time string like '2:00:00 PM'
    notes: Optional[str] = None
    
    @property
    def full_name(self) -> str:
        return f"{self.firstName} {self.lastName}"
        
    @property
    def appointment_date(self) -> datetime.datetime:
        # Combine date and time into a datetime object
        date_obj = datetime.datetime.fromisoformat(self.date.replace('Z', '+00:00'))
        time_obj = datetime.datetime.strptime(self.time, '%I:%M:%S %p').time()
        return datetime.datetime.combine(date_obj.date(), time_obj)
    
    @validator('date')
    def validate_date_in_future(cls, v):
        date_obj = datetime.datetime.fromisoformat(v.replace('Z', '+00:00'))
        if date_obj < datetime.datetime.now(datetime.timezone.utc):
            raise ValueError("Appointment date must be in the future")
        return v


class DocumentSigningRequest(BaseModel):
    signer: Dict[str, Any]  # Will contain name, email, client_user_id
    return_url: Optional[str] = None
    returnUrl: Optional[str] = None  # Support both snake_case and camelCase
    appointment: Dict[str, Any]  # Will contain the appointment details
    
    @root_validator(pre=True)
    def handle_naming_conventions(cls, values):
        # Handle both snake_case and camelCase for return_url/returnUrl
        if 'returnUrl' in values and 'return_url' not in values:
            values['return_url'] = values['returnUrl']
        return values
        
    def get_appointment(self) -> 'AppointmentDetails':
        return AppointmentDetails(**self.appointment)
        
    def get_signer_info(self) -> Dict[str, str]:
        return {
            'name': self.signer.get('name', ''),
            'email': self.signer.get('email', ''),
            'client_user_id': self.signer.get('client_user_id', self.signer.get('email', ''))
        }


class WebhookEvent(BaseModel):
    envelopeId: str
    status: str
    email: str
    userName: str
    timeGenerated: str
    envelopeSummary: Optional[Dict[str, Any]] = None


class WebhookNotification(BaseModel):
    envelopeId: str
    status: str
    emailSubject: str
    documents: Optional[List[Dict[str, Any]]] = None
    recipients: Optional[Dict[str, Any]] = None
    eventDate: Optional[str] = None
    envelopeDocuments: Optional[List[Dict[str, Any]]] = None


# ----------------------------------------------------------------------
# DocuSign configuration
# ----------------------------------------------------------------------
def get_ds_config() -> Dict[str, Any]:
    """Load DocuSign config and private key from .env + file."""
    try:
        client_id = os.getenv("DOCUSIGN_CLIENT_ID")
        user_id = os.getenv("DOCUSIGN_USER_ID")  # GUID (API Username)
        account_id = os.getenv("DOCUSIGN_ACCOUNT_ID")  # for info only
        redirect_uri = os.getenv("DOCUSIGN_REDIRECT_URI")
        auth_server = os.getenv("DOCUSIGN_AUTH_SERVER") or "account-d.docusign.com"

        logger.info("Loading DocuSign configuration...")
        logger.info(f"Client ID: {'*' * 8 + client_id[-4:] if client_id else 'Not set'}")
        logger.info(f"User ID: {'*' * 8 + user_id[-4:] if user_id else 'Not set'}")
        logger.info(f"Account ID: {'*' * 8 + account_id[-4:] if account_id else 'Not set'}")
        logger.info(f"Auth Server: {auth_server}")
        logger.info(f"Redirect URI: {redirect_uri}")

        missing = []
        if not client_id:
            missing.append("DOCUSIGN_CLIENT_ID")
        if not user_id:
            missing.append("DOCUSIGN_USER_ID")
        if not account_id:
            missing.append("DOCUSIGN_ACCOUNT_ID")
        if not redirect_uri:
            missing.append("DOCUSIGN_REDIRECT_URI")

        if missing:
            error_msg = f"Missing required environment variables: {', '.join(missing)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        private_key_path = os.path.join(
            os.path.dirname(__file__), "keys", "docusign_private_key.pem"
        )
        logger.info(f"Loading private key from: {private_key_path}")
        
        try:
            with open(private_key_path, "r") as key_file:
                private_key = key_file.read().strip()
                if "\n" not in private_key:
                    private_key = private_key.replace("\\n", "\n")
            
            logger.info(f"Private key loaded successfully (length: {len(private_key)})")
            
            if not private_key.startswith("-----") or "PRIVATE KEY-----" not in private_key:
                error_msg = "Invalid private key format. It should start with '-----' and contain 'PRIVATE KEY-----'"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
        except FileNotFoundError:
            error_msg = f"Private key file not found at: {private_key_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        except Exception as e:
            error_msg = f"Error reading private key: {str(e)}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        config = {
            "ds_client_id": client_id,
            "ds_impersonated_user_id": user_id,
            "ds_account_id_env": account_id,
            "ds_private_key": private_key,
            "ds_redirect_uri": redirect_uri,
            "ds_auth_server": auth_server,
        }
        
        logger.info("DocuSign configuration loaded successfully")
        return config
        
    except Exception as e:
        logger.error(f"Failed to load DocuSign configuration: {str(e)}")
        raise


DS_CONFIG = get_ds_config()


# ----------------------------------------------------------------------
# DocuSign client + account discovery
# ----------------------------------------------------------------------
def get_docusign_client_and_account():
    """
    Create a DocuSign ApiClient with JWT auth and discover the correct
    account_id + base_uri.

    Returns:
        (api_client, account_id)
    """
    try:
        env = os.getenv("DOCUSIGN_ENVIRONMENT", "demo").lower()  # "demo" or "prod"
        oauth_host = DS_CONFIG.get("ds_auth_server") or ("account.docusign.com" if env == "prod" else "account-d.docusign.com")
        
        logger.info(f"Initializing DocuSign client for {env} environment")
        logger.info(f"OAuth host: {oauth_host}")
        logger.info(f"Client ID: {DS_CONFIG['ds_client_id']}")
        logger.info(f"User ID (GUID): {DS_CONFIG['ds_impersonated_user_id']}")
        
        # Get the account ID from environment variables
        account_id = DS_CONFIG["ds_account_id_env"]
        logger.info(f"Account ID (.env): {account_id}")

        # Initialize API client
        api_client = docusign.ApiClient()
        
        # Set the base URL based on the environment
        if env == 'demo':
            base_path = "https://demo.docusign.net/restapi"
        else:
            base_path = "https://www.docusign.net/restapi"
            
        # Set the base path with account ID
        api_client.host = f"{base_path}/v2/accounts/{account_id}"
        api_client.set_base_path(f"{base_path}/v2/accounts/{account_id}")
        
        logger.info(f"Using base path: {base_path}/v2/accounts/{account_id}")
        
        # Prepare private key
        private_key = DS_CONFIG["ds_private_key"]
        if "\n" not in private_key:
            logger.debug("Converting escaped newlines in private key")
            private_key = private_key.replace("\\n", "\n")
        private_key_bytes = private_key.encode("utf-8")

        # 1) Get JWT access token
        logger.info("Requesting JWT access token...")
        try:
            # Request JWT token with explicit scopes
            token_response = api_client.request_jwt_user_token(
                client_id=DS_CONFIG["ds_client_id"],
                user_id=DS_CONFIG["ds_impersonated_user_id"],
                oauth_host_name=oauth_host,
                private_key_bytes=private_key_bytes,
                expires_in=3600,  # 1 hour
                scopes=["signature", "impersonation"]
            )
            
            if not token_response or not hasattr(token_response, 'access_token'):
                raise Exception("No access token received in response")
                
            access_token = token_response.access_token
            logger.info(f"Successfully obtained access token (length: {len(access_token)})")
            
            # Store the access token in the API client
            api_client.access_token = access_token
            
            # Configure API client with the new token
            api_client.set_default_header("Authorization", f"Bearer {access_token}")
            
            # Set the base URL based on the environment
            if env == 'demo':
                api_base_url = "https://demo.docusign.net/restapi"
            else:
                api_base_url = "https://www.docusign.net/restapi"
                
            api_client.host = api_base_url
            
            # Get the account ID from environment variables
            account_id = DS_CONFIG["ds_account_id_env"]
            
            # Set the base path with account ID
            api_client.set_base_path(f"{api_base_url}/v2/accounts/{account_id}")
            logger.info(f"Using base path: {api_base_url}/v2/accounts/{account_id}")
            
        except Exception as e:
            error_msg = f"Failed to obtain access token: {str(e)}"
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                error_msg += f"\nResponse: {e.response.text}"
                
            # Check for consent required error
            if hasattr(e, 'response') and hasattr(e.response, 'text') and "consent_required" in str(e.response.text).lower():
                consent_url = (
                    f"https://{oauth_host}/oauth/auth?response_type=code&"
                    f"scope=signature%20impersonation&"
                    f"client_id={DS_CONFIG['ds_client_id']}&"
                    f"redirect_uri={DS_CONFIG['ds_redirect_uri']}"
                )
                error_msg += f"\n\nConsent required! Please grant consent by visiting:\n{consent_url}"
                
            logger.error(error_msg)
            raise Exception(error_msg)

        # 2) Verify account access using the account ID from environment variables
        logger.info("Verifying account access...")
        try:
            # Initialize Accounts API with the configured base path
            accounts_api = AccountsApi(api_client)
            
            # Get account information
            account_info = accounts_api.get_account_information(account_id=account_id)
            
            logger.info(f"Successfully connected to account: {getattr(account_info, 'name', 'N/A')} ({account_id})")
            
            # Return the API client and account ID
            return api_client, account_id
            
            logger.info(f"Successfully connected to account: {getattr(account_info, 'name', 'N/A')} ({account_id})")
            return api_client, account_id
            
        except Exception as e:
            error_msg = f"Failed to verify account access: {str(e)}"
            if hasattr(e, 'status'):
                error_msg += f" (status={e.status})"
            if hasattr(e, 'reason'):
                error_msg += f"\nReason: {e.reason}"
            if hasattr(e, 'headers'):
                error_msg += f"\nHeaders: {e.headers}"
            if hasattr(e, 'body'):
                try:
                    error_data = json.loads(e.body) if isinstance(e.body, str) else e.body
                    error_msg += f"\nResponse: {json.dumps(error_data, indent=2)}"
                except:
                    error_msg += f"\nResponse body: {e.body}"
            
            # Add consent URL for auth errors
            if hasattr(e, 'status') and e.status == 401:  # Unauthorized
                consent_url = (
                    f"https://{oauth_host}/oauth/auth?response_type=code&"
                    f"scope=signature%20impersonation&"
                    f"client_id={DS_CONFIG['ds_client_id']}&"
                    f"redirect_uri={DS_CONFIG['ds_redirect_uri']}"
                )
                error_msg += f"\n\nAuthentication failed. You may need to grant consent again:\n{consent_url}"
                
            logger.error(error_msg)
            raise Exception(f"DocuSign API error: {error_msg}")
            
    except DocusignApiException as e:
        error_msg = f"DocuSign API exception: {str(e)}"
        if hasattr(e, 'body'):
            try:
                error_data = json.loads(e.body) if isinstance(e.body, str) else e.body
                error_msg += f"\nError details: {json.dumps(error_data, indent=2)}"
            except:
                error_msg += f"\nError body: {e.body}"
        logger.error(error_msg)
        
        # Add consent URL for auth errors
        if hasattr(e, 'status') and e.status == 401:  # Unauthorized
            consent_url = (
                f"https://{oauth_host}/oauth/auth?response_type=code&"
                f"scope=signature%20impersonation&"
                f"client_id={DS_CONFIG['ds_client_id']}&"
                f"redirect_uri={DS_CONFIG['ds_redirect_uri']}"
            )
            error_msg += f"\n\nPlease grant consent by visiting:\n{consent_url}"
            
        raise Exception(error_msg)
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        raise Exception(error_msg)
        
    except Exception as e:
        error_msg = f"Failed to initialize DocuSign client: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise Exception(error_msg) from e


# ----------------------------------------------------------------------
# Health endpoint
# ----------------------------------------------------------------------
@app.get("/health")
async def health_check():
    """Health check endpoint that also verifies database connection."""
    try:
        # Test database connection
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {
            "status": "ok",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}"
        )


@app.get("/api/docusign/consent-url")
async def get_consent_url():
    """
    Get the URL to grant consent for the DocuSign integration.
    This URL should be opened in a browser to grant consent.
    """
    try:
        env = os.getenv("DOCUSIGN_ENVIRONMENT", "demo").lower()
        oauth_host = "account-d.docusign.com" if env == "demo" else "account.docusign.com"
        client_id = os.getenv("DOCUSIGN_CLIENT_ID")
        redirect_uri = os.getenv("DOCUSIGN_REDIRECT_URI")
        
        if not client_id or not redirect_uri:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required environment variables: DOCUSIGN_CLIENT_ID or DOCUSIGN_REDIRECT_URI"
            )
            
        consent_url = (
            f"https://{oauth_host}/oauth/auth?response_type=code&"
            f"scope=signature%20impersonation&"
            f"client_id={client_id}&"
            f"redirect_uri={redirect_uri}"
        )
        
        return {
            "consent_url": consent_url,
            "message": "Open this URL in a browser to grant consent for the DocuSign integration",
            "next_steps": [
                "1. Open the consent_url in a browser",
                "2. Log in with your DocuSign account if prompted",
                "3. Review the permissions and click 'Allow'",
                "4. After granting consent, you can use the API endpoints"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error generating consent URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate consent URL: {str(e)}"
        )


# ----------------------------------------------------------------------
# DocuSign webhook
# ----------------------------------------------------------------------
@app.post("/api/docusign/webhook")
async def docusign_webhook(notification: Dict[str, Any]):
    """
    Webhook endpoint for DocuSign Connect to send envelope status updates.
    """
    try:
        logger.info("Received DocuSign webhook notification")
        logger.debug(f"Webhook payload: {json.dumps(notification, indent=2)}")

        envelope_id = notification.get("envelopeId")
        status_str = notification.get("status", "").lower()

        if not envelope_id:
            logger.error("No envelopeId in webhook payload")
            return {"status": "error", "message": "No envelopeId provided"}

        logger.info(
            f"Processing webhook for envelope {envelope_id}, status: {status_str}"
        )

        if status_str == "completed":
            try:
                api_client, account_id = get_docusign_client_and_account()
                envelopes_api = EnvelopesApi(api_client)

                envelope = envelopes_api.get_envelope(
                    account_id=account_id, envelope_id=envelope_id
                )
                docs = envelopes_api.list_documents(
                    account_id=account_id, envelope_id=envelope_id
                )

                logger.info(
                    f"Envelope {envelope_id} completed. Envelope: {envelope}, Documents: {docs}"
                )
                # TODO: persist/notify

            except Exception as e:
                logger.error(
                    f"Error processing completed envelope {envelope_id}: {str(e)}"
                )

        elif status_str in ["declined", "voided"]:
            logger.info(f"Envelope {envelope_id} was {status_str}")
            # TODO: handle declined/voided

        return {"status": "success"}

    except Exception as e:
        logger.error(f"Error in webhook handler: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing webhook: {str(e)}",
        )


# ----------------------------------------------------------------------
# Config test endpoint
# ----------------------------------------------------------------------
@app.get("/api/docusign/test-config")
async def test_docusign_config():
    """Test endpoint to check DocuSign configuration and JWT."""
    try:
        private_key_path = os.path.join(
            os.path.dirname(__file__), "keys", "docusign_private_key.pem"
        )
        private_key_exists = os.path.exists(private_key_path)

        try:
            api_client, discovered_account_id = get_docusign_client_and_account()
            # Get user information and permissions
            user_info = api_client.get_user_info(api_client.access_token)
            user_accounts = []
            for acct in user_info.accounts:
                account_info = {
                    "account_id": getattr(acct, 'account_id', None),
                    "is_default": getattr(acct, 'is_default', False),
                    "account_name": getattr(acct, 'account_name', 'N/A'),
                    "base_uri": getattr(acct, 'base_uri', 'N/A'),
                }
                # Try to get email from different possible attributes
                for attr in ['email', 'user_email', 'email_address']:
                    if hasattr(acct, attr):
                        account_info['email'] = getattr(acct, attr)
                        break
                else:
                    account_info['email'] = 'N/A'
                
                user_accounts.append(account_info)
            
            # Try a lightweight eSignature call for debug
            esign_status = "unknown"
            error_details = {}
            try:
                # First, verify we can access the account
                account_api = docusign.AccountsApi(api_client)
                
                # Get account information using the correct method
                try:
                    # Try different method names that might exist in different SDK versions
                    if hasattr(account_api, 'get_account_information'):
                        account_info = account_api.get_account_information(account_id=discovered_account_id)
                    elif hasattr(account_api, 'get'):
                        account_info = account_api.get(account_id=discovered_account_id)
                    else:
                        account_info = None
                        logger.warning("Could not find account information method in AccountsApi")
                except Exception as acc_e:
                    logger.warning(f"Could not get account information: {str(acc_e)}")
                    account_info = None
                
                # Then try to list envelopes
                envelopes_api = EnvelopesApi(api_client)
                from_date = (datetime.datetime.utcnow() - datetime.timedelta(days=30)).strftime(
                    "%Y-%m-%dT%H:%M:%SZ"
                )
                
                # Try to list envelopes with minimal data
                try:
                    envelopes = envelopes_api.list_status_changes(
                        account_id=discovered_account_id,
                        from_date=from_date,
                        count=1,  # Just get one to verify access
                        include='recipients'  # Include minimal data
                    )
                    esign_status = "ok"
                    envelope_count = getattr(envelopes, 'result_set_size', 0) or 0
                except Exception as env_e:
                    esign_status = f"envelope_error: {str(env_e)}"
                    envelope_count = 0
                    if hasattr(env_e, 'status'):
                        error_details['envelope_status'] = env_e.status
                    if hasattr(env_e, 'body'):
                        try:
                            error_details['envelope_body'] = json.loads(env_e.body)
                        except:
                            error_details['envelope_body'] = str(env_e.body)
                
            except ApiException as e:
                esign_status = f"error: {e.status}"
                error_details = {
                    "status": e.status,
                    "reason": e.reason,
                    "message": str(e),
                }
                if e.body:
                    try:
                        error_details["body"] = json.loads(e.body)
                    except:
                        error_details["body"] = str(e.body)
                logger.error(f"eSignature API error: {error_details}")

            response_data = {
                "status": "success",
                "message": "Successfully connected to DocuSign (JWT + userinfo)",
                "esign_status": esign_status,
                "user_accounts": user_accounts,
                "config": {
                    "client_id": os.getenv("DOCUSIGN_CLIENT_ID")[:5] + "..."
                    if os.getenv("DOCUSIGN_CLIENT_ID")
                    else "Missing",
                    "user_id": os.getenv("DOCUSIGN_USER_ID"),
                    "account_id_from_env": os.getenv("DOCUSIGN_ACCOUNT_ID"),
                    "account_id_discovered": discovered_account_id,
                    "private_key": "Found in file"
                    if private_key_exists
                    else "Missing (keys/docusign_private_key.pem not found)",
                    "redirect_uri": os.getenv("DOCUSIGN_REDIRECT_URI"),
                    "env": os.getenv("DOCUSIGN_ENVIRONMENT", "demo"),
                },
            }
            
            # Add envelope count if available
            if 'envelope_count' in locals():
                response_data['envelope_count'] = envelope_count
                
            # Add error details if available
            if 'error_details' in locals():
                response_data['error_details'] = error_details
                
            return response_data
        except Exception as e:
            logger.error(f"Error in test-config DocuSign init: {e}")
            return {
                "status": "error",
                "message": f"Failed to initialize DocuSign client: {str(e)}",
            }
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {str(e)}"}
# Create envelope endpoint
# ----------------------------------------------------------------------
@app.post("/appointments")
async def create_appointment(
    appointment: AppointmentDetails,
    db: Session = Depends(get_db)
):
    """
    Create a new appointment and store user information in the database.
    """
    try:
        # Check if user exists, if not create a new one
        user = db.query(models.User).filter(models.User.email == appointment.email).first()
        
        if not user:
            user = models.User(
                email=appointment.email,
                full_name=f"{appointment.firstName} {appointment.lastName}",
                phone=appointment.phone,
                role=models.Role.CLIENT
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create appointment with all fields
        new_appointment = models.Appointment(
            user_id=user.id,
            service=appointment.service,
            appointment_date=appointment.appointment_date,
            status=models.AppointmentStatus.PENDING,
            notes=appointment.notes,
            document_signed=False,  # Default to false for new appointments
            first_name=appointment.firstName,
            last_name=appointment.lastName,
            email=appointment.email,
            phone=appointment.phone
        )
        
        logger.info(f"Creating appointment with data: {new_appointment.__dict__}")
        
        db.add(new_appointment)
        db.commit()
        db.refresh(new_appointment)
        
        return {
            "message": "Appointment created successfully",
            "appointment_id": new_appointment.id,
            "user_id": user.id
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating appointment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create appointment"
        )

@app.get("/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get appointment details by ID
    """
    appointment = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    return appointment

@app.get("/users/{user_id}/appointments")
async def get_user_appointments(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all appointments for a specific user
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user.appointments

# Keep the existing create_envelope endpoint for DocuSign integration
@app.post("/api/docusign/envelope")
async def create_envelope(request_data: dict):
    try:
        logger.info("=== Received envelope creation request ===")
        logger.info(f"Raw request data: {request_data}")
        
        # Validate the request data
        try:
            request = DocumentSigningRequest(**request_data)
            appointment = request.get_appointment()
            signer_info = request.get_signer_info()
            
            logger.info("Processed request data:")
            logger.info(f"Signer: {signer_info}")
            logger.info(f"Return URL: {request.return_url or request.returnUrl}")
            logger.info(f"Appointment: {appointment.dict()}")
            logger.info(f"Appointment date: {appointment.appointment_date}")
            
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            logger.error(f"Request data that caused error: {request_data}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"error": "Invalid request data", "details": str(e)}
            )

        try:
            # Initialize DocuSign client
            logger.info("Initializing DocuSign client...")
            api_client, account_id = get_docusign_client_and_account()
            envelopes_api = EnvelopesApi(api_client)
            logger.info(f"Successfully initialized DocuSign client for account: {account_id}")
            
            # Generate document content
            logger.info("Generating document content...")
            document_content = generate_document_content({
                "firstName": appointment.firstName,
                "lastName": appointment.lastName,
                "email": signer_info['email'],
                "phone": appointment.phone,
                "service": appointment.service,
                "date": appointment.date,
                "time": appointment.time,
                "notes": appointment.notes or "",
            })
            
            if not document_content:
                raise ValueError("Generated document content is empty")
            logger.info("Successfully generated document content")
            
            # Create document
            document = Document(
                document_base64=base64.b64encode(document_content).decode("utf-8"),
                name="Appointment_Agreement.pdf",
                file_extension="pdf",
                document_id="1"
            )

            # Create signer information using the processed signer_info
            signer = {
                "email": signer_info['email'],
                "name": signer_info['name'],
                "recipientId": "1",
                "routingOrder": "1",
                "clientUserId": signer_info['client_user_id']
            }

            # Create signer with tabs
            signer_with_tabs = Signer(
                email=signer['email'],
                name=signer['name'],
                recipient_id=signer['recipientId'],
                routing_order=signer['routingOrder'],
                client_user_id=signer['clientUserId'],
                tabs=Tabs(sign_here_tabs=[
                    SignHere(
                        document_id="1",
                        page_number="1",
                        recipient_id="1",
                        tab_label="signature",
                        x_position="100",
                        y_position="600"
                    )
                ])
            )

            # Create email notification settings for the signer
            from docusign_esign import RecipientEmailNotification
            
            email_notification = RecipientEmailNotification(
                email_subject="Your appointment agreement is ready to sign",
                email_body="""Dear {{name}},

Please review and sign your appointment agreement by clicking the link below.

{{action_button}}

A copy of the signed document will be sent to your email upon completion.

Thank you,
Eagle Vision Team""",
                supported_language="en"
            )

            # Create envelope definition with custom fields
            custom_fields = []
            
            # Add appointment ID if available, otherwise use a placeholder
            appointment_id = getattr(appointment, 'id', 'pending')
            custom_fields.append(
                TextCustomField(
                    name="appointment_id",
                    required="false",
                    show="false",
                    value=str(appointment_id)
                )
            )
            
            # Add user email
            custom_fields.append(
                TextCustomField(
                    name="user_email",
                    required="false",
                    show="false",
                    value=signer_info['email']
                )
            )
            
            envelope_definition = EnvelopeDefinition(
                email_subject="Please sign this document",
                documents=[document],
                recipients=Recipients(signers=[signer_with_tabs]),
                status="sent",
                custom_fields=CustomFields(text_custom_fields=custom_fields)
            )

            # For demo environment, ensure the signer gets a copy
            if os.getenv('DOCUSIGN_ENVIRONMENT') == 'demo':
                from docusign_esign import Notification, Expirations, Reminders
                
                # Set email notification for when the envelope is completed
                envelope_definition.notification = Notification(
                    expirations=Expirations(
                        expire_enabled="true",
                        expire_after="30",
                        expire_warn="5"
                    ),
                    reminders=Reminders(
                        reminder_enabled="true",
                        reminder_delay="1",
                        reminder_frequency="1"
                    ),
                    use_account_defaults="false"
                )
                
                # Configure email notification for the signer
                from docusign_esign import RecipientEmailNotification
                
                signer_with_tabs.email_notification = RecipientEmailNotification(
                    email_subject="Your appointment agreement is ready to sign",
                    email_body="""Dear {{name}},

Please review and sign your appointment agreement by clicking the link below.

{{action_button}}

A copy of the signed document will be sent to your email upon completion.

Thank you,
Eagle Vision Team""",
                    supported_language="en"
                )
            
            # For production, set up Connect notifications
            if os.getenv('ENVIRONMENT') == 'production':
                try:
                    # Ensure the return URL is HTTPS for production
                    return_url = request.return_url
                    if return_url.startswith('http://'):
                        return_url = return_url.replace('http://', 'https://', 1)
                        
                    envelope_definition.event_notification = {
                        "url": f"{return_url}/docusign/event",
                        "loggingEnabled": "true",
                        "requireAcknowledgment": "true",
                        "envelopeEvents": [
                            {"envelopeEventStatusCode": "completed", "includeDocuments": "true"}
                        ]
                    }
                except Exception as e:
                    logger.warning(f"Could not set up event notification: {str(e)}")

            logger.info("Creating envelope in DocuSign...")
            envelope = envelopes_api.create_envelope(
                account_id=account_id,
                envelope_definition=envelope_definition
            )
            logger.info(f"Successfully created envelope ID: {envelope.envelope_id}")

            # Create recipient view for signing
            signer = request.get_signer_info()
            recipient_view_request = RecipientViewRequest(
                authentication_method="None",
                client_user_id=signer.get('client_user_id', signer['email']),
                recipient_id="1",
                return_url=request.return_url or request.returnUrl,
                user_name=signer['name'],
                email=signer['email']
            )

            logger.info("Generating signing URL...")
            view_url = envelopes_api.create_recipient_view(
                account_id=account_id,
                envelope_id=envelope.envelope_id,
                recipient_view_request=recipient_view_request
            )
            
            logger.info(f"Successfully generated signing URL for envelope {envelope.envelope_id}")
            
            # Return the signing URL for redirection
            return {
                "envelope_id": envelope.envelope_id,
                "redirect_url": view_url.url,
                "status": "success",
                "message": "Envelope created and signing URL generated"
            }

        except Exception as e:
            error_msg = f"Error in envelope creation: {str(e)}"
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                error_msg += f"\nResponse: {e.response.text}"
            logger.error(error_msg, exc_info=True)
            raise HTTPException(status_code=500, detail=error_msg)

    except HTTPException as he:
        logger.error(f"HTTP Exception: {str(he.detail)}", exc_info=True)
        raise
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg, exc_info=True)
        raise HTTPException(status_code=500, detail=error_msg)


# ----------------------------------------------------------------------
# PDF generation
# ----------------------------------------------------------------------
def generate_document_content(appointment_data=None):
    """Generate a PDF document for signing with appointment details."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors
    import io
    from datetime import datetime

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Title
    p.setFont("Helvetica-Bold", 18)
    p.drawCentredString(width / 2, 750, "SERVICE AGREEMENT")

    # Date
    p.setFont("Helvetica", 10)
    p.drawRightString(width - 72, 750, f"Date: {datetime.now().strftime('%Y-%m-%d')}")

    # Line
    p.line(72, 740, width - 72, 740)

    y_position = 700
    p.setFont("Helvetica", 12)

    if appointment_data:
        p.drawString(
            72,
            y_position,
            f"Dear {appointment_data.get('firstName', 'Valued Client')},",
        )
    else:
        p.drawString(72, y_position, "Dear Valued Client,")

    y_position -= 30

    agreement_text = """
    This Service Agreement ("Agreement") is made and entered into as of the date of signature by and between
    Eagle Vision Tax and Financial Services ("Company") and the client ("Client") whose information is provided below.
    
    By signing this Agreement, Client agrees to the following terms and conditions:
    
    1. Services: Company agrees to provide the services as described below.
    2. Payment: Client agrees to pay the agreed-upon fee for the services.
    3. Cancellation: 24-hour notice is required for appointment cancellations.
    4. Confidentiality: All client information will be kept confidential.
    """

    for line in agreement_text.split("\n"):
        if line.strip() == "":
            y_position -= 15
            continue
        p.drawString(72, y_position, line.strip())
        y_position -= 15

    # Appointment details
    y_position -= 30
    p.setFont("Helvetica-Bold", 14)
    p.drawString(72, y_position, "Appointment Details:")
    y_position -= 25

    if appointment_data:
        details = [
            (
                "Client Name:",
                f"{appointment_data.get('firstName', '')} {appointment_data.get('lastName', '')}",
            ),
            ("Email:", appointment_data.get("email", "")),
            ("Phone:", appointment_data.get("phone", "")),
            ("Service Type:", appointment_data.get("service", "")),
            ("Appointment Date:", appointment_data.get("date", "")),
            ("Appointment Time:", appointment_data.get("time", "")),
        ]

        data = [["Field", "Value"]] + details
        table = Table(data, colWidths=[150, 300])
        table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )

        table_height = (len(details) + 1) * 20
        table.wrapOn(p, width - 144, height)
        table.drawOn(p, 72, y_position - table_height)
        y_position -= table_height + 50

    # Signature section
    p.setFont("Helvetica-Bold", 12)
    p.drawString(72, y_position, "Client Signature:")

    # Signature line
    p.line(72, y_position - 20, 250, y_position - 20)
    p.setFont("Helvetica", 10)
    p.drawString(72, y_position - 40, "(Sign above this line)")

    # Date line
    p.line(350, y_position - 20, 500, y_position - 20)
    p.drawString(350, y_position - 40, "Date")

    # Page number
    p.setFont("Helvetica", 8)
    p.drawRightString(width - 72, 50, "Page 1 of 1")

    p.showPage()
    p.save()

    # Get the bytes from the buffer and close it
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes