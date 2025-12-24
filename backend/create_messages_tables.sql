-- Create enum types if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'messagestatus') THEN
        CREATE TYPE messagestatus AS ENUM ('draft', 'sent', 'delivered', 'failed');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'messagetype') THEN
        CREATE TYPE messagetype AS ENUM ('email', 'sms', 'push', 'in_app');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'messagerecipienttype') THEN
        CREATE TYPE messagerecipienttype AS ENUM ('all', 'client', 'staff', 'specific');
    END IF;
END$$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type messagetype NOT NULL DEFAULT 'email',
    status messagestatus NOT NULL DEFAULT 'draft',
    recipient_type messagerecipienttype NOT NULL,
    recipient_id INTEGER,
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create message_recipients table
CREATE TABLE IF NOT EXISTS message_recipients (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status messagestatus NOT NULL DEFAULT 'draft',
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add some test data
INSERT INTO messages (sender_id, subject, content, message_type, status, recipient_type, recipient_id, sent_at, created_at, updated_at)
VALUES 
(1, 'Welcome to Eagle Vision', 'Thank you for signing up to Eagle Vision! We are excited to have you on board.', 'email', 'sent', 'specific', 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(1, 'Your Appointment Confirmation', 'Your appointment for an eye examination has been confirmed for tomorrow at 2:00 PM.', 'email', 'sent', 'specific', 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours'),
(1, 'Special Offer', 'As a valued customer, enjoy 20% off on your next purchase of frames!', 'email', 'sent', 'all', NULL, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '6 hours');

-- Add message recipients
INSERT INTO message_recipients (message_id, recipient_id, status, delivered_at, read_at)
VALUES 
(1, 1, 'delivered', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '22 hours'),
(2, 1, 'delivered', NOW() - INTERVAL '1 hour', NULL),
(3, 1, 'delivered', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_recipient_id ON message_recipients(recipient_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_message_id ON message_recipients(message_id);
