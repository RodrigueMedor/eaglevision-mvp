# Import base first to avoid circular imports
from .base import Base  # noqa

# Import enums first to avoid circular imports
from .user import Role  # noqa
from .appointment import AppointmentStatus  # noqa
from .message_models import MessageStatus, MessageType, MessageRecipientType  # noqa

# Import models after enums
from .user import User  # noqa
from .appointment import Appointment  # noqa
from .message_models import Message, MessageRecipient  # noqa

# Make models available at package level
__all__ = [
    'Base',
    'User',
    'Role',
    'Appointment',
    'AppointmentStatus',
    'Message',
    'MessageRecipient',
    'MessageStatus',
    'MessageType',
    'MessageRecipientType'
]
