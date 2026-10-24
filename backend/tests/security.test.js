/**
 * TrustVault Security Tests
 * 
 * These tests verify that authorization is enforced server-side.
 * If any authorization check is accidentally removed, at least one test will fail.
 * 
 * Run with: node tests/security.test.js
 */

const { spawn } = require('child_process');
const fetch = globalThis.fetch;
const fs = require('fs');

// Test configuration
const API_BASE = 'http://localhost:3001/api';
const TEST_FILE_CONTENT = 'Security test content';
const TEST_FILE_NAME = 'security-test.txt';

let server = null;
let ownerToken = null;
let viewerToken = null;
let adminToken = null;
let viewerId = null;
let testDocId = null;

async function startServer() {
  return new Promise((resolve) => {
    server = spawn('node', ['server.js'], { 
      cwd: 'C:\\Users\\venkata sai kishore\\trustvault\\backend',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('TrustVault backend running')) {
        resolve();
      }
    });

    server.stderr.on('data', (data) => {
      console.error('SERVER ERR:', data.toString().trim());
    });
  });
}

async function stopServer() {
  if (server) {
    server.kill();
    await new Promise(r => setTimeout(r, 500));
  }
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${data.error}`);
  return data.token;
}

async function getProfile(token) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    headers: {'Authorization': `Bearer ${token}`}
  });
  return res.json();
}

async function uploadDocument(token, fileName = TEST_FILE_NAME, content = TEST_FILE_CONTENT) {
  fs.writeFileSync(`C:\\Users\\venkata sai kishore\\trustvault\\backend\\${fileName}`, content);
  
  const boundary = '----TestBoundary' + Date.now();
  const fileContent = fs.readFileSync(`C:\\Users\\venkata sai kishore\\trustvault\\backend\\${fileName}`);
  
  const body = 
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="' + fileName + '"\r\n' +
    'Content-Type: text/plain\r\n\r\n' +
    fileContent.toString() + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="name"\r\n\r\n' +
    'Security Test Document\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="category"\r\n\r\n' +
    'Test\r\n' +
    '--' + boundary + '--\r\n';
  
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: body
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(`Upload failed: ${data.error}`);
  return data;
}

async function getDocument(token, docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    headers: {'Authorization': `Bearer ${token}`}
  });
  return { status: res.status, data: await res.json() };
}

async function downloadDocument(token, docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}/download`, {
    headers: {'Authorization': `Bearer ${token}`}
  });
  return { status: res.status, data: res.ok ? await res.text() : await res.json() };
}

async function updateDocument(token, docId, updates) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: 'PUT',
    headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(updates)
  });
  return { status: res.status, data: await res.json() };
}

async function deleteDocument(token, docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: 'DELETE',
    headers: {'Authorization': `Bearer ${token}`}
  });
  return { status: res.status, data: await res.json() };
}

async function grantPermission(token, docId, targetUserId, permission) {
  const res = await fetch(`${API_BASE}/permissions/${docId}`, {
    method: 'POST',
    headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({targetUserId, permission})
  });
  return { status: res.status, data: await res.json() };
}

async function revokePermission(token, docId, targetUserId) {
  const res = await fetch(`${API_BASE}/permissions/${docId}/${targetUserId}`, {
    method: 'DELETE',
    headers: {'Authorization': `Bearer ${token}`}
  });
  return { status: res.status, data: await res.json() };
}

async function directFileAccess(fileName) {
  const res = await fetch(`http://localhost:3001/uploads/${fileName}`);
  const text = await res.text();
  return { status: res.status, data: text };
}

