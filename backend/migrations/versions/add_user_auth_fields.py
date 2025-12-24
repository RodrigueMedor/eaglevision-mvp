"""Add user auth fields

Revision ID: add_user_auth_fields
Revises: 
Create Date: 2023-11-18 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_user_auth_fields'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to users table
    op.add_column('users', sa.Column('hashed_password', sa.String(), nullable=False, server_default=''))
    op.add_column('users', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('last_login', sa.DateTime(), nullable=True))
    
    # Create an index on the email column if it doesn't exist
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    
    # Update existing admin user with a default password (admin123)
    from sqlalchemy.sql import table, column
    from sqlalchemy import String
    from passlib.context import CryptContext
    
    users = table('users',
        column('email', String),
        column('hashed_password', String)
    )
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash("admin123")
    
    op.execute(
        users.update().
        where(users.c.email == 'admin@eaglevision.com').
        values(hashed_password=hashed_password, is_active=True, is_verified=True)
    )

def downgrade():
    # Drop the columns we added
    op.drop_column('users', 'last_login')
    op.drop_column('users', 'is_verified')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'hashed_password')
    op.drop_index(op.f('ix_users_email'), table_name='users')
