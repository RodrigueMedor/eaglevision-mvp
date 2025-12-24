import json
import logging
import os
from datetime import datetime, timedelta
import uuid
from typing import Optional, Dict, Any
import jwt

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
from jose import JWTError

# Get environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, EmailStr

from backend import models, schemas, crud
from backend.database import get_db
from backend.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    verify_password,
    get_password_hash,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
    ALGORITHM,
    TOKEN_AUDIENCE,
    TOKEN_ISSUER
)
from backend.redis_client import redis_client
from backend.security import limiter

logger = logging.getLogger(__name__)

# Request/Response Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(
        default=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        description="Token expiration time in seconds"
    )
    refresh_token: str
    user: Dict[str, Any]  

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None
    all_devices: bool = False

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    username: str
    password: str
    remember_me: bool = False

router = APIRouter(prefix="/auth", tags=["Authentication"])

async def create_token_response(user: models.User, db: Session, token_family: str = None, remember_me: bool = False) -> TokenResponse:
    """
    Helper function to create token response for both login and token endpoints.
    
    Args:
        user: The user model instance
        db: Database session
        token_family: Optional token family for refresh token rotation
        remember_me: Whether to set a longer refresh token expiration
        
    Returns:
        TokenResponse: A response object containing tokens and user info
    """
    try:
        logger.debug(f"Starting token creation for user ID: {user.id}")
        
        # Get role name safely
        role_name = None
        if user.role:
            if hasattr(user.role, 'name'):
                role_name = user.role.name
                logger.debug(f"User role name: {role_name}")
            else:
                logger.warning(f"User role exists but has no 'name' attribute: {user.role}")
        else:
            logger.warning(f"No role found for user ID: {user.id}")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        additional_claims = {
            "role": role_name,
            "email": user.email or ""
        }
        
        logger.debug(f"Creating access token with claims: {additional_claims}")
        
        try:
            access_token = create_access_token(
                user_id=str(user.id),
                additional_claims=additional_claims,
                expires_delta=access_token_expires
            )
            logger.debug("Access token created successfully")
        except Exception as e:
            logger.error(f"Error creating access token: {str(e)}", exc_info=True)
            raise
        
        # Set refresh token expiration based on remember_me
        refresh_token_days = REFRESH_TOKEN_EXPIRE_DAYS if remember_me else 1
        
        # Create refresh token with rotation
        refresh_token, token_family = create_refresh_token(
            str(user.id),
            token_family=token_family,
            expires_delta=timedelta(days=refresh_token_days)
        )    
        
        # If no token family is provided, generate a new one (for new sessions)
        if not token_family:
            token_family = str(uuid.uuid4())
            
        # Create a unique token ID for this refresh token
        token_id = str(uuid.uuid4())
        
        # Store the refresh token in Redis with the token ID and family
        if redis_client.is_healthy():
            try:
                stored = redis_client.store_refresh_token(
                    user_id=str(user.id),
                    token_id=token_id,
                    expires_in=int(timedelta(days=refresh_token_days).total_seconds()),
                    token_family=token_family
                )
                
                if not stored:
                    logger.error(f"Failed to store refresh token in Redis for user {user.id}")
            except Exception as e:
                logger.error(f"Error storing refresh token in Redis: {str(e)}")
        
        # Convert user object to dictionary with proper serialization
        user_data = {
            "id": str(user.id),
            "email": user.email or "",
            "full_name": user.full_name or "",
            "phone": user.phone or "",
            "role": {
                "id": user.role.id if hasattr(user.role, 'id') else 0,
                "name": role_name,
                "permissions": [p.name for p in user.role.permissions] if hasattr(user.role, 'permissions') else []
            } if user.role else None,
            "is_active": bool(user.is_active) if hasattr(user, 'is_active') else True
        }
        
        # Create the response
        response = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=int(access_token_expires.total_seconds()),
            user=user_data,
            remember_me=remember_me
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error creating token response: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "token_creation_error",
                "message": "Could not create authentication tokens",
                "details": str(e)
            }
        )

class LoginForm:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.grant_type = 'password'
        self.scope = ''
        self.client_id = None
        self.client_secret = None

