import pg from 'pg';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const { Pool } = pg;

export class IdentityService {
  constructor() {
    this.pool = null;
    this.redis = null;
  }

  async initialize() {
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 10
    });

    await this.pool.query('SELECT NOW()');
    logger.info('Identity service PostgreSQL connection established');

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password
    });

    this.redis.on('connect', () => {
      logger.info('Identity service Redis connection established');
    });

    this.redis.on('error', (err) => {
      logger.error('Identity service Redis error:', err);
    });
  }

  async registerIdentity(stellarAddress, role, metadata = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const checkQuery = 'SELECT * FROM identities WHERE stellar_address = $1';
      const existing = await client.query(checkQuery, [stellarAddress]);

      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Identity already exists' };
      }

      const insertQuery = `
        INSERT INTO identities (stellar_address, role, metadata, verified, created_at)
        VALUES ($1, $2, $3, false, NOW())
        RETURNING id
      `;
      
      const result = await client.query(insertQuery, [stellarAddress, role, JSON.stringify(metadata)]);
      const identityId = result.rows[0].id;

      await this.redis.setex(
        `identity:${stellarAddress}`,
        3600,
        JSON.stringify({ id: identityId, stellar_address, role, metadata, verified: false })
      );

      await client.query('COMMIT');

      logger.info(`Identity registered: ${stellarAddress} as ${role}`);
      
      return { 
        success: true, 
        identity_id: identityId,
        stellar_address,
        role,
        verified: false
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Identity registration error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getIdentity(stellarAddress) {
    const cached = await this.redis.get(`identity:${stellarAddress}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = 'SELECT * FROM identities WHERE stellar_address = $1';
    const result = await this.pool.query(query, [stellarAddress]);

    if (result.rows.length === 0) {
      return null;
    }

    const identity = result.rows[0];

    await this.redis.setex(
      `identity:${stellarAddress}`,
      3600,
      JSON.stringify(identity)
    );

    return identity;
  }

  async verifyIdentity(stellarAddress, signature, message = null) {
    try {
      const identity = await this.getIdentity(stellarAddress);
      
      if (!identity) {
        return { verified: false, reason: 'Identity not found' };
      }

      if (!signature) {
        return { verified: false, reason: 'Signature required' };
      }

      // Decode Stellar public key from G-address
      const publicKeyBytes = this.decodeStellarAddress(stellarAddress);
      
      // Decode signature from base64
      const signatureBytes = Buffer.from(signature, 'base64');
      
      // Prepare message to verify
      const messageBytes = message ? Buffer.from(message) : Buffer.from(stellarAddress);
      
      // Verify Ed25519 signature
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!isValid) {
        logger.warn(`Signature verification failed for ${stellarAddress}`);
        return { verified: false, reason: 'Invalid signature' };
      }

      // Update verification status in database
      await this.updateVerificationStatus(stellarAddress, true);

      logger.info(`Identity verified: ${stellarAddress}`);
      
      return { 
        verified: true, 
        identity: {
          id: identity.id,
          stellar_address: identity.stellar_address,
          role: identity.role,
          verified: true
        }
      };
    } catch (error) {
      logger.error('Identity verification error:', error);
      return { verified: false, reason: 'Verification error' };
    }
  }

  decodeStellarAddress(stellarAddress) {
    try {
      // Stellar addresses start with 'G' for public keys
      if (!stellarAddress.startsWith('G')) {
        throw new Error('Invalid Stellar address format');
      }

      // Decode base58
      const decoded = bs58.decode(stellarAddress);
      
      // Extract the 32-byte public key (skip version byte and checksum)
      if (decoded.length < 32) {
        throw new Error('Invalid decoded address length');
      }

      return decoded.slice(0, 32);
    } catch (error) {
      logger.error('Failed to decode Stellar address:', error);
      throw new Error('Invalid Stellar address');
    }
  }

  async updateVerificationStatus(stellarAddress, verified) {
    const query = `
      UPDATE identities 
      SET verified = $2, updated_at = NOW()
      WHERE stellar_address = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [stellarAddress, verified]);
    
    await this.redis.del(`identity:${stellarAddress}`);

    return result.rows[0];
  }

  async updateRole(stellarAddress, newRole) {
    const query = `
      UPDATE identities 
      SET role = $2, updated_at = NOW()
      WHERE stellar_address = $1
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [stellarAddress, newRole]);
    
    await this.redis.del(`identity:${stellarAddress}`);

    return result.rows[0];
  }

  async getIdentityByRole(role, limit = 100) {
    const query = `
      SELECT * FROM identities 
      WHERE role = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [role, limit]);
    return result.rows;
  }

  async shutdown() {
    if (this.pool) {
      await this.pool.end();
      logger.info('Identity service PostgreSQL connection closed');
    }
    
    if (this.redis) {
      await this.redis.quit();
      logger.info('Identity service Redis connection closed');
    }
  }
}
