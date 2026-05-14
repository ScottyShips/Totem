"""performance_times_nullable

Revision ID: c5d8e2a91f47
Revises: b8e2f1a4c6d3
Create Date: 2026-05-14 12:00:00.000000

Make performances.start_time and performances.end_time nullable so an announced
lineup can be seeded before official set-times are published. UI renders nulls
as "TBD" and conflict detection skips performances with null times.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c5d8e2a91f47'
down_revision: Union[str, None] = 'b8e2f1a4c6d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('performances', 'start_time', existing_type=sa.DateTime(), nullable=True)
    op.alter_column('performances', 'end_time', existing_type=sa.DateTime(), nullable=True)


def downgrade() -> None:
    op.alter_column('performances', 'end_time', existing_type=sa.DateTime(), nullable=False)
    op.alter_column('performances', 'start_time', existing_type=sa.DateTime(), nullable=False)