def create_auth_response(token_data: dict, response_model: TokenResponse, request: Request = None, user_id: str = None):
    """
    Helper function to create a response with auth cookies and manage sessions
    
    Args:
        token_data: Dictionary containing access_token and refresh_token
        response_model: The TokenResponse model
        request: The incoming request (for session tracking)
        user_id: The user ID (for session tracking)
    """
    from fastapi.responses import JSONResponse
    
    response = JSONResponse(
        content=response_model.dict(),
        status_code=status.HTTP_200_OK
    )
    
    # Set HTTP-only cookie for access token (7 days expiry)
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token_data['access_token']}",
        httponly=True,
        max_age=60 * 60 * 24 * 7,  # 7 days
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        domain=None
    )
    
    # Set HTTP-only cookie for refresh token (30 days expiry)
    response.set_cookie(
        key="refresh_token",
        value=token_data['refresh_token'],
        httponly=True,
        max_age=60 * 60 * 24 * 30,  # 30 days
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        domain=None
    )
    
    # Store the session if request and user_id are provided
    if request and user_id:
        session_key = redis_client._get_session_key(user_id, request)
        try:
            # Store the session with the same expiry as the refresh token
            redis_client.redis.setex(
                session_key,
                60 * 60 * 24 * 30,  # 30 days
                json.dumps({
                    'user_agent': request.headers.get('user-agent', 'unknown'),
                    'ip': request.client.host if request.client else 'unknown',
                    'last_active': datetime.utcnow().isoformat()
                })
            )
        except Exception as e:
            logger.error(f"Error storing session: {str(e)}")
    
    return response

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
@router.post("/token", response_model=TokenResponse, status_code=status.HTTP_200_OK, include_in_schema=False)
@limiter.limit("100/hour")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Handle user login with OAuth2 password flow.
    
    Accepts form data with:
    - username: User's email address
    - password: User's password
    
    Sets HTTP-only cookies for session management and tracks the login session.
    """
    try:
        client_ip = request.client.host if request.client else 'unknown'
        logger.info(f"Login attempt for user: {form_data.username} from {client_ip}")
        
        # Process the login and get the token response
        token_response = await process_login(LoginForm(form_data.username, form_data.password), request, db)
        
        # Get user ID from the token
        from backend.auth import get_user_id_from_token
        user_id = get_user_id_from_token(token_response.access_token)
        if not user_id:
            logger.error("Failed to extract user ID from token")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"error": "internal_error", "message": "Failed to process login"}
            )
        
        # Create response with auth cookies and session tracking
        return create_auth_response(
            token_response.dict(), 
            token_response,
            request=request,
            user_id=user_id
        )
        
    except HTTPException as he:
        logger.warning(f"Login failed for {form_data.username}: {str(he.detail)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "internal_server_error", "message": "An unexpected error occurred during login"}
        )

@router.post("/login-json", response_model=TokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit("100/hour")
async def login_json(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    # Store remember_me in request state to be used in create_auth_response
    request.state.remember_me = credentials.remember_me
    """
    Handle user login with JSON data.
    
    Expected JSON format:
    {
        "username": "user@example.com",
        "password": "password123"
    }
    
    Sets HTTP-only cookies for session management and tracks the login session.
    """
    try:
        client_ip = request.client.host if request.client else 'unknown'
        logger.info(f"JSON login attempt for user: {credentials.username} from {client_ip}")
        
        # Log the incoming request data for debugging
        logger.debug(f"Login request data: {credentials}")
        
        # Process the login and get the token response
        logger.debug("Calling process_login...")
        login_form = LoginForm(credentials.username, credentials.password)
        logger.debug(f"Created login form with username: {login_form.username}")
        
        token_response = await process_login(login_form, request, db)
        logger.debug("Successfully processed login")
        
        # Log successful token generation
        logger.info(f"Token generated successfully for user: {credentials.username}")
        
        # Get user ID from the token
        from backend.auth import get_user_id_from_token
        logger.debug("Getting user ID from token...")
        user_id = get_user_id_from_token(token_response.access_token)
        
        if not user_id:
            error_msg = "Failed to extract user ID from token in JSON login"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"error": "internal_error", "message": error_msg}
            )
        
        # Log successful user ID extraction
        logger.debug(f"Extracted user ID: {user_id}")
        
        # Create response with auth cookies and session tracking
        logger.debug("Creating auth response...")
        response = create_auth_response(
            token_response.dict(), 
            token_response,
            request=request,
            user_id=user_id
        )
        
        logger.debug("Login successful, returning response")
        return response
        
    except HTTPException as he:
        # Re-raise HTTP exceptions
        logger.error(f"HTTP Exception in login_json (status {he.status_code}): {he.detail}", exc_info=True)
        raise
        
    except Exception as e:
        # Log the full error with traceback
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Unexpected error in login_json: {str(e)}\n{error_trace}")
        
        # For debugging, include more details in the response
        error_detail = {
            "error": "internal_error",
            "message": "An unexpected error occurred during login.",
            "exception_type": type(e).__name__,
            "exception_message": str(e)
        }
        
        logger.error(f"Error details: {error_detail}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )

    except HTTPException as he:
        error_detail = str(he.detail) if hasattr(he, 'detail') else str(he)
        logger.warning(f"JSON login failed for {credentials.username}: {error_detail}")
        # Add more context to the error response
        if he.status_code == 401:
            # Log additional debug info for auth failures
            user = db.query(models.User).filter(models.User.email == credentials.username).first()
            if user:
                logger.debug(f"User found but authentication failed for: {user.email}")
                logger.debug(f"User active: {user.is_active}, Verified: {user.is_verified}")
            else:
                logger.debug(f"No user found with email: {credentials.username}")
        raise
        
    except Exception as e:
        logger.error(f"Unexpected error during JSON login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "internal_server_error", "message": f"An unexpected error occurred: {str(e)}"}
        )

def clear_auth_cookies():
    """Helper function to clear authentication cookies"""
    from fastapi.responses import JSONResponse
    
    response = JSONResponse(
        content={"message": "Successfully logged out"},
        status_code=status.HTTP_200_OK
    )
    
    # Clear the access token cookie
    response.delete_cookie("access_token")
    
    # Clear the refresh token cookie
    response.delete_cookie("refresh_token")
    
    return response

# Move the login processing to a separate function to avoid code duplication
async def process_login(form_data: LoginForm, request: Request, db: Session) -> TokenResponse:
    """
    Process login with the provided form data and return a TokenResponse.
    
    Args:
        form_data: Login form data containing username and password
        request: The incoming request
        db: Database session
        
    Returns:
        TokenResponse: Response containing access token, refresh token, and user info
    """
    try:
        # Log login attempt (without password)
        client_host = request.client.host if request.client else "unknown"
        logger.info(f"Login attempt for user: {form_data.username} from {client_host}")
        logger.debug(f"Login form data - username: {form_data.username}")
        
        # Get the user from the database
        logger.debug("Querying database for user...")
        user = db.query(models.User).filter(
            models.User.email == form_data.username
        ).first()
        
        if not user:
            logger.warning(f"No user found with email: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "authentication_failed",
                    "message": "Incorrect email or password"
                }
            )
        
        logger.debug(f"User found in DB: {user.email}, ID: {user.id}")
        logger.debug(f"User active: {user.is_active}, Verified: {user.is_verified}")
        
        # Verify the password
        logger.debug("Verifying password...")
        try:
            from backend.auth import verify_password
            is_password_valid = verify_password(form_data.password, user.hashed_password)
            logger.debug(f"Password verification result: {is_password_valid}")
        except Exception as e:
            logger.error(f"Error during password verification: {str(e)}", exc_info=True)
            is_password_valid = False
        
        if not is_password_valid:
            logger.warning(f"Invalid password for user: {form_data.username}")
            # Add debug info about the password hashes
            try:
                from backend.auth import get_password_hash
                test_hash = get_password_hash(form_data.password)
                logger.debug(f"Input password: {form_data.password}")
                logger.debug(f"Input password hash: {test_hash}")
                logger.debug(f"Stored password hash: {user.hashed_password}")
                
                # Debug: Try to verify with direct bcrypt
                import bcrypt
                try:
                    bcrypt_valid = bcrypt.checkpw(
                        form_data.password.encode('utf-8'),
                        user.hashed_password.encode('utf-8')
                    )
                    logger.debug(f"Direct bcrypt verification: {bcrypt_valid}")
                except Exception as bcrypt_err:
                    logger.error(f"Direct bcrypt verification failed: {str(bcrypt_err)}")
                    
            except Exception as e:
                logger.error(f"Error during password debug: {str(e)}", exc_info=True)
                
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "authentication_failed",
                    "message": "Incorrect email or password"
                }
            )
            
        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "account_inactive",
                    "message": "Account is inactive. Please contact support."
                }
            )
            
        # Check if user is verified
        if not user.is_verified:
            logger.warning(f"Login attempt for unverified user: {user.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "account_not_verified",
                    "message": "Please verify your email before logging in."
                }
            )
            
        # Update last login
        try:
            logger.debug(f"Updating last login for user: {user.email}")
            user.last_login = datetime.utcnow()
            db.commit()
            logger.debug("Last login updated successfully")
        except Exception as e:
            logger.error(f"Error updating last login: {str(e)}", exc_info=True)
            # Don't fail the login if we can't update last login
        
        logger.info(f"Successful login for user: {user.email}")
        
        # Create and return token response
        logger.debug("Creating token response...")
        try:
            token_response = await create_token_response(user, db)
            logger.debug("Token response created successfully")
            
            # Ensure we're returning a proper TokenResponse object
            if not isinstance(token_response, TokenResponse):
                error_msg = f"Expected TokenResponse but got {type(token_response).__name__}"
                logger.error(error_msg)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "error": "server_error",
                        "message": "Error generating authentication tokens"
                    }
                )
                
            return token_response
            
        except Exception as e:
            logger.error(f"Error in create_token_response: {str(e)}", exc_info=True)
            raise
        
    except HTTPException as he:
        # Re-raise HTTP exceptions with proper logging
        logger.warning(f"Login failed with status {he.status_code}: {he.detail}")
        raise
        
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Unexpected error during login: {str(e)}\n{error_trace}")
        
        error_detail = {
            "error": "internal_server_error",
            "message": "An unexpected error occurred during login.",
            "exception_type": type(e).__name__,
            "exception_message": str(e)
        }
        
        logger.error(f"Error details: {error_detail}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )
    finally:
        logger.debug("="*50 + "\n")  # End of request log separator

@router.post("/refresh-token",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Get a new access token using a valid refresh token"
)
async def refresh_token(
    request: Request,
    token_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using a valid refresh token.
    
    This endpoint validates the provided refresh token, checks if it hasn't been revoked,
    and issues a new access token and refresh token if everything is valid.
    
    Implements refresh token rotation for enhanced security.
    """
    refresh_token = token_data.refresh_token
    token_id = None
    user_id = None
    token_family = None
    
    try:
        logger.debug("Starting token refresh process")
        
        # Verify the refresh token signature and extract claims
        try:
            logger.debug("Decoding refresh token...")
            payload = jwt.decode(
                refresh_token,
                SECRET_KEY,
                algorithms=[ALGORITHM],
                audience=TOKEN_AUDIENCE,
                issuer=TOKEN_ISSUER,
                options={
                    "require": ["exp", "iat", "sub", "jti"],
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_nbf": False,
                    "verify_iss": True,
                    "verify_aud": True,
                    "verify_signature": True
                }
            )
            
            token_id = payload.get("jti")
            user_id = payload.get("sub")
            token_family = payload.get("tf")  # Token family for rotation
            
            logger.debug(f"Decoded token - user_id: {user_id}, token_id: {token_id}, family: {token_family}")
            
            if not token_id or not user_id:
                logger.warning(f"Missing required token fields: jti={token_id}, sub={user_id}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "error": "invalid_token",
                        "message": "Invalid token format"
                    },
                    headers={"WWW-Authenticate": "Bearer"}
                )
                
        except jwt.ExpiredSignatureError:
            logger.info(f"Expired refresh token attempt for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "token_expired",
                    "message": "Refresh token has expired. Please log in again."
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
        except (jwt.JWTError, jwt.PyJWTError) as e:
            logger.error(f"JWT validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "invalid_token",
                    "message": str(e) or "Invalid or malformed token"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
            
        # Check if Redis is available
        if not redis_client.is_healthy():
            error_msg = "Redis is not available, cannot validate refresh token"
            logger.error(error_msg)
            # In development, we might want to be more lenient
            if ENVIRONMENT == "development":
                logger.warning("Running in development mode, bypassing Redis validation")
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "error": "service_unavailable",
                        "message": "Authentication service is currently unavailable. Please try again later."
                    }
                )
        else:
            # Check if the refresh token is valid in Redis
            logger.debug(f"Validating refresh token in Redis - user_id: {user_id}, token_id: {token_id}")
            try:
                is_valid = redis_client.is_valid_refresh_token(user_id, token_id, token_family)
                logger.debug(f"Refresh token validation result: {is_valid}")
                
                if not is_valid:
                    logger.warning(f"Invalid or revoked refresh token for user {user_id}, token_id: {token_id}")
                    
                    # If this was part of a family, we should revoke all tokens in the family
                    if token_family:
                        logger.warning(f"Potential token reuse detected for user {user_id}, family {token_family}")
                        # Revoke all tokens for this user as a security measure
                        redis_client.revoke_all_user_refresh_tokens(user_id)
                        
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail={
                            "error": "invalid_token",
                            "message": "Invalid or revoked refresh token. Please log in again."
                        },
                        headers={"WWW-Authenticate": "Bearer"}
                    )
            except Exception as e:
                logger.error(f"Error validating refresh token in Redis: {str(e)}", exc_info=True)
                if ENVIRONMENT != "development":
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail={
                            "error": "token_validation_error",
                            "message": "Error validating token. Please try again."
                        }
                    )
                # In development, continue with token validation even if Redis fails
                logger.warning("Development mode: Continuing with token validation despite Redis error")
            
        logger.debug("Token is valid in Redis")
            
        # Get the user from the database
        logger.debug(f"Fetching user from database - user_id: {user_id}")
        user = crud.get_user(db, user_id=user_id)
        if not user or not user.is_active:
            logger.warning(f"User not found or inactive: {user_id}")
            # Revoke all tokens for this user as they are no longer active
            if redis_client.is_healthy():
                redis_client.revoke_all_user_refresh_tokens(user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": "user_inactive",
                    "message": "User account is inactive or does not exist"
                },
                headers={"WWW-Authenticate": "Bearer"}
            )
            
        # Revoke the old refresh token as part of token rotation
        logger.debug(f"Revoking old refresh token - user_id: {user_id}, token_id: {token_id}")
        if redis_client.is_healthy():
            revoked = redis_client.revoke_refresh_token(user_id=user_id, token_id=token_id)
            if not revoked:
                logger.warning(f"Failed to revoke refresh token for user {user_id}, token_id: {token_id}")
        else:
            logger.warning("Skipping token revocation - Redis is not available")
            
        # Create new tokens with the same token family (or a new one if this was the first token)
        logger.debug("Creating new token response...")
        try:
            token_response = await create_token_response(
                user=user,
                db=db,
                token_family=token_family or str(uuid.uuid4())  # Keep same family or create new one
            )
            logger.debug("Successfully created new token response")
            return token_response
        except Exception as e:
            logger.error(f"Error creating token response: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "token_creation_failed",
                    "message": "Failed to create new tokens. Please try again."
                }
            )
        
    except HTTPException as he:
        # Re-raise HTTP exceptions with their original status codes
        logger.error(f"HTTP Exception during token refresh: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "internal_server_error",
                "message": "An unexpected error occurred while refreshing your token. Please try again."
            }
        )

