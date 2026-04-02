CREATE TABLE t_p25668763_mini_social_network_.users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT DEFAULT '',
    status TEXT DEFAULT 'На связи',
    status_emoji TEXT DEFAULT '🟢',
    avatar_color TEXT DEFAULT '#1a1a1a',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p25668763_mini_social_network_.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p25668763_mini_social_network_.users(id),
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);
