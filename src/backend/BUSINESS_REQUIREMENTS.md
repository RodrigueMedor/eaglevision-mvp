# Eagle Vision MVP - Business Requirements

## Core Business Domains

### 1. User Management
- **User Registration & Authentication**
  - Email/password registration
  - Social login (Google, Facebook)
  - Email verification
  - Password reset functionality
  - JWT-based authentication

- **User Roles & Permissions**
  - Client (default role)
  - Staff (can manage appointments)
  - Admin (full system access)
  - Role-based access control (RBAC)

### 2. Appointment Management
- **Appointment Booking**
  - View available time slots
  - Book/cancel/reschedule appointments
  - Service selection
  - Automatic email confirmations
  - Reminder notifications

- **Appointment Types**
  - Initial consultation
  - Tax preparation
  - Document review
  - Follow-up sessions

- **Calendar Integration**
  - Google Calendar sync
  - iCal export
  - Conflict detection

### 3. Client Management
- **Client Profiles**
  - Personal information
  - Contact details
  - Document storage
  - Case history
  - Communication log

- **Document Management**
  - Secure file uploads
  - Document categorization
  - Version control
  - Secure sharing

### 4. Billing & Payments
- **Invoicing**
  - Generate invoices
  - Payment tracking
  - Receipt generation
  - Tax calculations

- **Payment Processing**
  - Credit/debit card payments
  - Online payment gateways (Stripe, PayPal)
  - Payment plans
  - Refund processing

### 5. Case Management
- **Case Creation & Tracking**
  - Case types (Immigration, Tax, etc.)
  - Status tracking
  - Priority levels
  - Assignment to staff
  - Deadline management

- **Communication**
  - Internal notes
  - Client communication log
  - Email templates
  - Status updates

### 6. Reporting & Analytics
- **Appointment Metrics**
  - Bookings by service
  - Staff performance
  - Peak hours analysis
  - Cancellation rates

- **Financial Reports**
  - Revenue by service
  - Outstanding payments
  - Tax reporting
  - Profitability analysis

## API Endpoints (GraphQL)

### Authentication
```graphql
type Mutation {
  register(input: RegisterInput!): AuthPayload!
  login(email: String!, password: String!): AuthPayload!
  forgotPassword(email: String!): Boolean
  resetPassword(token: String!, newPassword: String!): Boolean
}
```

### Appointments
```graphql
type Query {
  appointments(
    startDate: String
    endDate: String
    status: AppointmentStatus
    clientId: ID
  ): [Appointment!]!
  availableSlots(serviceId: ID!, date: String!): [String!]!
}

type Mutation {
  createAppointment(input: CreateAppointmentInput!): Appointment!
  updateAppointment(id: ID!, input: UpdateAppointmentInput!): Appointment!
  cancelAppointment(id: ID!): Appointment!
  rescheduleAppointment(id: ID!, newDateTime: String!): Appointment!
}
```

### Clients
```graphql
type Query {
  client(id: ID!): Client
  clients(search: String, status: ClientStatus): [Client!]!
}

type Mutation {
  createClient(input: CreateClientInput!): Client!
  updateClient(id: ID!, input: UpdateClientInput!): Client!
  uploadClientDocument(input: UploadDocumentInput!): Document!
}
```

### Billing
```graphql
type Query {
  invoice(id: ID!): Invoice
  invoices(clientId: ID, status: InvoiceStatus): [Invoice!]!
}

type Mutation {
  createInvoice(input: CreateInvoiceInput!): Invoice!
  processPayment(input: ProcessPaymentInput!): Payment!
```

### Invoice
```typescript
interface Invoice {
  id: ID!
  client: Client!
  amount: Float!
  tax: Float!
  total: Float!
  dueDate: Date!
  status: InvoiceStatus!
  items: [InvoiceItem!]!
  payments: [Payment!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

## Implementation Priorities (MVP)

### Phase 1: Core Functionality
1. User authentication and authorization
2. Basic appointment scheduling
3. Client profile management
4. Simple document upload

### Phase 2: Enhanced Features
1. Calendar integration
2. Email notifications
3. Basic reporting
4. Payment processing

### Phase 3: Advanced Features
1. Advanced reporting
2. Document management
3. Case management
4. Multi-language support

## Security Requirements
- Data encryption at rest and in transit
- Regular security audits
- GDPR/CCPA compliance
- Role-based access control
- Audit logging

## Integration Points
- Email service (SendGrid, Mailchimp)
- Payment processors (Stripe, PayPal)
- Calendar services (Google Calendar, Outlook)
- Document storage (AWS S3, Google Drive)
- SMS notifications (Twilio)
