---
skill_name: pytest-patterns
skill_category: testing
description: Pytest testing patterns, anti-patterns, and quality rules
allowed_tools: [Read, Edit, Write, Grep, Bash]
token_estimate: 1800
version: 1.0
last_updated: 2026-01-13
owner: Claude Copilot
status: active
tags: [pytest, testing, python, unit-test, integration-test, quality, fixtures]
related_skills: [python-idioms, jest-patterns]
trigger_files: ["test_*.py", "*_test.py", "conftest.py", "pytest.ini", "pyproject.toml"]
trigger_keywords: [pytest, fixture, parametrize, mock, patch, assert, conftest]
---

# Pytest Patterns

Modern pytest testing patterns, anti-patterns, and quality rules for Python.

## Core Principles

| Principle | Description |
|-----------|-------------|
| **Fixtures over setup** | Use fixtures for test dependencies |
| **Parametrize** | Test multiple cases without duplication |
| **Explicit is better** | Clear test names and assertions |
| **Fast isolation** | Each test runs independently |

## Patterns vs Anti-Patterns

### Fixtures

```python
# GOOD: Fixtures for test dependencies
@pytest.fixture
def db_session():
    """Provide a clean database session."""
    session = create_session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def sample_user(db_session):
    """Create a sample user for tests."""
    user = User(name="John", email="john@example.com")
    db_session.add(user)
    db_session.commit()
    return user

def test_get_user(db_session, sample_user):
    result = get_user_by_id(db_session, sample_user.id)
    assert result.name == "John"

# BAD: Setup in each test
def test_get_user():
    session = create_session()
    user = User(name="John", email="john@example.com")
    session.add(user)
    session.commit()
    # ... test code
    session.rollback()  # Easy to forget cleanup!
```

### Fixture Scopes

```python
# GOOD: Appropriate fixture scopes
@pytest.fixture(scope="session")
def docker_db():
    """Start database container once per test session."""
    container = start_postgres_container()
    yield container
    container.stop()

@pytest.fixture(scope="module")
def api_client():
    """Create API client once per test module."""
    return APIClient(base_url="http://test.local")

@pytest.fixture  # Default: function scope
def clean_data(db_session):
    """Fresh data for each test."""
    yield
    db_session.query(User).delete()

# BAD: Wrong scope causes test pollution
@pytest.fixture(scope="session")  # DANGER!
def user():
    return User(name="John")  # Shared across all tests!
```

### Parametrization

```python
# GOOD: Parametrize for multiple cases
@pytest.mark.parametrize("email,valid", [
    ("user@example.com", True),
    ("user.name@example.co.uk", True),
    ("invalid-email", False),
    ("@missing.local", False),
    ("", False),
])
def test_email_validation(email, valid):
    assert validate_email(email) == valid

# GOOD: Multiple parameters with IDs
@pytest.mark.parametrize(
    "input_data,expected",
    [
        pytest.param({"name": "John"}, True, id="valid-name"),
        pytest.param({"name": ""}, False, id="empty-name"),
        pytest.param({}, False, id="missing-name"),
    ]
)
def test_user_validation(input_data, expected):
    assert is_valid_user(input_data) == expected

# BAD: Repeated test code
def test_valid_email():
    assert validate_email("user@example.com") is True

def test_valid_email_with_subdomain():
    assert validate_email("user@sub.example.com") is True

def test_invalid_email():
    assert validate_email("invalid") is False
# ... 10 more nearly identical tests
```

### Mocking

```python
# GOOD: Use pytest-mock fixture
def test_api_call(mocker):
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.json.return_value = {"data": "test"}

    result = fetch_data("http://api.example.com")

    assert result["data"] == "test"
    mock_get.assert_called_once_with("http://api.example.com")

# GOOD: Context manager for scoped patches
def test_with_timeout(mocker):
    with mocker.patch("time.sleep"):
        result = operation_with_retry()
        assert result is not None

# GOOD: Spy for partial mocking
def test_logs_error(mocker):
    spy = mocker.spy(logger, "error")

    process_invalid_data()

    spy.assert_called_once()

# BAD: Overuse of mocking
def test_save_user(mocker):
    mocker.patch("module.validate")
    mocker.patch("module.normalize")
    mocker.patch("module.db.save")
    mocker.patch("module.cache.invalidate")
    mocker.patch("module.events.publish")
    # Testing nothing but mocks!
```

### Assertions

