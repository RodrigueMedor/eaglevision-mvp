from passlib.context import CryptContext

# Create a password context
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# Hash a password
password = "testpass"  # Change this to your desired password
hashed_password = pwd_context.hash(password)
print(f"Hashed password for '{password}': {hashed_password}")

# Verify the hash
print(f"Verification: {pwd_context.verify(password, hashed_password)}")
