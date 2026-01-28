"""Add AD fields to users table

Revision ID: add_ad_fields
Revises: add_subsystems_table
Create Date: 2026-01-28

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_ad_fields'
down_revision = None  # Update this if you have a previous migration
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns for AD integration
    op.add_column('users', sa.Column('phone', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('ad_guid', sa.String(36), nullable=True))
    op.add_column('users', sa.Column('ad_dn', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('ad_disabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('ad_manager_dn', sa.String(500), nullable=True))
    op.add_column('users', sa.Column('last_ad_sync', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('termination_date', sa.DateTime(timezone=True), nullable=True))

    # Create index on ad_guid for faster lookups
    op.create_index('ix_users_ad_guid', 'users', ['ad_guid'], unique=True)


def downgrade():
    op.drop_index('ix_users_ad_guid', table_name='users')
    op.drop_column('users', 'termination_date')
    op.drop_column('users', 'last_ad_sync')
    op.drop_column('users', 'ad_manager_dn')
    op.drop_column('users', 'ad_disabled')
    op.drop_column('users', 'ad_dn')
    op.drop_column('users', 'ad_guid')
    op.drop_column('users', 'phone')