```python
# GOOD: Clear, specific assertions
def test_user_creation():
    user = create_user("John", "john@example.com")

    assert user.name == "John"
    assert user.email == "john@example.com"
    assert user.id is not None

# GOOD: Use pytest.raises for exceptions
def test_invalid_email_raises():
    with pytest.raises(ValidationError) as exc_info:
        create_user("John", "invalid-email")

    assert "email" in str(exc_info.value)
    assert exc_info.value.field == "email"

# GOOD: Approximate comparisons
def test_calculation():
    result = complex_calculation()
    assert result == pytest.approx(3.14159, rel=1e-5)

# BAD: Vague assertions
def test_result():
    result = process()
    assert result  # What should it be?
    assert result is not None  # Still unclear

# BAD: Exception testing without context
def test_raises():
    try:
        risky_operation()
        assert False, "Should have raised"
    except Exception:
        pass  # What exception? What message?
```

### Test Organization

```python
# GOOD: Class-based grouping for related tests
class TestUserService:
    """Tests for UserService class."""

    @pytest.fixture(autouse=True)
    def setup(self, db_session):
        self.service = UserService(db_session)
        self.db = db_session

    def test_create_user(self):
        user = self.service.create("John", "john@example.com")
        assert user.id is not None

    def test_create_duplicate_raises(self, sample_user):
        with pytest.raises(DuplicateError):
            self.service.create(sample_user.name, sample_user.email)

# GOOD: conftest.py for shared fixtures
# conftest.py
@pytest.fixture
def app():
    """Create test application."""
    return create_app(testing=True)

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()
```

## Anti-Patterns to Avoid

### Test Pollution

```python
# BAD: Shared mutable state
users = []  # Module-level! Shared across tests!

def test_add_user():
    users.append(User("John"))
    assert len(users) == 1  # May fail if other test ran first!

# GOOD: Fresh state per test
@pytest.fixture
def users():
    return []

def test_add_user(users):
    users.append(User("John"))
    assert len(users) == 1  # Always passes
```

### Slow Tests

```python
# BAD: Real network calls
def test_fetch_data():
    result = requests.get("https://api.example.com/data")  # Slow, flaky
    assert result.status_code == 200

# GOOD: Mock external services
def test_fetch_data(mocker):
    mocker.patch("requests.get").return_value.status_code = 200
    result = fetch_external_data()
    assert result is not None

# BAD: Unnecessary sleep
def test_async_operation():
    start_operation()
    time.sleep(5)  # Why?
    assert is_complete()

# GOOD: Poll or use async waiting
def test_async_operation():
    start_operation()
    wait_for(is_complete, timeout=5)
    assert is_complete()
```

### Assertion in Loop

```python
# BAD: Loop hides failures
def test_all_users_valid():
    users = get_all_users()
    for user in users:
        assert user.is_valid()  # Which one failed?

# GOOD: Clear failure messages
def test_all_users_valid():
    users = get_all_users()
    invalid = [u for u in users if not u.is_valid()]
    assert not invalid, f"Invalid users: {invalid}"

# GOOD: Parametrize instead
@pytest.mark.parametrize("user_id", [1, 2, 3, 4, 5])
def test_user_valid(user_id, db_session):
    user = get_user(db_session, user_id)
    assert user.is_valid()
```

### Testing Implementation

```python
# BAD: Testing internal state
def test_cache_internals():
    cache = Cache()
    cache.set("key", "value")
    assert cache._internal_dict["key"] == "value"  # Private!

# GOOD: Test public behavior
def test_cache_retrieval():
    cache = Cache()
    cache.set("key", "value")
    assert cache.get("key") == "value"

# BAD: Testing order of operations
def test_save_calls_validate(mocker):
    validate = mocker.patch("module.validate")
    save("data")
    validate.assert_called_before(save)  # Implementation detail!

# GOOD: Test the outcome
def test_save_validates_data():
    with pytest.raises(ValidationError):
        save(invalid_data)
```

## Configuration Best Practices

```ini
# pytest.ini or pyproject.toml [tool.pytest.ini_options]
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short --strict-markers
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
filterwarnings =
    error
    ignore::DeprecationWarning
```

```python
# pyproject.toml
[tool.pytest.ini_options]
minversion = "7.0"
addopts = "-ra -q --strict-markers"
testpaths = ["tests"]

[tool.coverage.run]
source = ["src"]
branch = true

[tool.coverage.report]
fail_under = 80
```

## Quality Checklist

| Check | Rule |
|-------|------|
| Fixtures | Use fixtures over inline setup |
| Parametrize | One test function for similar cases |
| Clear assertions | Specific comparisons, not just truthiness |
| Exception testing | Use pytest.raises with message checks |
| No shared state | Each test is independent |
| Fast execution | Mock external services |
| Descriptive names | test_<action>_<expected> format |
| Proper scopes | Match fixture scope to usage |
