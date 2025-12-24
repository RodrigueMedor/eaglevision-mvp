import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app, get_docusign_client
from docusign_esign import EnvelopesApi

# Create test client with the correct initialization for FastAPI 0.95.0
client = TestClient(app)

# Mock the get_docusign_client function for all tests
@pytest.fixture(autouse=True)
def mock_docusign_client():
    with patch('main.get_docusign_client') as mock_get_client:
        mock_api_client = MagicMock()
        mock_api_client.host = "https://demo.docusign.net"
        mock_get_client.return_value = mock_api_client
        yield mock_get_client

def test_health_check():
    """Test the health check endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_create_envelope_success(mock_docusign_client):
    """Test successful envelope creation"""
    # Mock the DocuSign client and API responses
    mock_envelopes_api = MagicMock(spec=EnvelopesApi)
    mock_envelopes_api.create_envelope.return_value = MagicMock(envelope_id="test-env-123")
    mock_envelopes_api.create_recipient_view.return_value = MagicMock(url="https://demo.docusign.net/return/url")
    
    # Configure the mock client
    mock_docusign_client.return_value = MagicMock()
    
    # Mock the EnvelopesApi constructor to return our mock
    with patch('main.EnvelopesApi', return_value=mock_envelopes_api):
        test_data = {
            "signer": {
                "email": "test@example.com",
                "name": "Test User",
                "client_user_id": "12345"
            },
            "return_url": "http://localhost:3000/signed"
        }
        
        response = client.post("/api/docusign/envelope", json=test_data)
        
        # Assert the response
        assert response.status_code == 200
        assert "envelope_id" in response.json()
        assert "redirect_url" in response.json()
        assert response.json()["envelope_id"] == "test-env-123"

def test_create_envelope_missing_fields():
    """Test envelope creation with missing required fields"""
    test_data = {
        "signer": {
            "email": "test@example.com"
            # Missing name and client_user_id
        }
        # Missing return_url
    }
    
    response = client.post("/api/docusign/envelope", json=test_data)
    assert response.status_code == 422  # Validation error

def test_create_envelope_docusign_error(mock_docusign_client):
    """Test handling of DocuSign API errors"""
    # Mock the EnvelopesApi to raise an exception
    with patch('main.EnvelopesApi') as mock_envelopes_api:
        mock_envelopes_api.side_effect = Exception("DocuSign API error")
        
        test_data = {
            "signer": {
                "email": "test@example.com",
                "name": "Test User",
                "client_user_id": "12345"
            },
            "return_url": "http://localhost:3000/signed"
        }
        
        response = client.post("/api/docusign/envelope", json=test_data)
        assert response.status_code == 500
        assert "DocuSign API error" in response.json()["detail"]

def test_invalid_account_id_format():
    """Test handling of invalid account ID format"""
    # Test with an invalid user ID format
    with patch.dict('main.DS_CONFIG', {"ds_impersonated_user_id": "invalid-format"}):
        test_data = {
            "signer": {
                "email": "test@example.com",
                "name": "Test User",
                "client_user_id": "12345"
            },
            "return_url": "http://localhost:3000/signed"
        }
        
        response = client.post("/api/docusign/envelope", json=test_data)
        assert response.status_code == 500
        assert "Invalid DocuSign user ID format" in response.json()["detail"]
