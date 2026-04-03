CREATE TABLE IF NOT EXISTS t_p25668763_mini_social_network_.conversations (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.users(id),
    user2_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS t_p25668763_mini_social_network_.messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.conversations(id),
    sender_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.users(id),
    text TEXT NOT NULL DEFAULT '',
    file_url TEXT,
    file_name TEXT,
    file_mime TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON t_p25668763_mini_social_network_.messages(conversation_id, created_at);
