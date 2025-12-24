from setuptools import setup, find_packages

setup(
    name="eaglevision",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        # Add your project's dependencies here
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "psycopg2-binary",
        "python-jose[cryptography]",
        "passlib[bcrypt]",
        "python-multipart",
        "email-validator",
        "python-dotenv",
        "pydantic",
    ],
    python_requires=">=3.8",
)
