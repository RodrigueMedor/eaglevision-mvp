-- First, let's see what message types we have
SELECT DISTINCT message_type FROM messages;

-- Update all message types to uppercase
UPDATE messages 
SET message_type = UPPER(CAST(message_type AS TEXT))::messagetype
WHERE message_type != UPPER(CAST(message_type AS TEXT))::messagetype;

-- Verify the changes
SELECT DISTINCT message_type FROM messages;
