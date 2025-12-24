from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from backend.database import get_db, engine
from backend.contact_models import Contact, Base
from pydantic import BaseModel, EmailStr, validator

# Create database tables if they don't exist
Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/api/contacts",
    tags=["contacts"],
    responses={404: {"description": "Not found"}},
)

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str = None
    subject: str
    message: str

class ContactResponse(ContactCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True  # Replaces orm_mode in Pydantic v2

@router.post("/api/contact", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
async def create_contact(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...),
    phone: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Create a new contact form submission (handles both JSON and form-data)
    """
    try:
        # Log the incoming request
        print(f"[CONTACT] New submission - Name: {name}, Email: {email}, Subject: {subject}")
        
        # Create new contact
        db_contact = Contact(
            name=name,
            email=email,
            phone=phone,
            subject=subject,
            message=message,
            status='new',
            created_at=datetime.utcnow()
        )
        
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        
        print(f"[CONTACT] Successfully created contact with ID: {db_contact.id}")
        return db_contact
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to create contact: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating contact: {str(e)}"
        )

# Add a simple HTML form for testing
@router.get("/contact-form")
async def show_contact_form():
    """Simple HTML form for testing the contact endpoint"""
    return """
    <html>
    <body>
        <h2>Contact Form</h2>
        <form action="/api/contact" method="post" enctype="application/x-www-form-urlencoded">
            <div>
                <label>Name:</label><br>
                <input type="text" name="name" required>
            </div>
            <div>
                <label>Email:</label><br>
                <input type="email" name="email" required>
            </div>
            <div>
                <label>Phone (optional):</label><br>
                <input type="tel" name="phone">
            </div>
            <div>
                <label>Subject:</label><br>
                <input type="text" name="subject" required>
            </div>
            <div>
                <label>Message:</label><br>
                <textarea name="message" required></textarea>
            </div>
            <div>
                <button type="submit">Send Message</button>
            </div>
        </form>
    </body>
    </html>
    """

@router.get("/", response_model=List[ContactResponse])
def list_contacts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    List all contact form submissions (for admin use)
    """
    return db.query(Contact).offset(skip).limit(limit).all()

@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: int, db: Session = Depends(get_db)):
    """
    Get a specific contact form submission by ID
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact
