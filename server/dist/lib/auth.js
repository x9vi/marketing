import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from './prisma.js';
export function signToken(user) {
    return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}
export async function authenticate(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active)
        return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
        return null;
    const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
    };
    return { user, authUser, token: signToken(authUser) };
}
export function authRequired(req, res, next) {
    const token = req.cookies?.auth_token;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        req.user = jwt.verify(token, env.jwtSecret);
        return next();
    }
    catch {
        return res.status(401).json({ message: 'Invalid session' });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
}
