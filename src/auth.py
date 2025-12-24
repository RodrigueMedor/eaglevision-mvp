from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend import models
from backend.database import get_db
import os
import logging
import uuid
from dotenv import load_dotenv

# Import Redis client
from backend.redis_client import redis_client

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is not set")
    
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
# Token expiration settings
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))  # 30 minutes for access token
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))  # Default 7 days for refresh token
DEFAULT_REFRESH_TOKEN_DAYS = REFRESH_TOKEN_EXPIRE_DAYS  # Alias for backward compatibility
REMEMBER_ME_REFRESH_DAYS = 30  # 30 days for "Remember Me" sessions
TOKEN_ISSUER = os.getenv("TOKEN_ISSUER", "eaglevision-mvp")
TOKEN_AUDIENCE = os.getenv("TOKEN_AUDIENCE", "eaglevision-users")

# Token URLs
TOKEN_URL = "/api/auth/token"
REFRESH_TOKEN_URL = "/api/auth/refresh-token"

# Security
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=TOKEN_URL,
    auto_error=False
)

# Password hashing
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Convert the plain password to bytes if it's not already
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        
        # Convert the hashed password to bytes if it's not already
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
            
        # Verify the password using bcrypt
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    # Convert the password to bytes if it's not already
    if isinstance(password, str):
        password = password.encode('utf-8')
    
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    
    # Return the hashed password as a string
    return hashed.decode('utf-8')

# User authentication
def authenticate_user(db: Session, email: str, password: str):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

# Token creation
def create_access_token(
    user_id: str,
    additional_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None
):
    """
    Creates a new access token with the provided user ID and additional claims.
    """
    try:
        now = datetime.utcnow()
        expires_delta = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": str(user_id),
            "jti": str(uuid.uuid4()),
            "type": "access",
            "iat": now,
            "nbf": now,  # Not before
            "exp": now + expires_delta,
            "iss": TOKEN_ISSUER,
            "aud": TOKEN_AUDIENCE,
        }
        
        if additional_claims:
            to_encode.update(additional_claims)
            
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
        
    except Exception as e:
        logger.error(f"Error creating access token: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create access token"
        )

def create_refresh_token(
    user_id: str,
    token_family: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
    remember_me: bool = False
) -> Tuple[str, str]:
    """
    Creates a new refresh token with the provided user ID and token family.
    Returns a tuple of (token, token_family).
    If token_family is None, a new one will be generated.
    
    Args:
        user_id: The user ID to create the token for
        token_family: Optional token family for refresh token rotation
        expires_delta: Optional timedelta for token expiration
        remember_me: If True, uses longer expiration time (30 days)
        
    Returns:
        Tuple of (token, token_family)
    """
    try:
        now = datetime.utcnow()
        
        # Set expiration based on remember_me
        if expires_delta is None:
            expires_delta = timedelta(
                days=REMEMBER_ME_REFRESH_DAYS if remember_me 
                else REFRESH_TOKEN_EXPIRE_DAYS
            )
            
        expire = now + expires_delta
        
        # Generate a new token family if not provided
        if token_family is None:
            token_family = str(uuid.uuid4())
            
        # Create a unique token ID for this refresh token
        token_id = str(uuid.uuid4())
        
        # Prepare the token data
        to_encode = {
            "sub": str(user_id),
            "jti": token_id,
            "tf": token_family,  # Token family
            "type": "refresh",
            "iat": now,
            "nbf": now,
            "exp": expire,
            "iss": TOKEN_ISSUER,
            "aud": TOKEN_AUDIENCE,
            "rm": remember_me  # Include remember_me flag in the token
        }
        
        # Create the JWT token
        encoded_jwt = jwt.encode(
            to_encode,
            SECRET_KEY,
            algorithm=ALGORITHM,
            headers={"kid": "refresh"}  # Key ID for key rotation
        )
        
        # Return the token and token family
        return encoded_jwt, token_family
        
    except Exception as e:
        logger.error(f"Error creating refresh token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create refresh token"
        )

async def verify_token(token: str):
    """
    Verify and decode a JWT token.
    Also checks if the token is blacklisted.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Your session has expired. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Check if token is blacklisted
        if redis_client.is_blacklisted(token):
            logger.warning(f"Blacklisted token attempt: {token[:10]}...")
            raise credentials_exception
            
        # Decode the token
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
            options={
                "require": ["exp", "iat", "sub"],
                "verify_exp": True,
                "verify_iat": True,
                "verify_nbf": False,
                "verify_iss": True,
                "verify_aud": True,
                "verify_signature": True
            }
        )
        
        # Additional validation
        if not payload.get("sub"):
            logger.warning("Token missing 'sub' claim")
            raise credentials_exception
            
        # Check token type if present
        token_type = payload.get("type")
        if token_type and token_type not in ["access", "refresh"]:
            logger.warning(f"Invalid token type: {token_type}")
            raise credentials_exception
            
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.info("Token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    except jwt.JWTError as e:
        logger.warning(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency to get the current authenticated user from the JWT token.
    Includes additional security checks and logging.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify and decode the token
        payload = await verify_token(token)
        
        # Check token type (should be access token)
        if payload.get("type") != "access":
            logger.warning(f"Invalid token type: {payload.get('type')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user ID from token
        user_id: str = payload.get("sub")
        if not user_id:
            logger.warning("No user ID in token payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user = db.query(models.User).filter(
            models.User.id == user_id,
            models.User.is_active == True
        ).first()
        
        if not user:
            logger.warning(f"User not found or inactive: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Log successful authentication
        client_host = request.client.host if request.client else "unknown"
        logger.info(f"Authenticated user: {user.email} from {client_host}")
        
        # Update last login time (but don't commit yet - let the endpoint handle it)
        user.last_login = datetime.utcnow()
        
        # Add user to request state for logging/monitoring
        request.state.user = user
        
        return user
        
    except HTTPException as he:
        # Log failed authentication attempts
        client_host = request.client.host if request.client else "unknown"
        logger.warning(
            f"Authentication failed from {client_host}: {str(he.detail)}",
            extra={"status_code": he.status_code, "client": client_host}
        )
        raise
        
    except Exception as e:
        logger.error(
            f"Unexpected error in get_current_user: {str(e)}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while authenticating",
        )

async def get_current_active_user(current_user: models.User = Depends(get_current_user)):
    # Add any additional checks here (e.g., is_active, is_verified, etc.)
    return current_user

def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract user ID from a JWT token without validation.
    Only use this when you trust the token source (e.g., just created it).
    """
    try:
        # Decode without verification since we just created this token
        payload = jwt.get_unverified_claims(token)
        return payload.get("sub")
    except JWTError as e:
        logger.error(f"Error decoding token: {str(e)}")
        return None

# Role-based access control
def has_role(required_roles):
    def role_checker(current_user: models.User = Depends(get_current_active_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker
