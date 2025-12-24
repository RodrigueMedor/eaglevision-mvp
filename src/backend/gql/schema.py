import enum
from enum import Enum
import strawberry
from typing import List, Optional, Type, TypeVar, Any, Dict, Union
from datetime import datetime, timedelta, timezone
from strawberry.types import Info
from sqlalchemy.orm import Session, declarative_base, joinedload
from backend.database import get_db
import backend.models as models
from backend.contact_models import Contact as ContactModel
from backend.models.message_models import Message as MessageModel, MessageRecipient as MessageRecipientModel, MessageStatus, MessageType, MessageRecipientType

# Helper functions
def parse_date_range(start_date: str, end_date: str):
    """Helper function to parse ISO 8601 dates with timezone support."""
    def parse_iso_date(date_str):
        if 'Z' in date_str:
            # Handle UTC timezone indicator
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return datetime.fromisoformat(date_str)
        
    start = parse_iso_date(start_date).replace(tzinfo=None)  # Remove timezone for database
    end = parse_iso_date(end_date).replace(tzinfo=None)  # Remove timezone for database
    return start, end

# Analytics Types
@strawberry.type
class AppointmentStatusCount:
    status: str
    count: int
    revenue: float = 0.0  # Add revenue field with default value 0.0
    
@strawberry.type
class AppointmentStats:
    totalAppointments: int
    byStatus: List[AppointmentStatusCount]
    
@strawberry.type
class MonthlyRevenue:
    month: str
    revenue: float
    count: int
    
@strawberry.type
class ServiceRevenue:
    service: str
    revenue: float
    count: int
    
@strawberry.type
class RevenueStats:
    totalRevenue: float
    monthlyRevenue: List[MonthlyRevenue]
    byService: List[ServiceRevenue]
    
@strawberry.type
class DailyActivity:
    date: str
    logins: int
    appointments: int
    
@strawberry.type
class UserActivityStats:
    activeUsers: int
    activity: List[DailyActivity]

# Define Strawberry enums
@strawberry.enum
class AppointmentStatus(enum.Enum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

@strawberry.enum
class Role(enum.Enum):
    CLIENT = 'client'
    STAFF = 'staff'
    ADMIN = 'admin'

# Define GraphQL types
@strawberry.type
class UserType:
    id: int
    email: str
    full_name: str = strawberry.field(name="fullName")
    phone: str
    role: Role
    created_at: datetime = strawberry.field(name="createdAt")
    updated_at: datetime = strawberry.field(name="updatedAt")

@strawberry.type
class AppointmentType:
    def __init__(self, **kwargs):
        from datetime import datetime
        # Map SQLAlchemy model attributes to GraphQL type fields
        self.id = kwargs.get('id')
        self.user_id = kwargs.get('user_id')
        self.service = kwargs.get('service')
        self.appointment_date = kwargs.get('appointment_date')
        # Ensure status is a string value, not an enum instance
        status = kwargs.get('status')
        self.status = status.value if hasattr(status, 'value') else str(status)
        self.notes = kwargs.get('notes')
        self.document_signed = kwargs.get('document_signed', False)
        self.envelope_id = kwargs.get('envelope_id')
        self.document_url = kwargs.get('document_url')
        self.first_name = kwargs.get('first_name')
        self.last_name = kwargs.get('last_name')
        self.email = kwargs.get('email')
        self.phone = kwargs.get('phone')
        # Ensure created_at is never None
        self.created_at = kwargs.get('created_at') or datetime.utcnow()
        # Ensure updated_at is never None
        self.updated_at = kwargs.get('updated_at') or datetime.utcnow()
    
    id: int
    user_id: int = strawberry.field(name="userId")
    service: str
    appointment_date: datetime = strawberry.field(name="appointmentDate")
    status: str  # Store as string to avoid enum issues
    notes: Optional[str]
    document_signed: bool = strawberry.field(name="documentSigned")
    envelope_id: Optional[str] = strawberry.field(name="envelopeId")
    document_url: Optional[str] = strawberry.field(name="documentUrl")
    first_name: Optional[str] = strawberry.field(name="firstName")
    last_name: Optional[str] = strawberry.field(name="lastName")
    email: Optional[str]
    phone: Optional[str]
    created_at: datetime = strawberry.field(name="createdAt")
    updated_at: datetime = strawberry.field(name="updatedAt")
    
    @strawberry.field
    async def user(self, info: Info) -> Optional[UserType]:
        db: Session = info.context["db"]
        # Explicitly select only the fields we need to avoid loading is_active
        user = db.query(
            models.User.id,
            models.User.email,
            models.User.full_name,
            models.User.phone,
            models.User.role,
            models.User.created_at,
            models.User.updated_at
        ).filter(models.User.id == self.user_id).first()
        
        if user:
            return UserType(
                id=user.id,
                email=user.email,
                full_name=user.full_name,
                phone=user.phone,
                role=user.role,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
        return None

# Message Types
@strawberry.enum
class MessageStatus(enum.Enum):
    DRAFT = 'draft'
    SENT = 'sent'
    DELIVERED = 'delivered'
    FAILED = 'failed'

# Custom scalar to handle case-insensitive MessageType
@strawberry.scalar(serialize=lambda v: v, parse_value=lambda v: v.upper())
class MessageTypeScalar(str):
    @staticmethod
    def __serialize__(value):
        return str(value).upper()

    @classmethod
    def __parse_value__(cls, value):
        if not isinstance(value, str):
            raise ValueError(f"MessageType must be a string, got {type(value).__name__}")
        upper_val = value.upper()
        if upper_val not in ['EMAIL', 'SMS', 'PUSH', 'IN_APP']:
            raise ValueError(f"'{value}' is not a valid MessageType. Must be one of: EMAIL, SMS, PUSH, IN_APP")
        return upper_val

# For backward compatibility, keep the enum but don't use it for input/output
class MessageType(enum.Enum):
    EMAIL = 'EMAIL'
    SMS = 'SMS'
    PUSH = 'PUSH'
    IN_APP = 'IN_APP'

@strawberry.enum
class MessageRecipientType(enum.Enum):
    ALL = 'all'
    CLIENT = 'client'
    STAFF = 'staff'
    SPECIFIC = 'specific'

# Alias for backward compatibility
RoleEnum = Role

@strawberry.type
class MessageType:
    def __init__(self, **kwargs):
        # Store extra fields that aren't part of the schema
        self._sender_email = kwargs.pop('sender_email', None)
        self._sender_phone = kwargs.pop('sender_phone', None)
        
        # Set all other attributes
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    id: int
    sender_id: int = strawberry.field(name="senderId")
    subject: str
    content: str
    message_type: str = strawberry.field(name="messageType")
    status: str
    recipient_type: str = strawberry.field(name="recipientType")
    recipient_id: Optional[int] = strawberry.field(name="recipientId")
    scheduled_at: Optional[datetime] = strawberry.field(name="scheduledAt")
    sent_at: Optional[datetime] = strawberry.field(name="sentAt")
    created_at: datetime = strawberry.field(name="createdAt")
    updated_at: datetime = strawberry.field(name="updatedAt")
    
    @strawberry.field
    async def sender(self, info: Info) -> Optional['UserType']:
        db = info.context["db"]
        user = db.query(models.User).filter(models.User.id == self.sender_id).first()
        if not user:
            return None
        return UserType(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            phone=user.phone,
            role=user.role,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    
    @strawberry.field
    async def contact(self, info: Info) -> Optional['ContactType']:
        db = info.context["db"]
        from ..contact_models import Contact as ContactModel
        
        if not hasattr(self, '_sender_email') and not hasattr(self, '_sender_phone'):
            return None
            
        query = db.query(ContactModel)
        if hasattr(self, '_sender_email') and self._sender_email:
            query = query.filter(ContactModel.email == self._sender_email)
        if hasattr(self, '_sender_phone') and self._sender_phone:
            query = query.filter(ContactModel.phone == self._sender_phone)
            
        contact = query.order_by(ContactModel.created_at.desc()).first()
        return ContactType.from_db(contact) if contact else None
    
    @strawberry.field
    async def appointment(self, info: Info) -> Optional['AppointmentType']:
        """Get related appointment information if this message is associated with an appointment."""
        db = info.context["db"]
        from ..models.appointment import Appointment as AppointmentModel
        
        if not hasattr(self, '_sender_email') and not hasattr(self, '_sender_phone'):
            return None
            
        query = db.query(AppointmentModel)
        if hasattr(self, '_sender_email') and self._sender_email:
            query = query.filter(AppointmentModel.email == self._sender_email)
        if hasattr(self, '_sender_phone') and self._sender_phone:
            query = query.filter(AppointmentModel.phone == self._sender_phone)
            
        appointment = query.order_by(AppointmentModel.created_at.desc()).first()
        if not appointment:
            return None
            
        return AppointmentType(
            id=appointment.id,
            user_id=getattr(appointment, 'user_id', None),
            service=appointment.service,
            appointment_date=appointment.appointment_date,
            status=appointment.status,
            notes=appointment.notes,
            document_signed=getattr(appointment, 'document_signed', False),
            envelope_id=getattr(appointment, 'envelope_id', None),
            document_url=getattr(appointment, 'document_url', None),
            first_name=getattr(appointment, 'first_name', None),
            last_name=getattr(appointment, 'last_name', None),
            email=getattr(appointment, 'email', None),
            phone=getattr(appointment, 'phone', None),
            created_at=appointment.created_at,
            updated_at=appointment.updated_at
        )
    
    @strawberry.field
    async def sender(self, info: Info) -> 'UserType':
        db = info.context["db"]
        return db.query(models.User).filter(models.User.id == self.sender_id).first()
    
    @strawberry.field
    async def recipients(self, info: Info) -> List['MessageRecipientType']:
        db = info.context["db"]
        recipients = db.query(MessageRecipientModel).filter(
            MessageRecipientModel.message_id == self.id
        ).all()
        return [MessageRecipientType.from_db(r) for r in recipients]

@strawberry.type
class MessagesResponse:
    messages: List[MessageType] = strawberry.field(default_factory=list)
    total_count: int = strawberry.field(name="totalCount", default=0)

@strawberry.type
class MessageRecipientType:
    id: int
    message_id: int = strawberry.field(name="messageId")
    recipient_id: int = strawberry.field(name="recipientId")
    status: str  # Store as string to avoid enum issues
    read_at: Optional[datetime] = strawberry.field(name="readAt")
    delivered_at: Optional[datetime] = strawberry.field(name="deliveredAt")
    
    @classmethod
    def from_db(cls, db_recipient):
        # Convert status to string value
        status_value = db_recipient.status
        if hasattr(status_value, 'value'):
            status_value = status_value.value
        elif hasattr(status_value, 'name'):
            status_value = status_value.name.lower()
            
        return cls(
            id=db_recipient.id,
            message_id=db_recipient.message_id,
            recipient_id=db_recipient.recipient_id,
            status=status_value,
            read_at=db_recipient.read_at,
            delivered_at=db_recipient.delivered_at
        )

# Input types for mutations
@strawberry.input
class ContactInput:
    name: str
    email: str
    subject: str
    message: str
    phone: Optional[str] = None

@strawberry.type
class ContactType:
    id: int
    name: str
    email: str
    phone: Optional[str]
    subject: str
    message: str
    created_at: datetime = strawberry.field(name="createdAt")
    updated_at: datetime = strawberry.field(name="updatedAt")
    status: str

    @classmethod
    def from_db(cls, db_contact):
        return cls(
            id=db_contact.id,
            name=db_contact.name,
            email=db_contact.email,
            phone=db_contact.phone,
            subject=db_contact.subject,
            message=db_contact.message,
            created_at=db_contact.created_at,
            updated_at=db_contact.updated_at if hasattr(db_contact, 'updated_at') else db_contact.created_at,
            status=db_contact.status
        )

@strawberry.input
class CreateAppointmentInput:
    firstName: str
    lastName: str
    email: str
    phone: str
    service: str
    appointmentDate: datetime = strawberry.field(name="appointmentDate")
    status: Optional[AppointmentStatus] = strawberry.field(
        default=AppointmentStatus.PENDING, 
        description="Status of the appointment (default: 'pending')"
    )
    notes: Optional[str] = None
    documentSigned: Optional[bool] = strawberry.field(default=False, name="documentSigned")
    envelopeId: Optional[str] = strawberry.field(default=None, name="envelopeId")
    documentUrl: Optional[str] = strawberry.field(default=None, name="documentUrl")

@strawberry.input
class UpdateAppointmentInput:
    id: int
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    service: Optional[str] = None
    appointmentDate: Optional[datetime] = strawberry.field(name="appointmentDate", default=None)
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None
    documentSigned: Optional[bool] = strawberry.field(default=None, name="documentSigned")
    envelopeId: Optional[str] = strawberry.field(default=None, name="envelopeId")
    documentUrl: Optional[str] = strawberry.field(default=None, name="documentUrl")

@strawberry.input
class DeleteAppointmentInput:
    id: int

@strawberry.input
class UserInput:
    email: str
    full_name: str
    phone: str
    role: Optional[RoleEnum] = Role.CLIENT.value

@strawberry.input
class MessageInput:
    # Required fields (no defaults) must come first
    recipient_type: str = strawberry.field(name="recipientType")
    subject: str
    content: str
    
    # Use the custom scalar for message_type
    message_type: MessageTypeScalar = strawberry.field(
        name="messageType",
        default="EMAIL"  # Default to uppercase
    )
    
    # Other fields with defaults
    recipient_id: Optional[int] = strawberry.field(name="recipientId", default=None)
    scheduled_at: Optional[datetime] = strawberry.field(name="scheduledAt", default=None)

# Query type
@strawberry.type
class Query:
    @strawberry.field
    async def appointment(self, info: Info, appointment_id: int) -> Optional[AppointmentType]:
        db: Session = info.context["db"]
        appointment = db.query(models.Appointment).get(appointment_id)
        if appointment:
            return AppointmentType(**appointment.__dict__)
        return None
        
    @strawberry.field
    async def userAppointments(self, info: Info, userId: int) -> List[AppointmentType]:
        db: Session = info.context["db"]
        print(f"[DEBUG] Fetching appointments for user ID: {userId}")
        
        # Get all appointments for the user
        appointments = db.query(models.Appointment).filter(
            models.Appointment.user_id == userId
        ).order_by(models.Appointment.appointment_date.desc()).all()
        
        print(f"[DEBUG] Found {len(appointments)} appointments for user {userId}")
        
        # Convert to GraphQL types using keyword arguments that match the model
        result = []
        for appointment in appointments:
            try:
                # Convert status to string if it's an enum
                status_value = appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status)
                
                # Create AppointmentType with fields that match the model
                appointment_data = {
                    'id': appointment.id,
                    'user_id': appointment.user_id,
                    'service': appointment.service,
                    'appointment_date': appointment.appointment_date,
                    'status': status_value,  # Use the converted status
                    'notes': appointment.notes,
                    'document_signed': bool(appointment.document_signed),
                    'envelope_id': appointment.envelope_id,
                    'document_url': appointment.document_url,
                    'first_name': appointment.first_name,
                    'last_name': appointment.last_name,
                    'email': appointment.email,
                    'phone': appointment.phone,
                    'created_at': appointment.created_at,
                    'updated_at': appointment.updated_at
                }
                
                # Filter out None values to avoid type errors
                filtered_data = {k: v for k, v in appointment_data.items() if v is not None}
                
                # Create the AppointmentType instance
                appointment_type = AppointmentType(**filtered_data)
                result.append(appointment_type)
                
            except Exception as e:
                print(f"[ERROR] Error creating AppointmentType for appointment {appointment.id}: {str(e)}")
                continue
        
        print(f"[DEBUG] Successfully created {len(result)} appointment types")
        return result
    
    @strawberry.field
    async def user(self, info: Info, user_id: int) -> Optional[UserType]:
        db: Session = info.context["db"]
        user = db.query(models.User).filter(models.User.id == user_id).first()
        return user
        
    @strawberry.field
    async def messages(
        self, 
        info: Info, 
        type: Optional[str] = 'all',  # 'inbox', 'sent', or 'all'
        message_type: Optional[str] = None,  # Filter by message type (case-insensitive)
        page: int = 1,
        limit: int = 10
    ) -> MessagesResponse:
        db = info.context["db"]
        current_user = info.context.get("current_user")
        
        # Debug logging
        print(f"[DEBUG] Fetching messages. Type: {type}, Message Type: {message_type}, User ID: {current_user.id if current_user else 'None'}")
        
        # Require authentication
        if not current_user:
            print("[WARNING] No authenticated user. Returning empty message list.")
            return MessagesResponse(messages=[], total_count=0)
            
        # Convert message_type to uppercase for consistent comparison
        if message_type is not None:
            message_type = message_type.upper()
            
            # Map common variations to standard values
            message_type_mapping = {
                'EMAIL': 'EMAIL',
                'SMS': 'SMS',
                'PUSH': 'PUSH',
                'PUSH_NOTIFICATION': 'PUSH',
                'IN_APP': 'IN_APP',
                'INAPP': 'IN_APP',
                'IN_APP_MESSAGE': 'IN_APP'
            }
            
            # Use the mapped value if it exists, otherwise use the uppercase value
            message_type = message_type_mapping.get(message_type, message_type)
            
            # Validate against allowed message types
            valid_message_types = ['EMAIL', 'SMS', 'PUSH', 'IN_APP']
            if message_type not in valid_message_types:
                raise ValueError(f"Invalid message type: {message_type}. Must be one of: {', '.join(valid_message_types)}")
        
        # Require authentication for all message queries
        if not current_user:
            print("[WARNING] No authenticated user. Returning empty message list.")
            return MessagesResponse(messages=[], total_count=0)
        
        # Start with base query
        query = db.query(MessageModel)
        
        # Apply message type filter if provided
        if message_type:
            query = query.filter(MessageModel.message_type == message_type.upper())
        
        # Apply filters based on message type (inbox, sent, all)
        if type == 'inbox':
            # Get messages where current user is a recipient
            print(f"[DEBUG] Fetching inbox messages for user {current_user.id}")
            query = query.join(
                models.MessageRecipient,
                models.MessageRecipient.message_id == MessageModel.id
            ).filter(
                models.MessageRecipient.recipient_id == current_user.id
            )
        elif type == 'sent':
            # Get messages sent by current user
            print(f"[DEBUG] Fetching sent messages for user {current_user.id}")
            query = query.filter(MessageModel.sender_id == current_user.id)
        else:  # 'all' or any other value
            # Get all messages where user is either sender or recipient
            print(f"[DEBUG] Fetching all messages for user {current_user.id}")
            subquery = db.query(models.MessageRecipient.message_id).filter(
                models.MessageRecipient.recipient_id == current_user.id
            ).subquery()
            
            query = query.filter(
                (MessageModel.sender_id == current_user.id) |
                (MessageModel.id.in_(subquery))
            )
        
        # Order by creation date, newest first
        query = query.order_by(MessageModel.created_at.desc())
        
        # Get total count before pagination
        total_count = query.count()
        print(f"[DEBUG] Found {total_count} messages")
        
        # Apply pagination
        if page < 1:
            page = 1
        offset = (page - 1) * limit
        messages = query.offset(offset).limit(limit).all()
        
        print(f"[DEBUG] Retrieved {len(messages)} messages after pagination")
        
        # Convert to GraphQL types
        message_types = []
        for msg in messages:
            try:
                # Get sender information
                sender = db.query(models.User).filter(models.User.id == msg.sender_id).first()
                
                # Ensure message_type is a string and in the correct case
                msg_type = msg.message_type
                if hasattr(msg_type, 'value'):
                    msg_type = msg_type.value
                msg_type = str(msg_type).upper()
                
                # Create message dict with all required fields
                message_dict = {
                    'id': msg.id,
                    'sender_id': msg.sender_id,
                    'sender_email': sender.email if sender else None,
                    'sender_phone': sender.phone if sender else None,
                    'subject': msg.subject,
                    'content': msg.content,
                    'message_type': msg_type,
                    'status': msg.status.value if hasattr(msg.status, 'value') else str(msg.status),
                    'recipient_type': msg.recipient_type.value if hasattr(msg.recipient_type, 'value') else str(msg.recipient_type),
                    'recipient_id': msg.recipient_id,
                    'scheduled_at': msg.scheduled_at,
                    'sent_at': msg.sent_at,
                    'created_at': msg.created_at,
                    'updated_at': msg.updated_at
                }
                
                message_types.append(MessageType(**message_dict))
                
            except Exception as e:
                import traceback
                print(f"[ERROR] Error creating MessageType for message {msg.id if hasattr(msg, 'id') else 'unknown'}: {str(e)}")
                print(traceback.format_exc())
                continue
        
        return MessagesResponse(
            messages=message_types,
            total_count=total_count
        )
        
    @strawberry.field
    async def contacts(self, info: Info) -> List[ContactType]:
        """
        Get all contact form submissions.
        Note: In a production environment, consider adding access control.
        """
        db: Session = info.context["db"]
        contacts = db.query(ContactModel).order_by(ContactModel.created_at.desc()).all()
        return [ContactType.from_db(contact) for contact in contacts]
        
    @strawberry.field
    async def appointments(self, info: Info) -> List[AppointmentType]:
        """
        Get all appointments in the system.
        Note: In a production environment, consider adding pagination and access control.
        """
        db: Session = info.context["db"]
        print("[DEBUG] Fetching all appointments")
        
        # Get all appointments ordered by date (newest first)
        appointments = db.query(models.Appointment).order_by(
            models.Appointment.appointment_date.desc()
        ).all()
        
        print(f"[DEBUG] Found {len(appointments)} total appointments")
        
        # Convert to GraphQL types using the same pattern as userAppointments
        result = []
        for appointment in appointments:
            try:
                # Create AppointmentType with fields that match the model
                appointment_data = {
                    'id': appointment.id,
                    'user_id': appointment.user_id,
                    'service': appointment.service,
                    'appointment_date': appointment.appointment_date,
                    'status': appointment.status,
                    'notes': appointment.notes,
                    'document_signed': bool(appointment.document_signed),
                    'envelope_id': appointment.envelope_id,
                    'document_url': appointment.document_url,
                    'first_name': appointment.first_name,
                    'last_name': appointment.last_name,
                    'email': appointment.email,
                    'phone': appointment.phone,
                    'created_at': appointment.created_at,
                    'updated_at': appointment.updated_at
                }
                
                # Filter out None values to avoid type errors
                filtered_data = {k: v for k, v in appointment_data.items() if v is not None}
                
                # Create the AppointmentType instance
                appointment_type = AppointmentType(**filtered_data)
                result.append(appointment_type)
                
            except Exception as e:
                print(f"[ERROR] Error creating AppointmentType for appointment {appointment.id}: {str(e)}")
                continue
        
        print(f"[DEBUG] Successfully created {len(result)} appointment types")
        return result
    
    @strawberry.field
    async def allAppointments(self, info: Info) -> List[AppointmentType]:
        """Get all appointments in the system. Requires admin access."""
        db: Session = info.context["db"]
        print("[DEBUG] Fetching all appointments...")
        
        try:
            # First, check if the table exists
            from sqlalchemy import inspect
            inspector = inspect(db.get_bind())
            if 'appointments' not in inspector.get_table_names():
                print("[ERROR] 'appointments' table does not exist in the database")
                return []
                
            # Count total appointments
            total_appointments = db.query(models.Appointment).count()
            print(f"[DEBUG] Found {total_appointments} appointments in the database")
            
            # Fetch all appointments with explicit column selection
            from sqlalchemy import or_
            appointments = db.query(
                models.Appointment
            ).order_by(
                models.Appointment.appointment_date.desc()
            ).all()
            
            print(f"[DEBUG] Retrieved {len(appointments)} appointments")
            
            # Convert to dictionary with explicit field mapping
            result = []
            for appointment in appointments:
                appt_dict = {
                    'id': appointment.id,
                    'user_id': appointment.user_id,
                    'service': appointment.service,
                    'appointment_date': appointment.appointment_date,
                    'status': appointment.status,
                    'notes': appointment.notes,
                    'document_signed': appointment.document_signed or False,
                    'envelope_id': appointment.envelope_id,
                    'document_url': appointment.document_url,
                    'first_name': appointment.first_name,
                    'last_name': appointment.last_name,
                    'email': appointment.email,
                    'phone': appointment.phone,
                    'created_at': appointment.created_at,
                    'updated_at': appointment.updated_at or appointment.created_at
                }
                result.append(AppointmentType(**appt_dict))
                
                # Log first few appointments for debugging
                if len(result) <= 3:
                    print(f"[DEBUG] Processed appointment: ID={appointment.id}, "
                          f"Date={appointment.appointment_date}, "
                          f"Status={appointment.status}, "
                          f"CreatedAt={appointment.created_at}")
            
            return result
            
        except Exception as e:
            print(f"[ERROR] Error in allAppointments: {str(e)}")
            import traceback
            traceback.print_exc()
            return []
        
    @strawberry.field
    async def allContacts(self, info: Info) -> List[ContactType]:
        """Get all contact form submissions. Requires admin access."""
        db: Session = info.context["db"]
        # In production, add authentication check here
        contacts = db.query(ContactModel).order_by(ContactModel.created_at.desc()).all()
        return [ContactType.from_db(contact) for contact in contacts]
        
    @strawberry.field
    async def all_contacts(self, info: Info) -> List[ContactType]:
        """Get all contact form submissions. Requires admin access."""
        db: Session = info.context["db"]
        contacts = db.query(ContactModel).all()
        return [ContactType.from_db(contact) for contact in contacts]
        
        
    @strawberry.field
    def get_appointment_stats(self, info: Info, start_date: str, end_date: str) -> AppointmentStats:
        """Get appointment statistics for the given date range."""
        from sqlalchemy import func, extract, and_
        
        db: Session = info.context["db"]
        start, end = parse_date_range(start_date, end_date)
        
        # Total appointments in date range
        total_appointments = db.query(models.Appointment).filter(
            models.Appointment.appointment_date.between(start, end)
        ).count()
        
        # Define default prices for services (adjust as needed)
        service_prices = {
            'eye_exam': 100.0,
            'contact_lens_fitting': 75.0,
            'glasses_prescription': 50.0,
            'other': 0.0
        }
        
        # Get all appointments in date range
        appointments = db.query(
            models.Appointment.status,
            models.Appointment.service
        ).filter(
            models.Appointment.appointment_date.between(start, end)
        ).all()
        
        # Calculate counts and revenue by status
        status_data = {}
        for status, service in appointments:
            # Get price for service, default to 0.0 if not found
            price = service_prices.get(service.lower().replace(' ', '_'), service_prices['other'])
            
            if status not in status_data:
                status_data[status] = {'count': 0, 'revenue': 0.0}
                
            status_data[status]['count'] += 1
            status_data[status]['revenue'] += price
        
        # Convert to list of AppointmentStatusCount objects
        by_status = [
            (status, data['count'], data['revenue'])
            for status, data in status_data.items()
        ]
        
        return AppointmentStats(
            totalAppointments=total_appointments,
            byStatus=[
                AppointmentStatusCount(
                    status=status, 
                    count=count,
                    revenue=float(revenue)  # Convert Decimal to float for Strawberry
                ) 
                for status, count, revenue in by_status
            ]
        )
        
    @strawberry.field
    def get_revenue_stats(self, info: Info, start_date: str, end_date: str) -> RevenueStats:
        """Get revenue statistics for the given date range."""
        from sqlalchemy import func, extract, and_
        
        db: Session = info.context["db"]
        start, end = parse_date_range(start_date, end_date)
        
        # Define default prices for services (same as in get_appointment_stats)
        service_prices = {
            'eye_exam': 100.0,
            'contact_lens_fitting': 75.0,
            'glasses_prescription': 50.0,
            'other': 0.0
        }
        
        # Get all appointments in date range with service and date
        appointments = db.query(
            models.Appointment.service,
            models.Appointment.appointment_date
        ).filter(
            models.Appointment.appointment_date.between(start, end)
        ).all()
        
        # Initialize data structures
        monthly_revenue_data = {}
        service_revenue = {}
        total_revenue = 0.0
        
        # Process each appointment
        for service, appt_date in appointments:
            # Get price for service, default to 0.0 if not found
            price = service_prices.get(service.lower().replace(' ', '_'), service_prices['other'])
            
            # Update total revenue
            total_revenue += price
            
            # Update monthly revenue
            month_key = f"{appt_date.year}-{appt_date.month:02d}"
            if month_key not in monthly_revenue_data:
                monthly_revenue_data[month_key] = {'revenue': 0.0, 'count': 0}
            monthly_revenue_data[month_key]['revenue'] += price
            monthly_revenue_data[month_key]['count'] += 1
            
            # Update service revenue
            if service not in service_revenue:
                service_revenue[service] = {'revenue': 0.0, 'count': 0}
            service_revenue[service]['revenue'] += price
            service_revenue[service]['count'] += 1
        
        # Format monthly revenue data as a list of dictionaries
        monthly_revenue_list = [
            {
                'month': month,
                'revenue': data['revenue'],
                'count': data['count']
            }
            for month, data in monthly_revenue_data.items()
        ]
        
        # Format service revenue data as a list of dictionaries
        by_service_list = [
            {
                'service': service,
                'revenue': data['revenue'],
                'count': data['count']
            }
            for service, data in service_revenue.items()
        ]
        
        return RevenueStats(
            totalRevenue=total_revenue,
            monthlyRevenue=[
                MonthlyRevenue(
                    month=item['month'],
                    revenue=float(item['revenue']),
                    count=item['count']
                ) for item in monthly_revenue_list
            ],
            byService=[
                ServiceRevenue(
                    service=item['service'],
                    revenue=float(item['revenue']),
                    count=item['count']
                ) for item in by_service_list
            ]
        )
        
    @strawberry.field
    def get_user_activity_stats(self, info: Info, start_date: str, end_date: str) -> UserActivityStats:
        """Get user activity statistics for the given date range."""
        from datetime import timedelta
        from sqlalchemy import func, extract, and_
        
        db: Session = info.context["db"]
        start, end = parse_date_range(start_date, end_date)
        
        # Active users (users with at least one login in the period)
        # Note: You'll need to implement user login tracking for this
        active_users = 0
        
        # User activity over time
        activity = []
        current_date = start
        while current_date <= end:
            next_date = current_date + timedelta(days=1)
            # Count logins and appointments for each day
            # You'll need to implement login tracking for accurate login counts
            login_count = 0
            appointment_count = db.query(func.count(models.Appointment.id)).filter(
                and_(
                    models.Appointment.appointment_date >= current_date,
                    models.Appointment.appointment_date < next_date
                )
            ).scalar()
            
            activity.append(DailyActivity(
                date=current_date.strftime('%Y-%m-%d'),
                logins=login_count,
                appointments=appointment_count
            ))
            
            current_date = next_date
        
        return UserActivityStats(
            activeUsers=active_users,
            activity=activity
        )

# Mutation type
@strawberry.type
class Mutation:
    @strawberry.mutation(name="createContact")
    def create_contact(self, info: Info, input: ContactInput) -> ContactType:
        db = next(get_db())
        try:
            contact = ContactModel(
                name=input.name,
                email=input.email,
                phone=input.phone,
                subject=input.subject,
                message=input.message,
                status='unread',
                created_at=datetime.utcnow()
            )
            db.add(contact)
            db.commit()
            db.refresh(contact)
            return ContactType.from_db(contact)
        except Exception as e:
            db.rollback()
            print(f"[ERROR] Error creating contact: {str(e)}")
            raise Exception(f"Failed to create contact: {str(e)}")
        finally:
            db.close()
            
    @strawberry.mutation(name="updateContactStatus")
    def update_contact_status(self, info: Info, contact_id: int, status: str) -> ContactType:
        """
        Update a contact's status.
        Valid status values: 'unread', 'read', 'responded' (case-insensitive)
        """
        db = info.context["db"]
        try:
            # Get the contact
            contact = db.query(ContactModel).get(contact_id)
            if not contact:
                raise ValueError(f"Contact with ID {contact_id} not found")
                
            # Convert status to lowercase for validation and storage
            status_lower = status.lower()
            
            # Validate status (case-insensitive)
            valid_statuses = ['unread', 'read', 'responded']
            if status_lower not in valid_statuses:
                raise ValueError(f"Invalid status: '{status}'. Must be one of: {', '.join(valid_statuses)}")
                
            # Update status (always store in lowercase)
            contact.status = status_lower
            db.commit()
            db.refresh(contact)
            return ContactType.from_db(contact)
            
        except Exception as e:
            db.rollback()
            print(f"[ERROR] Error updating contact status: {str(e)}")
            raise Exception(f"Failed to update contact status: {str(e)}")
        finally:
            db.close()
            
    @strawberry.mutation
    async def create_appointment(self, info: Info, input: CreateAppointmentInput) -> AppointmentType:
        """
        Create a new appointment.
        If the user doesn't exist, a new user will be created.
        The status will be set to PENDING if not provided.
        """
        db: Session = info.context["db"]
        
        # Debug log the input data
        print(f"[DEBUG] Creating appointment with data: {input}")
        
        from sqlalchemy import text
        
        # First, try to get just the user ID
        user_id = db.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": input.email}
        ).scalar()
        
        if not user_id:
            # Create new user if doesn't exist
            # Use a raw SQL insert to avoid the is_active column
            db.execute(
                text("""
                    INSERT INTO users (email, full_name, phone, role, created_at, updated_at)
                    VALUES (:email, :full_name, :phone, :role, NOW(), NOW())
                    RETURNING id
                """),
                {
                    "email": input.email,
                    "full_name": f"{input.firstName} {input.lastName}",
                    "phone": input.phone,
                    "role": models.Role.CLIENT.value.upper()  # Convert to uppercase for database
                }
            )
            db.commit()
            
            # Get the new user's ID
            result = db.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": input.email}
            )
            user_id = result.scalar()
        
        # Get the user with only the fields we need
        user = db.execute(
            text("""
                SELECT id, email, full_name, phone, role 
                FROM users 
                WHERE id = :user_id
            """),
            {"user_id": user_id}
        ).first()
        
        # Check for existing appointment with the same email and service
        existing_appointment = db.query(models.Appointment).filter(
            models.Appointment.email == input.email,
            models.Appointment.service == input.service,
            models.Appointment.status != models.AppointmentStatus.CANCELLED
        ).first()
        
        if existing_appointment:
            raise ValueError("You already have an appointment for this service. Please contact support if you need to reschedule.")
        
        # Calculate time window (1 hour before and after)
        time_window_start = input.appointmentDate - timedelta(hours=1)
        time_window_end = input.appointmentDate + timedelta(hours=1)
        
        # Check for overlapping appointments
        overlapping_appointment = db.query(models.Appointment).filter(
            models.Appointment.appointment_date.between(time_window_start, time_window_end),
            models.Appointment.status != models.AppointmentStatus.CANCELLED
        ).first()
        
        if overlapping_appointment:
            raise ValueError("This time slot is already booked. Please choose a different time.")
        
        # Create new appointment with all fields
        from sqlalchemy import func
        
        # Handle the status - ensure it's in the correct case for the database
        if input.status is None:
            status_value = 'PENDING'  # Default to uppercase
        elif isinstance(input.status, str):
            # Convert to uppercase to match the database enum
            status_upper = input.status.upper()
            if status_upper in ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']:
                status_value = status_upper
            else:
                status_value = 'PENDING'  # Default to PENDING if invalid
        elif hasattr(input.status, 'value'):
            # If it's an enum, get its string value and convert to uppercase
            status_value = input.status.value.upper()
        else:
            status_value = 'PENDING'  # Default fallback
        
        # Create the appointment using the model
        db_appointment = models.Appointment(
            user_id=user_id,
            service=input.service,
            appointment_date=input.appointmentDate,
            status=status_value,
            notes=input.notes,
            document_signed=input.documentSigned,
            envelope_id=input.envelopeId,
            document_url=input.documentUrl,
            first_name=input.firstName,
            last_name=input.lastName,
            email=input.email,
            phone=input.phone,
            created_at=func.now(),
            updated_at=func.now()
        )
        
        try:
            db.add(db_appointment)
            db.commit()
            db.refresh(db_appointment)
            
            # Debug log the created appointment
            print(f"[DEBUG] Created appointment object: {db_appointment}")
            print(f"[DEBUG] Created at: {db_appointment.created_at}, Updated at: {db_appointment.updated_at}")
            
            # Convert SQLAlchemy model to a dictionary and create AppointmentType
            appointment_dict = {
                'id': db_appointment.id,
                'user_id': db_appointment.user_id,
                'service': db_appointment.service,
                'appointment_date': db_appointment.appointment_date,
                'status': db_appointment.status.value if hasattr(db_appointment.status, 'value') else str(db_appointment.status),
                'notes': db_appointment.notes,
                'document_signed': db_appointment.document_signed,
                'envelope_id': db_appointment.envelope_id,
                'document_url': db_appointment.document_url,
                'first_name': db_appointment.first_name,
                'last_name': db_appointment.last_name,
                'email': db_appointment.email,
                'phone': db_appointment.phone,
                'created_at': db_appointment.created_at,
                'updated_at': db_appointment.updated_at
            }
            return AppointmentType(**appointment_dict)
        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to create contact: {str(e)}")
        finally:
            db.close()

    @strawberry.mutation
    async def create_user(self, info: Info, input: UserInput) -> UserType:
        db: Session = info.context["db"]
        
        # Check if user with email already exists
        existing_user = db.query(models.User).filter(models.User.email == input.email).first()
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Create new user
        db_user = models.User(
            email=input.email,
            full_name=input.full_name,
            phone=input.phone,
            role=input.role
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
        
    @strawberry.mutation
    async def update_appointment(self, info: Info, input: UpdateAppointmentInput) -> AppointmentType:
        db: Session = info.context["db"]
        
        # Get the existing appointment
        appointment = db.query(models.Appointment).get(input.id)
        if not appointment:
            raise ValueError(f"Appointment with ID {input.id} not found")
        
        # Update fields if they are provided in the input
        if input.firstName is not None:
            appointment.first_name = input.firstName
        if input.lastName is not None:
            appointment.last_name = input.lastName
        if input.email is not None:
            appointment.email = input.email
        if input.phone is not None:
            appointment.phone = input.phone
        if input.service is not None:
            appointment.service = input.service
        if input.appointmentDate is not None:
            appointment.appointment_date = input.appointmentDate
        if input.status is not None:
            # Convert the status to the correct enum value
            try:
                if isinstance(input.status, str):
                    # If status is a string, convert it to the enum
                    status_value = input.status.upper()
                    appointment.status = models.AppointmentStatus[status_value]
                else:
                    # If it's already an enum, use its value
                    appointment.status = models.AppointmentStatus[input.status.name]
            except (KeyError, AttributeError) as e:
                raise ValueError(f"Invalid status value: {input.status}") from e
        if input.notes is not None:
            appointment.notes = input.notes
        if input.documentSigned is not None:
            appointment.document_signed = input.documentSigned
        if input.envelopeId is not None:
            appointment.envelope_id = input.envelopeId
        if input.documentUrl is not None:
            appointment.document_url = input.documentUrl
            
        appointment.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(appointment)
        
        # Convert to dictionary for AppointmentType
        appointment_dict = {
            'id': appointment.id,
            'user_id': appointment.user_id,
            'service': appointment.service,
            'appointment_date': appointment.appointment_date,
            'status': appointment.status.value if hasattr(appointment.status, 'value') else str(appointment.status),
            'notes': appointment.notes,
            'document_signed': appointment.document_signed,
            'envelope_id': appointment.envelope_id,
            'document_url': appointment.document_url,
            'first_name': appointment.first_name,
            'last_name': appointment.last_name,
            'email': appointment.email,
            'phone': appointment.phone,
            'created_at': appointment.created_at,
            'updated_at': appointment.updated_at
        }
        
        return AppointmentType(**appointment_dict)
    
    @strawberry.mutation
    async def delete_appointment(self, info: Info, input: DeleteAppointmentInput) -> bool:
        db: Session = info.context["db"]
        
        try:
            # Import text from sqlalchemy
            from sqlalchemy import text
            
            # Try to get and delete the appointment using text()
            result = db.execute(
                text("""
                    DELETE FROM appointments 
                    WHERE id = :id
                    RETURNING id
                """),
                {'id': input.id}
            )
            
            deleted = result.fetchone()
            if not deleted:
                # If no rows were deleted, the appointment didn't exist
                print(f"Warning: Tried to delete non-existent appointment with ID {input.id}")
                return False
                
            db.commit()
            return True
            
        except Exception as e:
            db.rollback()
            print(f"Error deleting appointment {input.id}: {str(e)}")
            return False
        
    @strawberry.mutation
    async def update_appointment_status(
        self, 
        info: Info, 
        appointment_id: int, 
        status: str
    ) -> AppointmentType:
        db = info.context["db"]
        current_user = info.context["current_user"]
        
        # Validate status
        try:
            status_enum = AppointmentStatus(status.lower())
        except ValueError:
            raise ValueError(
                f"Invalid status: {status}. "
                f"Must be one of: {', '.join([e.value for e in AppointmentStatus])}"
            )
        
        # Get the appointment
        appointment = db.query(models.Appointment).get(appointment_id)
        if not appointment:
            raise ValueError(f"Appointment with ID {appointment_id} not found")
        
        # Check permissions (only admin or the appointment owner can update)
        if current_user.role != models.Role.ADMIN and appointment.user_id != current_user.id:
            raise PermissionError("You don't have permission to update this appointment")
        
        # Update status
        appointment.status = status_enum
        appointment.updated_at = datetime.utcnow()
        
        try:
            db.commit()
            db.refresh(appointment)
            return appointment
        except Exception as e:
            db.rollback()
            print(f"Error updating appointment status: {str(e)}")
            raise Exception("Failed to update appointment status")
    
    @strawberry.mutation
    async def send_message(
        self,
        info: Info,
        input: MessageInput
    ) -> MessageType:
        db = info.context["db"]
        current_user = info.context["current_user"]
        
        # The message_type is already validated and converted to uppercase by MessageTypeScalar
        # Convert to the enum value for storage
        message_type_enum = MessageType[input.message_type]
        
        # Create the message
        message = MessageModel(
            sender_id=current_user.id,
            subject=input.subject,
            content=input.content,
            message_type=message_type_enum,
            status=MessageStatus.DRAFT,
            recipient_type=MessageRecipientType[input.recipient_type.upper()],
            recipient_id=input.recipient_id,
            scheduled_at=input.scheduled_at,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Get recipients based on recipient type
        recipients = []
        if message.recipient_type == MessageRecipientType.ALL:
            recipients = db.query(models.User).filter(
                models.User.is_active == True
            ).all()
        elif message.recipient_type == MessageRecipientType.CLIENT:
            recipients = db.query(models.User).filter(
                models.User.role == models.Role.CLIENT,
                models.User.is_active == True
            ).all()
        elif message.recipient_type == MessageRecipientType.STAFF:
            recipients = db.query(models.User).filter(
                models.User.role.in_([models.Role.STAFF, models.Role.ADMIN]),
                models.User.is_active == True
            ).all()
        elif message.recipient_type == MessageRecipientType.SPECIFIC and input.recipient_id:
            recipient = db.query(models.User).filter(
                models.User.id == input.recipient_id,
                models.User.is_active == True
            ).first()
            if recipient:
                recipients = [recipient]
        
        # Create message recipients
        for recipient in recipients:
            recipient = MessageRecipientModel(
                message_id=message.id,
                recipient_id=recipient.id,
                status=MessageStatus.DRAFT,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(recipient)
        
        # Update message status to sent if not scheduled
        if not message.scheduled_at:
            message.status = MessageStatus.SENT
            message.sent_at = datetime.utcnow()
            
            # Update all recipients' status to sent
            db.query(MessageRecipientModel).filter(
                MessageRecipientModel.message_id == message.id
            ).update({"status": MessageStatus.SENT})
        
        db.commit()
        db.refresh(message)
        
        # TODO: Add actual message sending logic (email, SMS, etc.)
        
        return message
        db: Session = info.context["db"]
        
        try:
            # Start a new transaction
            db.begin()
            
            # Get the appointment with a FOR UPDATE lock
            appointment = db.query(models.Appointment).filter(
                models.Appointment.id == appointment_id
            ).with_for_update().first()
            
            if not appointment:
                raise ValueError(f"Appointment with ID {appointment_id} not found")
            
            # Clean up the status string
            status_value = status.upper().replace('APPOINTMENTSTATUS.', '').strip()
            
            # Map the status string to the database value
            status_mapping = {
                'PENDING': 'pending',
                'CONFIRMED': 'confirmed',
                'COMPLETED': 'completed',
                'CANCELLED': 'cancelled'
            }
            
            if status_value not in status_mapping:
                valid_statuses = list(status_mapping.keys())
                raise ValueError(f"Invalid status: {status_value}. Must be one of: {', '.join(valid_statuses)}")
            
            # Use a raw SQL update with explicit type casting
            from sqlalchemy import text
            
            stmt = text("""
                UPDATE appointments 
                SET status = :status::appointmentstatus,
                    updated_at = :updated_at
                WHERE id = :id
                RETURNING *
            """)
            
            result = db.execute(
                stmt,
                {
                    'status': status_mapping[status_value],
                    'updated_at': datetime.utcnow(),
                    'id': appointment_id
                }
            ).fetchone()
            
            if not result:
                raise ValueError(f"Failed to update appointment {appointment_id}")
                
            db.commit()
            
            # Get the updated appointment with all relationships loaded
            updated_appointment = db.query(models.Appointment).get(appointment_id)
            
            if not updated_appointment:
                raise ValueError(f"Failed to fetch updated appointment {appointment_id}")
                
            return updated_appointment
            
        except Exception as e:
            db.rollback()
            valid_statuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
            raise ValueError(f"Error updating status: {str(e)}. Valid statuses are: {', '.join(valid_statuses)}")
        finally:
            # Ensure the connection is returned to the pool
            db.close()
        
        # Convert to dictionary for AppointmentType
        appointment_dict = {
            'id': appointment.id,
            'user_id': appointment.user_id,
            'service': appointment.service,
            'appointment_date': appointment.appointment_date,
            'status': appointment.status.value,  # Use the enum value directly
            'notes': appointment.notes,
            'document_signed': appointment.document_signed,
            'envelope_id': appointment.envelope_id,
            'document_url': appointment.document_url,
            'first_name': appointment.first_name,
            'last_name': appointment.last_name,
            'email': appointment.email,
            'phone': appointment.phone,
            'created_at': appointment.created_at,
            'updated_at': appointment.updated_at
        }
        
        return AppointmentType(**appointment_dict)

# Export the query and mutation types
__all__ = ['Query', 'Mutation']

# Create schema - this will be recreated in main.py
schema = strawberry.Schema(query=Query, mutation=Mutation)