@router.post("/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout and revoke tokens"
)
async def logout(
    request: Request,
    logout_data: LogoutRequest = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout and revoke tokens.
    
    - **refresh_token**: (Optional) Specific refresh token to revoke
    - **all_devices**: If True, revoke all sessions and tokens for the user on all devices
    
    Clears authentication cookies from the response and revokes the current session.
    """
    try:
        user_id = str(current_user.id)
        
        # Get the access token from the Authorization header
        auth_header = request.headers.get("Authorization")
        current_session_key = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Add the access token to the blacklist
                redis_client.add_to_blacklist(token, ACCESS_TOKEN_EXPIRE_MINUTES * 60)
                
                # Get current session key
                current_session_key = redis_client._get_session_key(user_id, request)
                
                # If logging out all devices, revoke all sessions
                if logout_data and logout_data.all_devices:
                    redis_client.revoke_user_sessions(user_id)
                    redis_client.revoke_all_user_refresh_tokens(user_id)
                    logger.info(f"User {user_id} logged out from all devices and sessions")
                else:
                    # Only revoke the current session
                    if current_session_key:
                        redis_client.redis.delete(current_session_key)
                    if logout_data and logout_data.refresh_token:
                        # Extract token ID from the refresh token
                        try:
                            payload = jwt.decode(
                                logout_data.refresh_token,
                                SECRET_KEY,
                                algorithms=[ALGORITHM],
                                audience=TOKEN_AUDIENCE,
                                issuer=TOKEN_ISSUER
                            )
                            token_id = payload.get("jti")
                            if token_id:
                                redis_client.revoke_refresh_token(
                                    user_id=user_id,
                                    token_id=token_id
                                )
                        except (jwt.JWTError, jwt.PyJWTError) as e:
                            logger.warning(f"Failed to decode refresh token during logout: {str(e)}")
                    logger.info(f"User {user_id} logged out (current session)")
                
            except Exception as e:
                logger.warning(f"Error during logout: {str(e)}")
        
        # Clear authentication cookies
        response = clear_auth_cookies()
        
        # Add header to inform frontend about the logout action
        response.headers["X-Logout-Action"] = "all" if (logout_data and logout_data.all_devices) else "current"
        
        return response
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Error during logout: {str(e)}\n{error_details}")
        
        # Return more detailed error information in development
        import os
        if os.getenv("ENVIRONMENT", "development") == "development":
            return {
                "detail": "An error occurred during logout",
                "error": str(e),
                "traceback": error_details.split('\n')
            }
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during logout",
        )

@router.post(
    "/register",
    response_model=schemas.UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user"
)
async def register(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    
    - **email**: User's email address
    - **password**: User's password (min 8 characters)
    - **full_name**: User's full name
    - **phone**: User's phone number
    - **role**: (Optional) User role (default: client)
    """
    # Check if user already exists
    db_user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user
    db_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role if user_data.role else "client",
        is_verified=False  # Email verification required
    )
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # TODO: Send verification email
        
        return db_user
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create user account"
        )

