# TrustVault - Secure Document Management System

A secure, role-based document management system with granular permissions, audit logging, and file security.

## Features

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Roles**: ADMIN, OWNER, VIEWER
- **Documents**: Upload, download, edit, delete with metadata
- **Permissions**: Per-document READ/EDIT permissions granted by owners
- **Audit Logs**: Immutable append-only logs for all sensitive operations
- **Security**: Server-side authorization on every protected endpoint
- **Search**: Filter documents by name, category, owner, date (respects permissions)

## Tech Stack

- **Backend**: Node.js, Express, MySQL
- **Frontend**: React 18, React Router
- **Database**: MySQL 8+
- **Auth**: JWT (jsonwebtoken), bcryptjs

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure database
cp .env.example .env
# Edit .env with your MySQL credentials

# Initialize database schema
npm run init-db

# Seed demo accounts
npm run seed

# Start server
npm start
```

Server runs on http://localhost:3001

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs on http://localhost:3000

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@trustvault.com | admin123 |
| OWNER | owner@trustvault.com | owner123 |
| VIEWER | viewer@trustvault.com | viewer123 |

## Project Structure

```
trustvault/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js    # Login, profile
│   │   ├── documentController.js # Document CRUD
│   │   ├── permissionController.js # Permission management
│   │   └── auditController.js   # Audit logs (admin only)
│   ├── middleware/
│   │   └── authMiddleware.js    # JWT verification, role checks
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── permissionRoutes.js
│   │   └── auditRoutes.js
│   ├── services/
│   │   ├── documentService.js   # Core document logic + authorization
│   │   ├── permissionService.js # Permission grant/revoke
│   │   └── auditService.js      # Audit logging
│   ├── uploads/                 # Secure file storage (not web accessible)
│   ├── server.js                # Express app entry point
│   └── .env                     # Environment config
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state management
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Documents.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── DocumentDetail.jsx
│   │   │   ├── Permissions.jsx
│   │   │   └── AuditLogs.jsx
│   │   ├── services/
│   │   │   └── api.js           # API client
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── database/
│   ├── schema.sql               # MySQL schema
│   ├── init.js                  # Schema initialization
│   └── seed.js                  # Demo data seeding
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/profile` | Get current user profile |

### Documents
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/documents/upload` | Upload document (multipart/form-data) | Required |
| GET | `/api/documents` | List documents (with search/filter) | Required |
| GET | `/api/documents/categories` | Get unique categories | Required |
| GET | `/api/documents/:id` | Get document details | Required |
| GET | `/api/documents/:id/download` | Download file | Required |
| PUT | `/api/documents/:id` | Update metadata | Required |
| DELETE | `/api/documents/:id` | Delete document | Required |

### Permissions
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/permissions/users` | List non-admin users | Required |
| GET | `/api/permissions/:id` | List document permissions | Required |
| POST | `/api/permissions/:id` | Grant permission | Required (owner/admin) |
| DELETE | `/api/permissions/:id/:userId` | Revoke permission | Required (owner/admin) |

### Audit (Admin Only)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/audit` | List audit logs (with filters) | ADMIN |

## Security Model

### Authorization Checks (Every Protected Endpoint)

```
authenticated user → requested document → current permission → requested operation → allow/deny
```

The backend is the **only** security boundary. Frontend checks are for UX only.

### Permission Matrix

| Operation | Owner | EDIT Permission | READ Permission | Admin | None |
|-----------|-------|-----------------|-----------------|-------|------|
| View/Download | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit Metadata | ✓ | ✓ | ✗ | ✓ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✓ | ✗ |
| Grant/Revoke | ✓ | ✗ | ✗ | ✓ | ✗ |

### File Security

- Files stored in `backend/uploads/` (not web-accessible)
- Downloads go through authenticated endpoint with authorization check
- File validation: 10MB limit, allowed MIME types only
- Filenames sanitized, stored with UUID prefix

### Audit Logging

All actions logged with: actor, action, document, target user, result (SUCCESS/DENIED), timestamp, IP, user-agent.

Actions: UPLOAD, VIEW, DOWNLOAD, EDIT, DELETE, GRANT_PERMISSION, REVOKE_PERMISSION, LOGIN, DENIED_ACCESS

Audit logs are append-only (no update/delete endpoints).

## Database Schema

### users
- id (PK), name, email (unique), password_hash, role (ADMIN/OWNER/VIEWER), timestamps

### documents
- id (PK), name, owner_id (FK→users), category, file_path, file_name, file_size, mime_type, timestamps

### document_permissions
- id (PK), document_id (FK), user_id (FK), permission (READ/EDIT), granted_by (FK→users), timestamp
- Unique constraint on (document_id, user_id)

### audit_logs
- id (PK), user_id (FK, nullable), document_id (FK, nullable), action, target_user_id (FK, nullable), result (SUCCESS/DENIED), ip_address, user_agent, metadata (JSON), timestamp

## Deployment

### Production Checklist

1. **Change JWT_SECRET** in backend/.env to a strong random string
2. **Use HTTPS** in production (reverse proxy with SSL)
3. **Set secure MySQL credentials** (not root, strong password)
4. **Configure CORS** for your domain in backend/server.js
5. **Set up reverse proxy** (nginx) for frontend and backend
6. **Run frontend build**: `npm run build` in frontend/, serve static files
7. **Use PM2** or similar for process management
8. **Set up MySQL backups**

### Environment Variables

Backend (.env):
```
DB_HOST=localhost
DB_USER=trustvault_user
DB_PASSWORD=strong_password
DB_NAME=trustvault
JWT_SECRET=your-256-bit-secret-key-here
PORT=3001
```

Frontend (.env):
```
REACT_APP_API_URL=https://your-api-domain.com/api
```

## Testing Security

Manual verification checklist:

1. ✓ Owner can access own document
2. ✓ Viewer with READ can view/download
3. ✓ Viewer without permission is rejected
4. ✓ Viewer cannot edit
5. ✓ Viewer cannot delete
6. ✓ Viewer cannot grant permissions
7. ✓ User cannot access another user's document by changing ID
8. ✓ Revoked user immediately loses access
9. ✓ Direct API calls rejected even if frontend hides button
10. ✓ Search does not reveal unauthorized documents

## Known Limitations / Future Improvements

- No automated tests (time-constrained hackathon)
- No email notifications
- No document versioning
- No bulk operations
- No 2FA
- Frontend served separately in production (configure proxy)
- File storage on local disk (use S3/compatible for production scale)

## License

MIT