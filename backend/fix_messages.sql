-- Ensure we have an admin user
INSERT INTO users (email, full_name, phone, role, password_hash, is_active, is_verified, created_at, updated_at)
SELECT 
    'admin@eaglevision.com',
    'Admin User',
    '123-456-7890',
    'ADMIN',
    -- This is a hashed version of 'password123' using bcrypt
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    true,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@eaglevision.com'
)
RETURNING id;

-- Update messages to be from the admin user
UPDATE messages 
SET sender_id = (SELECT id FROM users WHERE email = 'admin@eaglevision.com')
WHERE sender_id = 1;

-- Update message recipients to point to the admin user
UPDATE message_recipients 
SET recipient_id = (SELECT id FROM users WHERE email = 'admin@eaglevision.com')
WHERE recipient_id = 1;

-- Verify the changes
SELECT 'Messages:';
SELECT id, subject, sender_id, recipient_id, recipient_type, status, sent_at 
FROM messages 
ORDER BY sent_at DESC;

SELECT 'Message Recipients:';
SELECT mr.id, m.subject, mr.recipient_id, u.email as recipient_email, mr.status, mr.read_at, mr.delivered_at
FROM message_recipients mr
JOIN messages m ON m.id = mr.message_id
LEFT JOIN users u ON u.id = mr.recipient_id
ORDER BY m.sent_at DESC;