async function runTests() {
  console.log('=== TrustVault Security Test Suite ===\n');
  
  let passed = 0;
  let failed = 0;
  
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.log(`  ❌ ${message}`);
      failed++;
    }
  }
  
  try {
    // Setup
    console.log('Starting server...');
    await startServer();
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\nLogging in...');
    ownerToken = await login('owner@trustvault.com', 'owner123');
    viewerToken = await login('viewer@trustvault.com', 'viewer123');
    adminToken = await login('admin@trustvault.com', 'admin123');
    
    const viewerProfile = await getProfile(viewerToken);
    viewerId = viewerProfile.id;
    console.log(`Viewer ID: ${viewerId}`);
    
    console.log('\nUploading test document as OWNER...');
    const uploadResult = await uploadDocument(ownerToken);
    testDocId = uploadResult.id;
    console.log(`Document ID: ${testDocId}`);
    
    // ==========================================
    // TEST 1: Owner can access own document
    // ==========================================
    console.log('\n--- TEST 1: Owner access ---');
    const ownerView = await getDocument(ownerToken, testDocId);
    assert(ownerView.status === 200, 'Owner can VIEW own document');
    
    const ownerDownload = await downloadDocument(ownerToken, testDocId);
    assert(ownerDownload.status === 200, 'Owner can DOWNLOAD own document');
    
    const ownerUpdate = await updateDocument(ownerToken, testDocId, {name: 'Updated Name'});
    assert(ownerUpdate.status === 200, 'Owner can EDIT own document');
    
    // ==========================================
    // TEST 2: Viewer WITHOUT permission - DENIED
    // ==========================================
    console.log('\n--- TEST 2: Viewer without permission ---');
    const viewerViewNoPerm = await getDocument(viewerToken, testDocId);
    assert(viewerViewNoPerm.status === 403, 'Viewer without permission DENIED VIEW');
    
    const viewerDownloadNoPerm = await downloadDocument(viewerToken, testDocId);
    assert(viewerDownloadNoPerm.status === 403, 'Viewer without permission DENIED DOWNLOAD');
    
    const viewerUpdateNoPerm = await updateDocument(viewerToken, testDocId, {name: 'Hacked'});
    assert(viewerUpdateNoPerm.status === 403, 'Viewer without permission DENIED EDIT');
    
    const viewerDeleteNoPerm = await deleteDocument(viewerToken, testDocId);
    assert(viewerDeleteNoPerm.status === 403, 'Viewer without permission DENIED DELETE');
    
    // ==========================================
    // TEST 3: IDOR - Viewer cannot access by changing document ID
    // ==========================================
    console.log('\n--- TEST 3: IDOR protection ---');
    // Create another document owned by admin
    const adminUpload = await uploadDocument(adminToken, 'admin-doc.txt', 'Admin content');
    const adminDocId = adminUpload.id;
    
    const viewerAccessAdminDoc = await getDocument(viewerToken, adminDocId);
    assert(viewerAccessAdminDoc.status === 403, 'Viewer cannot access admin document (IDOR)');
    
    const viewerDownloadAdminDoc = await downloadDocument(viewerToken, adminDocId);
    assert(viewerDownloadAdminDoc.status === 403, 'Viewer cannot download admin document (IDOR)');
    
    // ==========================================
    // TEST 4: Permission grant flow
    // ==========================================
    console.log('\n--- TEST 4: Permission grant ---');
    const grant = await grantPermission(ownerToken, testDocId, viewerId, 'READ');
    assert(grant.status === 200, 'Owner can GRANT READ permission');
    
    const viewerViewAfterGrant = await getDocument(viewerToken, testDocId);
    assert(viewerViewAfterGrant.status === 200, 'Viewer can VIEW after grant');
    
    const viewerDownloadAfterGrant = await downloadDocument(viewerToken, testDocId);
    assert(viewerDownloadAfterGrant.status === 200, 'Viewer can DOWNLOAD after grant');
    
    // Viewer still cannot EDIT with only READ
    const viewerEditWithRead = await updateDocument(viewerToken, testDocId, {name: 'Hacked'});
    assert(viewerEditWithRead.status === 403, 'Viewer with READ cannot EDIT');
    
    // ==========================================
    // TEST 5: Permission revoke - IMMEDIATE
    // ==========================================
    console.log('\n--- TEST 5: Immediate revocation ---');
    const revoke = await revokePermission(ownerToken, testDocId, viewerId);
    assert(revoke.status === 200, 'Owner can REVOKE permission');
    
    const viewerViewAfterRevoke = await getDocument(viewerToken, testDocId);
    assert(viewerViewAfterRevoke.status === 403, 'Viewer IMMEDIATELY denied after revoke');
    
    const viewerDownloadAfterRevoke = await downloadDocument(viewerToken, testDocId);
    assert(viewerDownloadAfterRevoke.status === 403, 'Viewer IMMEDIATELY denied download after revoke');
    
    // ==========================================
    // TEST 6: Viewer cannot grant/revoke permissions
    // ==========================================
    console.log('\n--- TEST 6: Viewer permission restrictions ---');
    const viewerGrant = await grantPermission(viewerToken, testDocId, viewerId, 'READ');
    assert(viewerGrant.status === 403, 'Viewer cannot GRANT permissions');
    
    const viewerRevoke = await revokePermission(viewerToken, testDocId, viewerId);
    assert(viewerRevoke.status === 403, 'Viewer cannot REVOKE permissions');
    
    // ==========================================
    // TEST 7: Role restrictions - Admin endpoints
    // ==========================================
    console.log('\n--- TEST 7: Role restrictions ---');
    const viewerAudit = await fetch(`${API_BASE}/audit`, {
      headers: {'Authorization': `Bearer ${viewerToken}`}
    });
    assert(viewerAudit.status === 403, 'Viewer cannot access audit logs');
    
    const ownerAudit = await fetch(`${API_BASE}/audit`, {
      headers: {'Authorization': `Bearer ${ownerToken}`}
    });
    assert(ownerAudit.status === 403, 'Owner cannot access audit logs');
    
    const adminAudit = await fetch(`${API_BASE}/audit`, {
      headers: {'Authorization': `Bearer ${adminToken}`}
    });
    assert(adminAudit.status === 200, 'Admin CAN access audit logs');
    
    // ==========================================
    // TEST 8: File storage bypass - direct access
    // ==========================================
    console.log('\n--- TEST 8: File storage bypass ---');
    const doc = await getDocument(ownerToken, testDocId);
    const fileName = doc.data.file_path.split('\\\\').pop().split('/').pop();
    
    const directAccess = await directFileAccess(fileName);
    assert(directAccess.status === 404, 'Direct file access returns 404 (no static serving)');
    
    // ==========================================
    // TEST 9: Search leakage
    // ==========================================
    console.log('\n--- TEST 9: Search leakage ---');
    const search = await fetch(`${API_BASE}/documents?search=Security`, {
      headers: {'Authorization': `Bearer ${viewerToken}`}
    });
    const searchData = await search.json();
    assert(searchData.total === 0, 'Search does not leak unauthorized documents');
    
    // ==========================================
    // TEST 10: File validation
    // ==========================================
    console.log('\n--- TEST 10: File validation ---');
    fs.writeFileSync('C:\\Users\\venkata sai kishore\\trustvault\\backend\\test.exe', 'MZ...');
    
    const boundary = '----TestBoundary' + Date.now();
    const exeContent = fs.readFileSync('C:\\Users\\venkata sai kishore\\trustvault\\backend\\test.exe');
    const exeBody = 
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="test.exe"\r\n' +
      'Content-Type: application/x-msdownload\r\n\r\n' +
      exeContent.toString() + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="name"\r\n\r\n' +
      'test.exe\r\n' +
      '--' + boundary + '--\r\n';
    
    const exeUpload = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${ownerToken}`, 'Content-Type': `multipart/form-data; boundary=${boundary}`},
      body: exeBody
    });
    assert(exeUpload.status === 400, 'Invalid file type (.exe) returns 400');
    
    // Oversized file
    const largeContent = 'x'.repeat(11 * 1024 * 1024);
    fs.writeFileSync('C:\\Users\\venkata sai kishore\\trustvault\\backend\\large.txt', largeContent);
    const largeContent2 = fs.readFileSync('C:\\Users\\venkata sai kishore\\trustvault\\backend\\large.txt');
    const largeBody = 
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="large.txt"\r\n' +
      'Content-Type: text/plain\r\n\r\n' +
      largeContent2.toString() + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="name"\r\n\r\n' +
      'large.txt\r\n' +
      '--' + boundary + '--\r\n';
    
    const largeUpload = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${ownerToken}`, 'Content-Type': `multipart/form-data; boundary=${boundary}`},
      body: largeBody
    });
    assert(largeUpload.status === 400, 'Oversized file (11MB) returns 400');
    
    // ==========================================
    // TEST 11: Rate limiting
    // ==========================================
    console.log('\n--- TEST 11: Rate limiting ---');
    for (let i = 0; i < 6; i++) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: 'wrong@test.com', password: 'wrong'})
      });
      if (i === 5) {
        assert(res.status === 429, 'Rate limiting: 6th attempt returns 429');
      }
    }
    
    // ==========================================
    // TEST 12: Audit logging
    // ==========================================
    console.log('\n--- TEST 12: Audit logging ---');
    const audit = await fetch(`${API_BASE}/audit`, {
      headers: {'Authorization': `Bearer ${adminToken}`}
    });
    const auditData = await audit.json();
    assert(auditData.total > 0, 'Audit logs contain entries');
    
    // Check DENIED attempts are logged
    const deniedLogs = auditData.logs.filter(l => l.result === 'DENIED');
    assert(deniedLogs.length > 0, 'DENIED attempts are logged');
    
    console.log('\n=== ALL TESTS COMPLETED ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ SOME TESTS FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ ALL SECURITY TESTS PASSED');
      process.exit(0);
    }
    
  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
    console.error(err.stack);
    failed++;
    process.exit(1);
  } finally {
    await stopServer();
  }
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  stopServer();
  process.exit(1);
});