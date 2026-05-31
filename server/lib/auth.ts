import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
import type { Role } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export function signToken(user: AuthUser) {
  return jwt.sign(user, env.jwtSecret as jwt.Secret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return { user, authUser, token: signToken(authUser) };
}

export type AuthedRequest = Request & { user?: AuthUser };

export function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid session' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}
