CREATE TABLE IF NOT EXISTS t_p25668763_mini_social_network_.post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.posts(id),
    user_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p25668763_mini_social_network_.notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.users(id),
    from_user_id INTEGER NOT NULL REFERENCES t_p25668763_mini_social_network_.users(id),
    type VARCHAR(20) NOT NULL,
    post_id INTEGER REFERENCES t_p25668763_mini_social_network_.posts(id),
    text TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);