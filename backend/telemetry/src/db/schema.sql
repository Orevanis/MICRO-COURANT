-- Micro-Courant Telemetry Database Schema

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Meters table
CREATE TABLE IF NOT EXISTS meters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meter_id VARCHAR(255) UNIQUE NOT NULL,
    household_id VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    installation_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    trust_score INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meter readings table
CREATE TABLE IF NOT EXISTS meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meter_id VARCHAR(255) NOT NULL,
    household_id VARCHAR(255) NOT NULL,
    consumption_kwh DECIMAL(10, 3) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    signature TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meter_id) REFERENCES meters(meter_id)
);

-- Households table
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id VARCHAR(255) UNIQUE NOT NULL,
    stellar_address VARCHAR(255),
    billing_mode VARCHAR(50) DEFAULT 'prepaid',
    current_balance DECIMAL(20, 2) DEFAULT 0,
    total_consumption DECIMAL(20, 3) DEFAULT 0,
    total_paid DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing records table
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id VARCHAR(255) NOT NULL,
    meter_id VARCHAR(255) NOT NULL,
    consumption_kwh DECIMAL(10, 3) NOT NULL,
    tariff_rate DECIMAL(10, 2) NOT NULL,
    cost DECIMAL(20, 2) NOT NULL,
    subsidy_applied DECIMAL(20, 2) DEFAULT 0,
    final_cost DECIMAL(20, 2) NOT NULL,
    billing_cycle_start TIMESTAMP NOT NULL,
    billing_cycle_end TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    settlement_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (household_id) REFERENCES households(household_id),
    FOREIGN KEY (meter_id) REFERENCES meters(meter_id)
);

-- Grid load statistics table
CREATE TABLE IF NOT EXISTS grid_load_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP NOT NULL,
    total_consumption DECIMAL(20, 3) NOT NULL,
    active_meters INTEGER NOT NULL,
    peak_load DECIMAL(20, 3) NOT NULL,
    avg_load DECIMAL(20, 3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meter_id VARCHAR(255) NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'medium',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meter_id) REFERENCES meters(meter_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_id ON meter_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_household_id ON meter_readings(household_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_timestamp ON meter_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_billing_records_household_id ON billing_records(household_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_grid_load_stats_timestamp ON grid_load_stats(timestamp);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_meter_id ON fraud_alerts(meter_id);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_resolved ON fraud_alerts(resolved);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meters_updated_at BEFORE UPDATE ON meters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
