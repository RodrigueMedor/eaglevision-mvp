import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.graphql.schema import schema

print("\n=== GraphQL Schema ===\n")
print(schema)

print("\n=== Query Fields ===\n")
for field in schema.query_type.fields:
    print(f"- {field.name} (returns: {field.type})")
    if hasattr(field, 'arguments'):
        for arg in field.arguments:
            print(f"  - Argument: {arg.name} (type: {arg.type})")
    print()
