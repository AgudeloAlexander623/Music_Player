// con este archivo se protege la ruta de /search para que solo usuarios autenticados puedan acceder a ella

import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split('')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify( token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

class AuthenticationError extends Error {
    constructor(message){
        super(message);
        this.name = "AuthenticationError";

        export default authenticateToken;
        
        
        if (Error.captureStackTrace){
            Error.captureStackTrace(this, AuthenticationError);
        } else if (this.stack){
            this.stack = new Error().stack;
        }else{
            this.stack = null;
        }
    }
}

export { AuthenticationError };
import { AuthenticationError } from '../middleware/authenticateToken.js';

export function handleAuthenticationError(err, req, res, next) {
    if (err instanceof AuthenticationError){
        return res.status(401).json({error: err.message});
    } else if (err instanceof jwt.JsonWebTokenError){
        return res.status(401).json({error: 'Invalid token'});
    }else {
        next(err);
    }
}
