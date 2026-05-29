"""add_semantic_matching_and_alerts

Revision ID: 23d3fff296a2
Revises: d9dcd97b8516
Create Date: 2026-05-29 19:27:17.429288

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '23d3fff296a2'
down_revision: Union[str, Sequence[str], None] = 'd9dcd97b8516'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create the grant_matches table
    op.create_table('grant_matches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('organization_id', sa.Integer(), nullable=False),
    sa.Column('grant_id', sa.Integer(), nullable=False),
    sa.Column('score', sa.Float(), nullable=False),
    sa.Column('explanation', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['grant_id'], ['grants.id'], ),
    sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_grant_matches_id'), 'grant_matches', ['id'], unique=False)
    
    # Add match_threshold and alert_email_enabled to organizations
    # In SQLite, we can add columns with server_default to satisfy NOT NULL constraints on existing rows
    op.add_column('organizations', sa.Column('match_threshold', sa.Float(), nullable=False, server_default='0.7'))
    op.add_column('organizations', sa.Column('alert_email_enabled', sa.Boolean(), nullable=False, server_default='1'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('organizations', 'alert_email_enabled')
    op.drop_column('organizations', 'match_threshold')
    op.drop_index(op.f('ix_grant_matches_id'), table_name='grant_matches')
    op.drop_table('grant_matches')
