"""Create initial Freelancer Memory Agent schema."""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    uuid_id = lambda: sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    stamp = lambda name="created_at": sa.Column(name, sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now())
    op.create_table("clients", uuid_id(), sa.Column("name", sa.Text(), nullable=False), sa.Column("industry", sa.Text()), sa.Column("company_name", sa.Text()), sa.Column("contact_info", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")), sa.Column("communication_preference", sa.Text(), nullable=False, server_default="email"), sa.Column("priority", sa.Text(), nullable=False, server_default="medium"), sa.Column("status", sa.Text(), nullable=False, server_default="active"), stamp(), stamp("updated_at"))
    op.create_index("idx_clients_status", "clients", ["status"])
    op.create_table("projects", uuid_id(), sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE")), sa.Column("name", sa.Text(), nullable=False), sa.Column("description", sa.Text()), sa.Column("budget", sa.Numeric(10, 2)), sa.Column("deadline", sa.Date()), sa.Column("status", sa.Text(), nullable=False, server_default="active"), sa.Column("progress", sa.Integer(), nullable=False, server_default="0"), stamp(), stamp("updated_at"))
    op.create_index("idx_projects_client", "projects", ["client_id"])
    op.create_index("idx_projects_status", "projects", ["status"])
    op.create_table("memories", uuid_id(), sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE")), sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE")), sa.Column("type", sa.Text(), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("embedding", Vector(1536)), sa.Column("confidence", sa.Float(), nullable=False, server_default="0.9"), sa.Column("source", sa.Text()), sa.Column("metadata", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")), sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.true()), stamp(), stamp("last_used_at"))
    op.create_index("idx_memories_client", "memories", ["client_id"])
    op.create_index("idx_memories_type", "memories", ["type"])
    op.create_index("memories_embedding_idx", "memories", ["embedding"], postgresql_using="ivfflat", postgresql_ops={"embedding": "vector_cosine_ops"}, postgresql_with={"lists": 100})
    op.create_table("conversations", uuid_id(), sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE")), sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE")), sa.Column("role", sa.Text(), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("embedding", Vector(1536)), stamp())
    op.create_index("idx_conversations_client", "conversations", ["client_id"])
    op.create_index("conversations_embedding_idx", "conversations", ["embedding"], postgresql_using="ivfflat", postgresql_ops={"embedding": "vector_cosine_ops"}, postgresql_with={"lists": 100})
    op.create_table("payments", uuid_id(), sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE")), sa.Column("amount", sa.Numeric(10, 2), nullable=False), sa.Column("type", sa.Text(), nullable=False), sa.Column("status", sa.Text(), nullable=False, server_default="pending"), sa.Column("due_date", sa.Date()), sa.Column("paid_date", sa.Date()), sa.Column("description", sa.Text()), stamp())
    op.create_index("idx_payments_project", "payments", ["project_id"])
    op.create_index("idx_payments_status", "payments", ["status"])


def downgrade() -> None:
    for table_name in ("payments", "conversations", "memories", "projects", "clients"):
        op.drop_table(table_name)
