"""Add profile fields to users table

Revision ID: 1234567890ab
Revises: <previous_migration_id>
Create Date: 2025-11-30 17:44:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1234567890ab'
down_revision = '<previous_migration_id>'
branch_labels = None
depends_on = None

def upgrade():
    # Add first_name column
    op.add_column('users', sa.Column('first_name', sa.String(length=100), nullable=True))
    
    # Add last_name column
    op.add_column('users', sa.Column('last_name', sa.String(length=100), nullable=True))
    
    # Add phone_number column (keeping existing phone column for backward compatibility)
    op.add_column('users', sa.Column('phone_number', sa.String(length=20), nullable=True))
    
    # Add profile_picture_url column
    op.add_column('users', sa.Column('profile_picture_url', sa.Text(), nullable=True))
    
    # Update existing full_name to first_name and last_name
    op.execute("""
        UPDATE users 
        SET 
            first_name = split_part(full_name, ' ', 1),
            last_name = CASE 
                WHEN position(' ' in full_name) > 0 
                THEN substring(full_name from position(' ' in full_name) + 1)
                ELSE ''
            END,
            phone_number = phone
    """)
    
    # Make first_name and last_name not nullable after migration
    op.alter_column('users', 'first_name', nullable=False)
    op.alter_column('users', 'last_name', nullable=False)

def downgrade():
    # Drop the added columns
    op.drop_column('users', 'profile_picture_url')
    op.drop_column('users', 'phone_number')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
