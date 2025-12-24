-- First, let's check the current user's ID
SELECT 'Current User:', id, email, role FROM users WHERE email = 'test@example.com';

-- Create a message specifically for the test user (ID 1)
INSERT INTO messages (sender_id, subject, content, message_type, status, recipient_type, recipient_id, sent_at, created_at, updated_at)
SELECT 
    1, -- Sender ID (admin)
    'Test Message for ' || email,
    'This is a test message for ' || email || '. Please confirm you can see this message.',
    'email',
    'sent',
    'specific',
    id, -- Recipient ID (test user)
    NOW(),
    NOW(),
    NOW()
FROM users 
WHERE email = 'test@example.com'
RETURNING id;

-- Create the message recipient record
INSERT INTO message_recipients (message_id, recipient_id, status, delivered_at, read_at, created_at, updated_at)
SELECT 
    currval('messages_id_seq'), -- Get the ID of the message we just inserted
    id, -- Recipient ID (test user)
    'delivered',
    NOW(),
    NULL, -- Not read yet
    NOW(),
    NOW()
FROM users 
WHERE email = 'test@example.com';

-- Show all messages for the test user
SELECT 'All messages for test user:', u.email;
SELECT m.id, m.subject, m.sender_id, m.recipient_id, m.recipient_type, m.status, m.sent_at
FROM messages m
JOIN message_recipients mr ON m.id = mr.message_id
JOIN users u ON mr.recipient_id = u.id
WHERE u.email = 'test@example.com'
ORDER BY m.sent_at DESC;
