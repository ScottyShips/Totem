"""add_spotify_id_to_artists

Revision ID: 7a31f2c8d4e5
Revises: 3c94c972bba8
Create Date: 2026-05-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a31f2c8d4e5'
down_revision: Union[str, None] = '3c94c972bba8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('artists', sa.Column('spotify_id', sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column('artists', 'spotify_id')
