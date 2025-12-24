# This file makes the graphql directory a Python package
from .schema import Query, Mutation, AppointmentType, UserType, ContactType

__all__ = ['Query', 'Mutation', 'AppointmentType', 'UserType', 'ContactType']
