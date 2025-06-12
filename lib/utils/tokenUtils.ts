import crypto from 'crypto'
import jwt from 'jsonwebtoken'

export function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

export function generateJWTToken(orderId: string, expiresIn: string = '7d'): string {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set')
    }

    return jwt.sign(
        {
            orderId,
            type: 'payment_link',
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn }
    )
}

export function verifyJWTToken(token: string): { orderId: string; type: string } | null {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is not set')
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any
        return {
            orderId: decoded.orderId,
            type: decoded.type
        }
    } catch (error) {
        console.error('JWT verification failed:', error)
        return null
    }
}
