"""Add messages tables

Revision ID: 20231125_add_messages_tables
Revises: 
Create Date: 2023-11-25 02:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20231125_add_messages_tables'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    message_status = sa.Enum('draft', 'sent', 'delivered', 'failed', name='messagestatus')
    message_type = sa.Enum('email', 'sms', 'push', 'in_app', name='messagetype')
    recipient_type = sa.Enum('all', 'client', 'staff', 'specific', name='recipienttype')
    
    # Create the tables
    op.create_table(
        'messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('message_type', message_type, nullable=False, server_default='email'),
        sa.Column('status', message_status, nullable=False, server_default='draft'),
        sa.Column('recipient_type', recipient_type, nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_table(
        'message_recipients',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=False),
        sa.Column('status', message_status, nullable=False, server_default='draft'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)
    op.create_index(op.f('ix_messages_status'), 'messages', ['status'], unique=False)
    op.create_index(op.f('ix_message_recipients_message_id'), 'message_recipients', ['message_id'], unique=False)
    op.create_index(op.f('ix_message_recipients_recipient_id'), 'message_recipients', ['recipient_id'], unique=False)
    op.create_index(op.f('ix_message_recipients_status'), 'message_recipients', ['status'], unique=False)

def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_message_recipients_status'), table_name='message_recipients')
    op.drop_index(op.f('ix_message_recipients_recipient_id'), table_name='message_recipients')
    op.drop_index(op.f('ix_message_recipients_message_id'), table_name='message_recipients')
    op.drop_index(op.f('ix_messages_status'), table_name='messages')
    op.drop_index(op.f('ix_messages_sender_id'), table_name='messages')
    
    # Drop tables
    op.drop_table('message_recipients')
    op.drop_table('messages')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS messagestatus CASCADE")
    op.execute("DROP TYPE IF EXISTS messagetype CASCADE")
    op.execute("DROP TYPE IF EXISTS recipienttype CASCADE")
