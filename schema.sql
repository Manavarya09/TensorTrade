-- TensorTrade SQL Schema
-- Version: 3.0.0
-- Database: PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'elite')),
    shariah_mode BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}', -- language, timezone, risk_tolerance, notifications
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Portfolios Table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_value DECIMAL(15, 2) DEFAULT 0.00,
    total_pnl DECIMAL(15, 2) DEFAULT 0.00,
    risk_score INTEGER CHECK (risk_score BETWEEN 0 AND 100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Portfolio Assets Table (Holdings)
CREATE TABLE portfolio_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(15, 6) NOT NULL,
    avg_cost DECIMAL(15, 2) NOT NULL,
    current_price DECIMAL(15, 2),
    pnl DECIMAL(15, 2),
    shariah_score INTEGER CHECK (shariah_score BETWEEN 0 AND 100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(portfolio_id, symbol)
);

-- 4. Trades Table (History)
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    action VARCHAR(10) CHECK (action IN ('BUY', 'SELL')),
    price DECIMAL(15, 2) NOT NULL,
    quantity DECIMAL(15, 6) NOT NULL,
    pnl DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED', 'PENDING')),
    behavioral_flags JSONB DEFAULT '[]', -- Array of detected patterns
    shariah_compliant BOOLEAN DEFAULT TRUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Trading Policies Table (Rules Engine)
CREATE TABLE trading_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('loss_limit', 'trade_frequency', 'position_size', 'custom')),
    rules JSONB NOT NULL, -- { condition, threshold, action }
    active BOOLEAN DEFAULT TRUE,
    violations INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Calling Schedules Table (Voice Agent)
CREATE TABLE calling_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL, -- e.g., "0 9 * * 2"
    content_type VARCHAR(50) DEFAULT 'market_update' CHECK (content_type IN ('market_update', 'portfolio_review', 'custom')),
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'ar')),
    active BOOLEAN DEFAULT TRUE,
    last_call TIMESTAMP WITH TIME ZONE,
    next_call TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Agent Performance Table (Self-Improving System)
CREATE TABLE agent_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(50) NOT NULL, -- e.g., 'macro_hawk', 'skeptic'
    analysis_id UUID, -- Link to specific analysis event
    prediction_direction VARCHAR(20) CHECK (prediction_direction IN ('bullish', 'bearish', 'neutral')),
    prediction_confidence INTEGER CHECK (prediction_confidence BETWEEN 0 AND 10),
    prediction_timeframe VARCHAR(20) CHECK (prediction_timeframe IN ('1D', '1W', '1M')),
    actual_outcome_price_change DECIMAL(10, 2),
    outcome_date TIMESTAMP WITH TIME ZONE,
    accuracy_score DECIMAL(5, 2), -- 0-100
    user_feedback_rating INTEGER CHECK (user_feedback_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Shariah Feedback Table (Learning Loop)
CREATE TABLE shariah_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_symbol VARCHAR(20) NOT NULL,
    system_score INTEGER CHECK (system_score BETWEEN 0 AND 100),
    scholar_score INTEGER CHECK (scholar_score BETWEEN 0 AND 100),
    scholar_reasoning TEXT,
    madhab VARCHAR(20) CHECK (madhab IN ('hanafi', 'maliki', 'shafii', 'hanbali')),
    disagreement_area VARCHAR(50) CHECK (disagreement_area IN ('business', 'debt', 'interest', 'cash')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Recommendation Outcomes Table (Effectiveness Tracking)
CREATE TABLE recommendation_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recommendation_id UUID,
    suggested_action VARCHAR(50), -- 'BUY', 'SELL', 'STOP_TRADING'
    user_action VARCHAR(50) CHECK (user_action IN ('followed', 'ignored', 'partial')),
    pnl_impact DECIMAL(15, 2),
    behavioral_improvement BOOLEAN,
    effectiveness_score DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_portfolio_assets_portfolio_id ON portfolio_assets(portfolio_id);
CREATE INDEX idx_agent_performance_agent_id ON agent_performance(agent_id);
