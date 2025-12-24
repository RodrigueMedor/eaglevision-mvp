import os
import logging
import time
from fastapi import Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Skip CSP for docs endpoints to allow ReDoc and Swagger UI to load all required resources
        if request.url.path.startswith(('/api/docs', '/api/redoc', '/api/openapi.json')):
            return response
            
        # Update CSP to allow GraphiQL resources with nonce-based approach
        nonce = os.urandom(16).hex()
        csp = [
            f"default-src 'self'",
            f"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.jsdelivr.net",
            f"style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com https://cdn.jsdelivr.net",
            f"img-src 'self' data: https:;",
            f"connect-src 'self' https:;",
            f"font-src 'self' https: data: https://fonts.gstatic.com;",
            f"frame-src 'self' https:;",
            f"worker-src 'self' blob: https:;"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp)
        
        # Add nonce to response for future use if needed
        response.headers["X-Nonce"] = nonce
        
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

# Rate limiting configuration
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["500 per day", "100 per hour"],  # Stricter default limits
    storage_uri="memory://",
    headers_enabled=True,
    retry_after="http-date"
)

# Whitelist of auth endpoints with more permissive limits
AUTH_ENDPOINTS = {
    "/api/auth/me",
    "/api/auth/token",
    "/api/auth/refresh-token",
    "/api/auth/register"
}

# Rate limit exempt routes
RATE_LIMIT_EXEMPT_ROUTES = {
    "/graphql",
    "/graphiql",
    "/graphiql/",
    "/graphql/test",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/auth/me",
    "/api/auth/token",
    "/api/auth/refresh-token"
}

# Exempt certain endpoints from rate limiting
limiter.exempt_routes = {
    "/api/auth/me",  # Exclude user info endpoint from rate limiting
    "/graphql",      # Exclude GraphQL endpoint
    "/graphiql",     # Exclude GraphiQL interface
    "/graphiql/",    # Exclude GraphiQL interface
    "/graphql/test", # Exclude GraphQL test endpoint
    "/docs",         # Exclude documentation endpoint
    "/redoc",        # Exclude Redoc endpoint
    "/openapi.json", # Exclude OpenAPI endpoint
}

def setup_security(app):
    # List of allowed origins
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Add rate limit middleware
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        # Skip rate limiting for preflight and auth endpoints
        if request.method == "OPTIONS" or request.url.path in AUTH_ENDPOINTS:
            return await call_next(request)
            
        # For non-auth endpoints, use the default limiter
        try:
            # Skip rate limiting for exempt routes
            if request.url.path in RATE_LIMIT_EXEMPT_ROUTES:
                return await call_next(request)
                
            # Check rate limit using the limiter
            response = await request.app.state.limiter.check_rate_limit(request)
            if response:
                return response
                
            # If not rate limited, proceed with the request
            response = await call_next(request)
            
            # Add rate limit headers to the response
            if hasattr(request.state, "rate_limit"):
                rate_limit = request.state.rate_limit
                response.headers["X-RateLimit-Limit"] = str(rate_limit.limit)
                response.headers["X-RateLimit-Remaining"] = str(rate_limit.remaining)
                response.headers["X-RateLimit-Reset"] = str(rate_limit.reset)
                
            return response
            
        except Exception as e:
            logger.error(f"Error in rate limiting: {str(e)}")
            # If there's an error in rate limiting, allow the request to proceed
            return await call_next(request)
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=600,  # Cache preflight requests for 10 minutes
    )
    
    # Add middleware to handle preflight requests
    @app.middleware("http")
    async def add_cors_headers(request: Request, call_next):
        if request.method == "OPTIONS":
            response = Response()
            response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
            response.headers["Access-Control-Allow-Methods"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
            
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Add security headers middleware
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Configure rate limiting
    app.state.limiter = limiter
    
    # Add exception handler for rate limiting
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Add slowapi middleware
    app.add_middleware(SlowAPIMiddleware)
    
    # Add request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
    # Log security events
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        try:
            start_time = datetime.utcnow()
            response = await call_next(request)
            
            # Add process time header
            if hasattr(response, 'headers'):
                process_time = (datetime.utcnow() - start_time).total_seconds()
                response.headers["X-Process-Time"] = str(process_time)
                
                # Log request details
                log_data = {
                    "path": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "process_time": process_time,
                    "client": request.client.host if request.client else "unknown",
                    "user_agent": request.headers.get("user-agent"),
                }
                
                if response.status_code >= 400:
                    logger.warning("Request error", extra={"data": log_data})
                else:
                    logger.debug("Request processed", extra={"data": log_data})
                    
            return response
            
        except Exception as e:
            logger.error(f"Error in request processing: {str(e)}", exc_info=True)
            raise
