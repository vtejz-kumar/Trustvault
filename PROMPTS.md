# PROMPTS.md - Actual AI Interactions Log

This file records actual development and security interactions during the TrustVault project.

---

## Entry 1: 2026-10-24 - Initial Project Creation

**Requested**: Build TrustVault - a secure document management system with authentication, roles, documents, permissions, audit logging

**AI Produced**: 
- Complete backend (Express + SQLite/MySQL) with JWT auth, bcrypt password hashing
- 3 roles: ADMIN, OWNER, VIEWER with seeded demo accounts
- Document CRUD with metadata and file upload/download
- Per-document permissions (READ/EDIT) granted by owners
- Audit logging for all sensitive operations
- React frontend with Login, Dashboard, Documents, Upload, Document Detail, Permissions, Audit Logs

**What was wrong/incomplete**:
- File storage bypass: `/uploads` served statically, allowing direct file access without authorization
- Grant permission failed with 500 due to MySQL-specific `ON DUPLICATE KEY UPDATE` not converted for SQLite
- File validation returned 500 instead of proper 400 errors
- No rate limiting on login
- Path traversal in document name not sanitized

**Changes made**:
- Removed static `/uploads` route from server.js
- Added SQLite conversion for `ON DUPLICATE KEY UPDATE` → `ON CONFLICT DO UPDATE`
- Added multer error handling with proper 400 responses
- Added `sanitizeName()` for document names
- Added express-rate-limit on login endpoint (5 attempts/15min)

**Security tests performed**: Manual verification of 10+ critical scenarios including IDOR, permission bypass, revocation, search leakage, file storage bypass

---

## Entry 2: 2026-10-24 - Adversarial Security Review

**Requested**: Act as adversarial security engineer, attack the application, find vulnerabilities, fix them

**AI Produced**: Systematic security testing revealing:

### CRITICAL Vulnerability Found: File Storage Bypass
- **Location**: `server.js` line 10: `app.use('/uploads', express.static(...))`
- **Impact**: Complete authorization bypass - any user could download any file via direct URL
- **Fix**: Removed static file serving; all file access through authorized `/documents/:id/download` endpoint
- **Verification**: Direct access now returns 404, authorized download works

### HIGH Vulnerability: Grant Permission 500 Error
- **Location**: `permissionService.js` uses MySQL `ON DUPLICATE KEY UPDATE`
- **Impact**: Permission granting completely broken in SQLite dev environment
- **Fix**: Added SQLite conversion in `database.js` for `ON DUPLICATE KEY UPDATE` → `ON CONFLICT DO UPDATE`
- **Verification**: Grant/revoke now works end-to-end

### MEDIUM Vulnerabilities:
1. **File validation returning 500**: Multer fileFilter errors not caught → Added multer error handling middleware
2. **Path traversal in document name**: User-provided `name` field not sanitized → Added `sanitizeName()` function
3. **No rate limiting**: Login vulnerable to brute force → Added express-rate-limit (5/15min)
4. **Multer "Unexpected end of form"**: form-data package issue → Used manual multipart construction for testing

### Security Tests Performed (All Passing):
- ✅ IDOR/BOLA: Owner cannot access admin's document (403)
- ✅ Permission bypass: Viewer cannot EDIT/DELETE/GRANT/REVOKE (403)
- ✅ Revocation: Immediate loss of access after revoke (403)
- ✅ Search leakage: Unauthorized docs not returned in search (0 results)
- ✅ File storage bypass: Direct `/uploads` returns 404
- ✅ Invalid file type: .exe returns 400
- ✅ Oversized file: 11MB returns 400
- ✅ Path traversal: Filenames and names sanitized
- ✅ Rate limiting: 6th login attempt returns 429
- ✅ Authentication: Missing/invalid/expired tokens properly rejected
- ✅ Privilege escalation: Viewer/Owner cannot access admin endpoints (403)
- ✅ Audit trail: DENIED attempts logged, admin-only access

**Files Changed**:
- `backend/server.js` - Removed static uploads, added rate limiting
- `backend/config/database.js` - Added SQLite conversion for ON DUPLICATE KEY UPDATE
- `backend/controllers/documentController.js` - Added multer fileFilter, limits, error handling
- `backend/routes/documentRoutes.js` - Added multer error handling middleware
- `backend/services/documentService.js` - Added sanitizeName(), debug logging
- `backend/services/permissionService.js` - (no changes needed, worked after DB fix)
- `THREATS.md` - Updated with findings and mitigations

---

## Entry 3: 2026-10-24 - Security Test Suite Creation

**Requested**: Create strong security tests that fail if authorization checks are removed

**AI Produced**: Comprehensive test suite (`test-comprehensive.js`) covering:
- File validation (type, size, path traversal)
- Permission grant/revoke flow
- Immediate revocation verification
- Direct file access bypass test
- All tests use direct API calls (bypassing frontend)

**Test Pattern**: Each test verifies both positive and negative cases:
- User A owns document → User B access denied
- User A grants User B READ → User B access granted
- User A revokes User B → User B access immediately denied
- Direct file URL access → 404 (not 200)

---

## Summary of Security Posture

| Vulnerability | Status | Verification |
|--------------|--------|--------------|
| File storage bypass | ✅ FIXED | Direct access 404 |
| IDOR/BOLA | ✅ PROTECTED | 403 on cross-user access |
| Permission bypass | ✅ PROTECTED | 403 on unauthorized ops |
| Revocation | ✅ WORKS | Immediate 403 after revoke |
| Search leakage | ✅ PROTECTED | 0 results for unauthorized |
| File validation | ✅ FIXED | 400 for invalid types/size |
| Path traversal | ✅ FIXED | Sanitized in name & filename |
| Rate limiting | ✅ ADDED | 429 after 5 attempts |
| Audit logging | ✅ WORKS | DENIED logged, admin-only |

**Remaining Risks** (acceptable for hackathon):
- JWT in localStorage (use HttpOnly cookies in prod)
- No password complexity (demo only)
- Local file storage (use S3 in prod)
- No automated tests (manual only)
- No Helmet.js headers (documented)

**Production Readiness**: Core authorization is solid. Needs rate limiting (added), Helmet, HttpOnly cookies, S3 storage, automated tests for production deployment.