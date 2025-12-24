from fastapi import Request, Depends, HTTPException, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from strawberry.fastapi import GraphQLRouter
import strawberry
from typing import Any, Dict, Optional, List, Union, Callable, Awaitable
from contextlib import contextmanager
import json
from jose import JWTError, jwt
import os
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Import database session
from backend.database import get_db, SessionLocal
from backend.auth import SECRET_KEY, ALGORITHM, verify_token
from backend import models

# Import schema components
try:
    from .schema import Query, Mutation
except ImportError:
    # Fallback for direct execution
    from gql.schema import Query, Mutation

# Create schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# JWT Authentication
security = HTTPBearer()

@contextmanager
def get_db_session():
    """Get a database session with proper cleanup."""
    db = next(get_db())
    try:
        yield db
    finally:
        db.close()

async def get_current_user_from_token(token: str, db: SessionLocal) -> models.User:
    """Get the current user from the JWT token."""
    try:
        # Use the existing verify_token function which includes all the security checks
        payload = verify_token(token)
        if not payload or "sub" not in payload:
            logger.warning("Invalid token: No 'sub' in payload")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        user_id = payload["sub"]
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        if not user:
            logger.warning(f"User not found for ID: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        logger.info(f"Authenticated user: {user.email}")
        return user
        
    except HTTPException:
        raise
    except JWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error in get_current_user_from_token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during authentication",
        )

async def get_context(request: Request) -> Dict[str, Any]:
    """Create a context for each GraphQL request with authentication."""
    db = next(get_db())
    current_user = None
    
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            if token:
                try:
                    current_user = await get_current_user_from_token(token, db)
                except HTTPException as e:
                    if e.status_code == status.HTTP_401_UNAUTHORIZED:
                        logger.warning("Invalid/expired token provided")
                        # Don't return a response here, just let the resolver handle it
                        pass
                    else:
                        logger.error(f"Error getting current user: {str(e)}")
        
        return {
            "request": request,
            "db": db,
            "current_user": current_user
        }
        
    except Exception as e:
        logger.error(f"Error in get_context: {str(e)}")
        # Return a basic context without user if there's an error
        return {
            "request": request,
            "db": db,
            "current_user": None
        }

# Create GraphQL router
router = GraphQLRouter(
    schema,
    graphiql=True,
    context_getter=get_context
)

@router.post("/")
async def graphql_post(request: Request):
    """Handle GraphQL POST requests."""
    try:
        data = await request.json()
        query = data.get("query")
        variables = data.get("variables", {})
        operation_name = data.get("operationName")
        
        if not query:
            raise HTTPException(status_code=400, detail="No query provided")
            
        result = await schema.execute(
            query,
            variable_values=variables,
            operation_name=operation_name,
            context_value=await get_context(request)
        )
        
        return {
            "data": result.data,
            "errors": [
                {"message": str(error), "locations": getattr(error, "locations", None)}
                for error in result.errors or []
            ] if result.errors else None
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add a test endpoint
@router.get("/test")
async def test_graphql():
    return {"status": "GraphQL endpoint is working"}
