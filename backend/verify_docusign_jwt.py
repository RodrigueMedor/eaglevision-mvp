import os
import sys
import webbrowser
from datetime import datetime, timedelta
from dotenv import load_dotenv
from docusign_esign import ApiClient, EnvelopesApi
from docusign_esign.client.api_exception import ApiException

def get_consent_url(env, client_id, redirect_uri):
    """Generate the consent URL for OAuth authorization."""
    oauth_host = "account.docusign.com" if env == "prod" else "account-d.docusign.com"
    scopes = ["signature", "impersonation"]
    scope_param = "%20".join(scopes)
    
    return (
        f"https://{oauth_host}/oauth/auth?"
        f"response_type=code&"
        f"scope={scope_param}&"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}"
    )

def main():
    load_dotenv(override=True)

    # Load configuration
    client_id = os.getenv("DOCUSIGN_CLIENT_ID")
    user_id = os.getenv("DOCUSIGN_USER_ID")
    env = os.getenv("DOCUSIGN_ENVIRONMENT", "demo").lower()
    auth_server = os.getenv("DOCUSIGN_AUTH_SERVER")
    redirect_uri = os.getenv("DOCUSIGN_REDIRECT_URI", "http://localhost:3000/signing-complete")

    # Set OAuth host
    oauth_host = auth_server or ("account.docusign.com" if env == "prod" else "account-d.docusign.com")

    # Print configuration
    print("\n=== DOCUSIGN CONFIGURATION ===")
    print(f"Environment:      {env}")
    print(f"OAuth Host:       {oauth_host}")
    print(f"Client ID:        {client_id}")
    print(f"User ID (GUID):   {user_id}")
    print(f"Redirect URI:     {redirect_uri}")

    # Check if we should just show the consent URL
    if "--consent" in sys.argv:
        consent_url = get_consent_url(env, client_id, redirect_uri)
        print("\n=== CONSENT REQUIRED ===")
        print("To grant consent, please visit this URL in your browser:")
        print(f"\n{consent_url}\n")
        
        # Ask if user wants to open the URL in browser
        if input("Open this URL in your default browser? (y/n): ").lower() == 'y':
            webbrowser.open(consent_url)
        return

    # Load private key
    private_key_path = os.path.join(os.path.dirname(__file__), "keys", "docusign_private_key.pem")
    try:
        with open(private_key_path, "r") as f:
            private_key = f.read().strip()
            if "\n" not in private_key:
                private_key = private_key.replace("\\n", "\n")
        private_key_bytes = private_key.encode("utf-8")
        print(f"\nPrivate key loaded from: {private_key_path} (length: {len(private_key)})")
    except Exception as e:
        print(f"\nERROR: Failed to load private key from {private_key_path}")
        print(f"Error: {str(e)}")
        return

    # Initialize API client
    api_client = ApiClient()

    # 1) JWT token
    print("\n=== STEP 1: Request JWT Token ===")
    try:
        token_response = api_client.request_jwt_user_token(
            client_id=client_id,
            user_id=user_id,
            oauth_host_name=oauth_host,
            private_key_bytes=private_key_bytes,
            expires_in=3600,
            scopes=["signature", "impersonation"],
        )
        access_token = token_response.access_token
        print(f"✅ JWT token received successfully (length: {len(access_token)})")
    except Exception as e:
        print("\n❌ JWT Authentication Failed:")
        print(f"Error: {str(e)}")
        
        # If it's an authentication error, suggest getting consent
        if "consent_required" in str(e).lower() or "consent needed" in str(e).lower():
            consent_url = get_consent_url(env, client_id, redirect_uri)
            print("\n=== CONSENT REQUIRED ===")
            print("This integration requires explicit consent. Please visit this URL:")
            print(f"\n{consent_url}\n")
            if input("Open this URL in your default browser? (y/n): ").lower() == 'y':
                webbrowser.open(consent_url)
        return

    # 2) User info
    print("\n=== STEP 2: Get User Info ===")
    try:
        user_info = api_client.get_user_info(access_token)
        print("✅ User Info Retrieved Successfully")
        
        # Print account information
        print("\nAvailable Accounts:")
        print("-" * 80)
        for i, acct in enumerate(user_info.accounts, 1):
            print(f"{i}. Account ID: {acct.account_id}")
            print(f"   Base URI:  {acct.base_uri}")
            print(f"   Default:   {'Yes' if acct.is_default else 'No'}")
            print("-" * 80)
        
        # Get default or first account
        default_account = next((a for a in user_info.accounts if a.is_default), user_info.accounts[0])
        account_id = default_account.account_id
        base_uri = default_account.base_uri
        base_path = f"{base_uri}/restapi"
        
        print(f"\nUsing Account: {account_id}")
        print(f"Base Path:    {base_path}")
        
    except Exception as e:
        print("\n❌ Failed to get user info:")
        print(f"Error: {str(e)}")
        return

    # 3) Test eSignature API
    print("\n=== STEP 3: Test eSignature API ===")
    try:
        # Configure API client
        api_client.set_base_path(base_path)
        api_client.set_default_header("Authorization", f"Bearer {access_token}")
        envelopes_api = EnvelopesApi(api_client)

        # Prepare date range (last 30 days)
        from_date = (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        print(f"Fetching envelope status changes since {from_date}...")
        result = envelopes_api.list_status_changes(
            account_id=account_id,
            from_date=from_date,
            count=5  # Limit to 5 most recent
        )
        
        print("\n✅ eSignature API Test Successful!")
        print(f"Found {len(result.envelopes or [])} envelopes in the last 30 days")
        
        if result.envelopes:
            print("\nRecent Envelopes:")
            print("-" * 80)
            for env in result.envelopes[:3]:  # Show first 3
                print(f"ID: {env.envelope_id}")
                print(f"Status: {env.status}")
                print(f"Created: {getattr(env, 'created_date_time', 'N/A')}")
                print("-" * 80)
    
    except ApiException as e:
        print("\n❌ eSignature API Error:")
        print(f"Status Code: {e.status}")
        print(f"Error: {e.reason}")
        if hasattr(e, 'body') and e.body:
            print(f"Details: {e.body}")
    except Exception as e:
        print("\n❌ Unexpected error:")
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    print("\n" + "="*80)
    print("DOCUSIGN JWT VERIFICATION TOOL".center(80))
    print("="*80)
    
    # Check for --consent flag
    if "--consent" in sys.argv:
        main()  # Will show consent URL and exit
    else:
        try:
            main()
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
        except Exception as e:
            print(f"\n❌ An unexpected error occurred: {str(e)}")
    
    print("\nVerification complete.")
    print("="*80 + "\n")