-- Identity and billing database schema for billing engine

-- Identities table (WaveID integration)
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stellar_address VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    metadata JSONB,
    wave_id VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Households table (extended)
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id VARCHAR(255) UNIQUE NOT NULL,
    stellar_address VARCHAR(255),
    identity_id UUID REFERENCES identities(id),
    billing_mode VARCHAR(50) DEFAULT 'prepaid',
    current_balance DECIMAL(20, 2) DEFAULT 0,
    total_consumption DECIMAL(20, 3) DEFAULT 0,
    total_paid DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subsidies table
CREATE TABLE IF NOT EXISTS subsidies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subsidy_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percentage INTEGER NOT NULL,
    eligible_households VARCHAR(255)[] DEFAULT ARRAY[]::VARCHAR[],
    start_timestamp TIMESTAMP NOT NULL,
    end_timestamp TIMESTAMP NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    total_allocated DECIMAL(20, 2) DEFAULT 0,
    total_distributed DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_identities_stellar_address ON identities(stellar_address);
CREATE INDEX IF NOT EXISTS idx_identities_role ON identities(role);
CREATE INDEX IF NOT EXISTS idx_households_stellar_address ON households(stellar_address);
CREATE INDEX IF NOT EXISTS idx_households_identity_id ON households(identity_id);
CREATE INDEX IF NOT EXISTS idx_subsidies_eligible_households ON subsidies USING GIN(eligible_households);
CREATE INDEX IF NOT EXISTS idx_subsidies_active ON subsidies(active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subsidies_updated_at BEFORE UPDATE ON subsidies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