@router.get(
    "/me",
    response_model=schemas.UserResponse,
    response_model_exclude_unset=True,
    summary="Get current user information"
)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get information about the currently authenticated user.
    """
    try:
        # Convert user object to dictionary with proper serialization
        user_data = {
            "id": str(current_user.id),
            "email": current_user.email or "",
            "full_name": current_user.full_name or "",
            "phone": current_user.phone or "",
            "role": {
                "id": current_user.role.id if hasattr(current_user.role, 'id') else 0,
                "name": current_user.role.name if hasattr(current_user.role, 'name') else str(current_user.role),
                "permissions": [p.name for p in current_user.role.permissions] if hasattr(current_user.role, 'permissions') else []
            } if current_user.role else None,
            "is_active": bool(current_user.is_active) if hasattr(current_user, 'is_active') else True,
            "is_verified": bool(current_user.is_verified) if hasattr(current_user, 'is_verified') else False,
            "created_at": current_user.created_at.isoformat() if hasattr(current_user, 'created_at') else None,
            "updated_at": current_user.updated_at.isoformat() if hasattr(current_user, 'updated_at') else None
        }
        return user_data
    except Exception as e:
        logger.error(f"Error getting current user info: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve user information"
        )

@router.post(
    "/request-password-reset",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request password reset"
)
async def request_password_reset(
    request_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset email.
    
    - **email**: User's email address
    """
    user = db.query(models.User).filter(
        models.User.email == request_data.email,
        models.User.is_active == True
    ).first()
    
    if user:
        # Generate reset token (valid for 1 hour)
        reset_token = create_access_token(
            user_id=str(user.id),
            expires_delta=timedelta(hours=1),
            additional_claims={"type": "password_reset"}
        )
        
        # TODO: Send password reset email with the token
        reset_url = f"https://yourapp.com/reset-password?token={reset_token}"
        logger.info(f"Password reset URL for {user.email}: {reset_url}")
    
    # Always return 202 to prevent email enumeration
    return {"detail": "If the email exists, a password reset link has been sent"}

@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password with token"
)
async def reset_password(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Reset password using a valid reset token.
    
    - **token**: Password reset token
    - **new_password**: New password (min 8 characters)
    """
    try:
        # Verify the reset token
        payload = jwt.decode(
            reset_data.token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
            options={"verify_aud": True, "verify_iss": True}
        )
        
        # Check token type
        if payload.get("type") != "password_reset":
            raise JWTError("Invalid token type")
        
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("Invalid token payload")
        
        # Get user from database
        user = db.query(models.User).filter(
            models.User.id == user_id,
            models.User.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.hashed_password = get_password_hash(reset_data.new_password)
        user.updated_at = datetime.utcnow()
        
        # Revoke all existing refresh tokens
        redis_client.revoke_all_user_refresh_tokens(str(user.id))
        
        db.commit()
        
        logger.info(f"Password reset successful for user: {user.email}")
        
        return {"detail": "Password has been reset successfully"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired token"
        )
    except Exception as e:
        logger.error(f"Error resetting password: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not reset password"
        )
