# Migration Guide: Static to Dynamic Data

This guide outlines the steps to migrate from static data to a dynamic backend for the Eagle Vision MVP project.

## 1. Current Static Data Structure

### Existing Data Files
- `src/data/appointmentData.json`
- Any other JSON/JS files containing static data

### Current Implementation
- Data is imported directly into components
- No API calls are made
- State management is local to components

## 2. Backend Setup

### Database Schema
1. **Services Table**
   ```sql
   CREATE TABLE services (
     id SERIAL PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     description TEXT,
     duration INTEGER NOT NULL,
     price DECIMAL(10, 2),
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Appointments Table**
   ```sql
   CREATE TABLE appointments (
     id SERIAL PRIMARY KEY,
     user_id INTEGER REFERENCES users(id),
     service_id INTEGER REFERENCES services(id),
     appointment_date DATE NOT NULL,
     start_time TIME NOT NULL,
     end_time TIME NOT NULL,
     status VARCHAR(20) DEFAULT 'scheduled',
     notes TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

## 3. API Endpoints to Implement

### Services
- `GET /api/services` - List all active services
- `GET /api/services/:id` - Get service details
- `POST /api/services` - Create new service (admin only)
- `PUT /api/services/:id` - Update service (admin only)

### Appointments
- `GET /api/appointments` - List appointments (filterable by date, status)
- `POST /api/appointments` - Create new appointment
- `GET /api/appointments/available-slots` - Get available time slots
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

## 4. Frontend Migration Steps

### Step 1: Set Up API Service
Create `src/services/api.js`:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Step 2: Create Service Hooks
Create `src/hooks/useServices.js`:
```javascript
import { useQuery } from 'react-query';
import api from '../services/api';

export const useServices = () => {
  return useQuery('services', async () => {
    const { data } = await api.get('/services');
    return data;
  });
};
```

### Step 3: Update Components
Example for Services component:

**Before (Static):**
```jsx
import { services } from '../data/services';

function Services() {
  return (
    <div>
      {services.map(service => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
```

**After (Dynamic):**
```jsx
import { useServices } from '../hooks/useServices';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

function Services() {
  const { data: services, isLoading, error } = useServices();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load services" />;

  return (
    <div>
      {services?.map(service => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  );
}
```

## 5. Data Migration Script

Create a script to migrate existing static data to the database:

```javascript
// scripts/migrate-data.js
const services = require('../src/data/services.json');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  for (const service of services) {
    await prisma.service.create({
      data: {
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        isActive: true
      },
    });
  }
  console.log('Migration completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## 6. Environment Variables

Create `.env` file in the root:
```
# Frontend
REACT_APP_API_URL=http://localhost:8000/api

# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/eaglevision
JWT_SECRET=your_jwt_secret
```

## 7. Testing the Migration

1. Start the backend server
2. Run the data migration script
3. Start the frontend
4. Verify data is loading from the API
5. Test all CRUD operations

## 8. Common Issues and Solutions

### CORS Errors
- Ensure CORS is properly configured on the backend
- Check if the API URL is correct

### Authentication Issues
- Verify JWT tokens are being sent in the Authorization header
- Check token expiration

### Data Format Mismatch
- Ensure API responses match the expected format in the frontend
- Add data transformation if needed

## 9. Next Steps After Migration

1. Implement error boundaries
2. Add loading states and skeletons
3. Set up API response caching
4. Implement offline support
5. Add error tracking and monitoring
