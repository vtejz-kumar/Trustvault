# TrustVault API Documentation

Base URL: `http://localhost:3001/api`

All protected endpoints require `Authorization: Bearer <token>` header.

## Authentication

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": "OWNER"
  }
}
```

### Get Profile
```
GET /auth/profile
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "role": "OWNER",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Documents

### Upload Document
```
POST /documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- file: (binary, required, max 10MB, allowed: PDF, DOC, DOCX, TXT, PNG, JPG, GIF)
- name: (string, optional, defaults to original filename)
- category: (string, optional)

Response 201:
{
  "id": "uuid",
  "name": "Document Name",
  "owner_id": "uuid",
  "category": "Category",
  "file_path": "/path/to/file",
  "file_name": "original.pdf",
  "file_size": 1024000,
  "mime_type": "application/pdf",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### List Documents
```
GET /documents?page=1&limit=20&search=term&category=cat&ownerId=uuid&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>

Response 200:
{
  "documents": [
    {
      "id": "uuid",
      "name": "Document Name",
      "owner_id": "uuid",
      "category": "Category",
      "file_name": "original.pdf",
      "file_size": 1024000,
      "mime_type": "application/pdf",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "owner_name": "Owner Name",
      "owner_email": "owner@example.com",
      "canEdit": true,
      "canRead": true
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Note**: Results filtered by user's permissions. Users only see documents they own or have permissions for.

### Get Categories
```
GET /documents/categories
Authorization: Bearer <token>

Response 200:
["Category1", "Category2", "Category3"]
```

### Get Document Details
```
GET /documents/:id
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "name": "Document Name",
  "owner_id": "uuid",
  "category": "Category",
  "file_path": "/path/to/file",
  "file_name": "original.pdf",
  "file_size": 1024000,
  "mime_type": "application/pdf",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "owner_name": "Owner Name",
  "owner_email": "owner@example.com",
  "canEdit": true,
  "canRead": true
}

Response 403: { "error": "Access denied" }
Response 404: { "error": "Document not found" }
```

### Download Document
```
GET /documents/:id/download
Authorization: Bearer <token>

Response: File download (binary)
Response 403: { "error": "Access denied" }
Response 404: { "error": "Document not found" }
```

### Update Document
```
PUT /documents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "category": "New Category"
}

Response 200: Updated document object
Response 403: { "error": "Access denied" }
Response 404: { "error": "Document not found" }
```

### Delete Document
```
DELETE /documents/:id
Authorization: Bearer <token>

Response 200: { "message": "Document deleted" }
Response 403: { "error": "Access denied" }
Response 404: { "error": "Document not found" }
```

## Permissions

### List Available Users
```
GET /permissions/users
Authorization: Bearer <token>

Response 200:
[
  { "id": "uuid", "name": "User Name", "email": "user@example.com", "role": "VIEWER" }
]
```

### List Document Permissions
```
GET /permissions/:id
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "uuid",
    "document_id": "uuid",
    "user_id": "uuid",
    "permission": "READ",
    "granted_by": "uuid",
    "created_at": "2024-01-15T10:30:00Z",
    "name": "User Name",
    "email": "user@example.com",
    "role": "VIEWER"
  }
]

Response 403: { "error": "Access denied" }
```

### Grant Permission
```
POST /permissions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetUserId": "uuid",
  "permission": "READ"  // or "EDIT"
}

Response 200: { "message": "Permission granted", "permission": {...} }
Response 400: { "error": "Invalid permission" }
Response 403: { "error": "Only document owner or admin can grant permissions" }
Response 404: { "error": "Document not found" or "Target user not found" }
```

### Revoke Permission
```
DELETE /permissions/:id/:userId
Authorization: Bearer <token>

Response 200: { "message": "Permission revoked" }
Response 403: { "error": "Only document owner or admin can revoke permissions" }
Response 404: { "error": "Permission not found" }
```

## Audit Logs (Admin Only)

### List Audit Logs
```
GET /audit?page=1&limit=50&userId=uuid&documentId=uuid&action=UPLOAD&result=SUCCESS&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token> (ADMIN role required)

Response 200:
{
  "logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "document_id": "uuid",
      "action": "UPLOAD",
      "target_user_id": null,
      "result": "SUCCESS",
      "ip_address": "::1",
      "user_agent": "Mozilla/5.0...",
      "metadata": "{}",
      "timestamp": "2024-01-15T10:30:00Z",
      "user_name": "User Name",
      "user_email": "user@example.com",
      "document_name": "Document Name"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50
}
```

## Error Responses

All endpoints may return:
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Missing or invalid token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found
- `500`: Internal Server Error

Error format:
```json
{ "error": "Descriptive error message" }
```

## Rate Limiting

Not implemented in this version. Add express-rate-limit for production.

## CORS

Configured for `http://localhost:3000` in development. Update for production domain.