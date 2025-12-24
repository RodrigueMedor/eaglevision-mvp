import bcrypt

# The password to hash
password = b"testpass"  # Note: must be bytes

# Generate a salt and hash the password
hashed = bcrypt.hashpw(password, bcrypt.gensalt())

print(f"Hashed password: {hashed.decode('utf-8')}")
