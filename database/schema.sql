-- TrustVault Database Schema (MySQL)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'OWNER', 'VIEWER') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id VARCHAR(36) NOT NULL,
    category VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Document permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    permission ENUM('READ', 'EDIT') NOT NULL,
    granted_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doc_user (document_id, user_id)
) ENGINE=InnoDB;

-- Audit logs table (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    document_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    target_user_id VARCHAR(36),
    result ENUM('SUCCESS', 'DENIED') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Indexes for performance
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_permissions_user ON document_permissions(user_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_document ON audit_logs(document_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);