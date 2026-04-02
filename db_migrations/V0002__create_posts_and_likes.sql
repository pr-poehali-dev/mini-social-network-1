CREATE TABLE t_p25668763_mini_social_network_.posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p25668763_mini_social_network_.users(id),
    text TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p25668763_mini_social_network_.post_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES t_p25668763_mini_social_network_.posts(id),
    user_id INTEGER REFERENCES t_p25668763_mini_social_network_.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
