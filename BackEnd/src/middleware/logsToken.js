// este archivo monitorea los tokens de los usuarios para registrar su actividad en la base de datos

import jwt from 'jsonwebtoken';
import { AuthenticationError } from './authenticateToken.js';
import { UserActivity } from '../models/UserActivity.js';

const logsToken = async (res, req, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return next(new AuthenticationError('Token no proporcionado'));

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.id;

        // Registrar la actividad del usuario en la base de datos
        await UserActivity.create({
            userId,
            activity: `${req.method} ${req.originalUrl}`,
            timestamp: new Date(),
        });
    } catch (error) {
        return next(new AuthenticationError('Token inválido'));
    }

    if (next) next();
    
    // 
    for (let key in req.body){
        if (typeof req.body[key] === 'string' && req.body[key].length > 100 ) {
            req.body[key] = '[DATA REDACTED]';
        }else if (typeof req.body[key] === 'object' && req.body[key] !== null) {
            for (let subKey in req.body[key]){
                if (typeof req.body[key][subKey] === 'string' && req.body[key][subKey].length > 100) {
                    req.body[key][subKey] = '[DATA REDACTED]';
                }
            }
        } else if (Array.isArray(req.body[key])){
            req.body[key] = req.body[key].map((item) => {
                if (typeof item === 'string' && item.length > 100) {
                    return '[DATA REDACTED]';
                }
                return item;
            });
        }
    }

    console.log(`[${new Date().toISOString()}] User ${userId} accessed ${req.method} ${req.originalUrl} with body:`, req.body);

    return;
}