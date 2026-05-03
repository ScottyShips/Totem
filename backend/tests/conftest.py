import asyncio

import pytest


@pytest.fixture(scope="session")
def event_loop():
    """
    Share one event loop across all tests in the session.
    SQLAlchemy's async connection pool is tied to the loop it was created on;
    without this, each test function gets a fresh loop and the pool breaks.
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()
