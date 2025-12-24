import os
import json
import logging
from typing import Optional, Dict, Any
import redis
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class RedisClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        self.redis_host = os.getenv("REDIS_HOST", "localhost")
        self.redis_port = int(os.getenv("REDIS_PORT", 6379))
        self.redis_db = int(os.getenv("REDIS_DB", 0))
        self.redis_password = os.getenv("REDIS_PASSWORD")
        logger.info(f"Initializing Redis client - host: {self.redis_host}, port: {self.redis_port}, db: {self.redis_db}")
        self.redis = self._create_redis_connection()
        logger.info("Redis client initialized successfully")
    
    def _create_redis_connection(self):
        try:
            return redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                password=self.redis_password,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                retry_on_timeout=True,
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
    
    def is_healthy(self) -> bool:
        """Check if Redis is healthy"""
        try:
            result = self.redis.ping()
            logger.debug(f"Redis health check: {result}")
            return result
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return False
    
    # Session management
    def _get_session_key(self, user_id: str, request: Any = None) -> str:
        """Generate a session key based on user_id, IP, and user agent"""
        if request:
            client_ip = request.client.host if request.client else 'unknown'
            user_agent = request.headers.get('user-agent', 'unknown')
            return f"session:{user_id}:{client_ip}:{user_agent}"
        return f"session:{user_id}"

    def get_user_sessions(self, user_id: str) -> list:
        """Get all active sessions for a user"""
        try:
            pattern = f"session:{user_id}:*"
            return [key for key in self.redis.scan_iter(match=pattern)]
        except Exception as e:
            logger.error(f"Error getting user sessions: {str(e)}")
            return []

    def revoke_user_sessions(self, user_id: str, current_session_key: str = None):
        """Revoke all sessions for a user except the current one"""
        try:
            sessions = self.get_user_sessions(user_id)
            for session_key in sessions:
                if current_session_key and session_key == current_session_key:
                    continue
                self.redis.delete(session_key)
            return True
        except Exception as e:
            logger.error(f"Error revoking user sessions: {str(e)}")
            return False

    # Token management
    def store_refresh_token(self, user_id: str, token_id: str, expires_in: int, token_family: str = None) -> bool:
        """Store refresh token with TTL
        
        Args:
            user_id: The user ID
            token_id: The unique token ID (jti)
            expires_in: TTL in seconds
            token_family: (Optional) The token family for rotation
            
        Returns:
            bool: True if stored successfully, False otherwise
        """
        try:
            # Store the token ID with the family as value
            if token_family:
                family_key = f"token_family:{user_id}:{token_family}"
                self.redis.setex(family_key, expires_in, token_id)
                
            # Store the token ID with a reference to its family
            token_key = f"refresh_token:{user_id}:{token_id}"
            return self.redis.setex(token_key, expires_in, token_family or "")
        except Exception as e:
            logger.error(f"Error storing refresh token: {str(e)}", exc_info=True)
            return False
    
    def is_valid_refresh_token(self, user_id: str, token_id: str, token_family: str = None) -> bool:
        """Check if refresh token is valid and belongs to the specified family
        
        Args:
            user_id: The user ID
            token_id: The token ID (jti) to check
            token_family: (Optional) The expected token family
            
        Returns:
            bool: True if the token is valid, False otherwise
        """
        try:
            if not self.is_healthy():
                logger.warning("Redis is not healthy, cannot validate refresh token")
                return False
                
            token_key = f"refresh_token:{user_id}:{token_id}"
            
            # First check if the token exists
            if not self.redis.exists(token_key):
                logger.debug(f"Token not found in Redis: {token_key}")
                return False
                
            # If no family is provided, just check if the token exists
            if not token_family:
                logger.debug(f"No token family provided, token exists: {token_key}")
                return True
                
            # Get the stored family for this token
            stored_family = self.redis.get(token_key)
            logger.debug(f"Token {token_id} has family: {stored_family}, expected: {token_family}")
            
            # If the stored family matches the expected family, token is valid
            if stored_family == token_family:
                logger.debug(f"Token family matches for {token_id}")
                return True
                
            # Also check if this token ID is the current one for the family
            family_key = f"token_family:{user_id}:{token_family}"
            current_token_id = self.redis.get(family_key)
            logger.debug(f"Current token ID for family {token_family}: {current_token_id}")
            
            if current_token_id and current_token_id == token_id:
                logger.debug(f"Token {token_id} is the current token for family {token_family}")
                return True
                
            logger.warning(f"Token validation failed for user {user_id}, token {token_id}, family {token_family}")
            return False
            
        except Exception as e:
            logger.error(f"Error validating refresh token: {str(e)}", exc_info=True)
            # In case of Redis errors, fail open to avoid locking users out
            # This is a security trade-off - you might want to adjust based on your requirements
            return True
    
    def revoke_refresh_token(self, user_id: str, token_id: str) -> bool:
        """Revoke a specific refresh token by its ID
        
        Args:
            user_id: The user ID
            token_id: The token ID (jti) to revoke
            
        Returns:
            bool: True if token was found and deleted, False otherwise
        """
        try:
            # First get the token family (if any)
            token_key = f"refresh_token:{user_id}:{token_id}"
            token_family = self.redis.get(token_key)
            
            # Delete the token
            deleted = bool(self.redis.delete(token_key))
            
            # If this token was part of a family, clean up the family reference
            if token_family:
                family_key = f"token_family:{user_id}:{token_family}"
                current_token_id = self.redis.get(family_key)
                if current_token_id == token_id:
                    self.redis.delete(family_key)
            
            return deleted
        except Exception as e:
            logger.error(f"Error revoking refresh token: {str(e)}", exc_info=True)
            return False
    
    def revoke_all_user_refresh_tokens(self, user_id: str) -> int:
        """Revoke all refresh tokens and token families for a user
        
        Args:
            user_id: The user ID
            
        Returns:
            int: Number of tokens revoked
        """
        try:
            # Delete all refresh tokens
            token_pattern = f"refresh_token:{user_id}:*"
            token_keys = self.redis.keys(token_pattern)
            
            # Delete all token families
            family_pattern = f"token_family:{user_id}:*"
            family_keys = self.redis.keys(family_pattern)
            
            # Delete all found keys
            all_keys = token_keys + family_keys
            if all_keys:
                return self.redis.delete(*all_keys)
            return 0
        except Exception as e:
            logger.error(f"Error revoking all refresh tokens: {str(e)}", exc_info=True)
            return 0
    
    # Rate limiting
    def is_rate_limited(
        self, 
        key: str, 
        limit: int, 
        window: int = 60
    ) -> tuple[bool, int]:
        """Check if rate limit is exceeded"""
        try:
            current = self.redis.get(key)
            if current is None:
                self.redis.setex(key, window, 1)
                return False, limit - 1
            
            current = int(current)
            if current >= limit:
                return True, 0
            
            self.redis.incr(key)
            return False, limit - current - 1
        except Exception as e:
            logger.error(f"Error in rate limiting: {str(e)}")
            return False, limit
    
    # Blacklist
    def add_to_blacklist(self, token: str, expire_in_seconds: int) -> bool:
        """Add token to blacklist"""
        try:
            return bool(
                self.redis.setex(
                    f"blacklist:{token}", 
                    expire_in_seconds, 
                    "1"
                )
            )
        except Exception as e:
            logger.error(f"Error adding to blacklist: {str(e)}")
            return False
    
    def is_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            return bool(self.redis.exists(f"blacklist:{token}"))
        except Exception as e:
            logger.error(f"Error checking blacklist: {str(e)}")
            return True  # Fail safe - if we can't check, assume token is blacklisted

# Singleton instance
redis_client = RedisClient()
