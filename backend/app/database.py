from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager, contextmanager
from app.config import settings

# Async Engine and Session
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Sync Engine and Session for data seeding & scripts
sync_engine = create_engine(
    settings.DATABASE_URL_SYNC,
    echo=False,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()

@contextmanager
def get_sync_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
