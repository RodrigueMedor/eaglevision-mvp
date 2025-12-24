"""Add DocuSign related columns to appointments table

Revision ID: add_docusign_columns
Revises: 
Create Date: 2023-11-16 17:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_docusign_columns'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to the appointments table
    op.add_column('appointments', sa.Column('document_signed', sa.Boolean(), server_default='f', nullable=False))
    op.add_column('appointments', sa.Column('envelope_id', sa.String(), nullable=True))
    op.add_column('appointments', sa.Column('document_url', sa.String(), nullable=True))
    op.add_column('appointments', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('appointments', sa.Column('last_name', sa.String(), nullable=True))
    op.add_column('appointments', sa.Column('email', sa.String(), nullable=True))
    op.add_column('appointments', sa.Column('phone', sa.String(), nullable=True))

def downgrade():
    # Remove the columns if we need to rollback
    op.drop_column('appointments', 'document_signed')
    op.drop_column('appointments', 'envelope_id')
    op.drop_column('appointments', 'document_url')
    op.drop_column('appointments', 'first_name')
    op.drop_column('appointments', 'last_name')
    op.drop_column('appointments', 'email')
    op.drop_column('appointments', 'phone')
