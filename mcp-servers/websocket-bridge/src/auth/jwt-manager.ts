/**
 * JWT authentication manager
 */

import jwt from 'jsonwebtoken';

export interface JwtPayload {
  initiativeId: string;
  iat?: number;
  exp?: number;
}

export class JwtManager {
  private secret: string;

  constructor(secret: string) {
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    this.secret = secret;
  }

  /**
   * Verify JWT token and return payload
   */
  verify(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, this.secret) as JwtPayload;
      if (!payload.initiativeId) {
        throw new Error('Token missing initiativeId');
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Invalid token: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Generate a new token (for testing/development)
   */
  generate(initiativeId: string, expiresIn: string = '24h'): string {
    return jwt.sign({ initiativeId }, this.secret, { expiresIn } as jwt.SignOptions);
  }
}
