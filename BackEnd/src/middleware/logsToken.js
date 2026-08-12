// Este archivo monitorea los tokens de los usuarios para registrar su actividad
// en el log (y en la base de datos si el modelo UserActivity existe).

import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

const MAX_BODY_LOG_LENGTH = 100;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Crea una copia del body con los strings largos redactados.
// No muta req.body: los controllers reciben los datos originales.
const redactBody = (value, depth = 0) => {
    if (depth > 5) return '[DEPTH LIMIT]';
    if (typeof value === 'string') return value.length > MAX_BODY_LOG_LENGTH ? '[DATA REDACTED]' : value;
    if (Array.isArray(value)) return value.map((item) => redactBody(item, depth + 1));
    if (isPlainObject(value)) {
    const copy = {};
    for (const key of Object.keys(value)) {
        copy[key] = redactBody(value[key], depth + 1);
    }
    return copy;
    }
    return value;
};

// Persiste la actividad si el modelo y la tabla existen; si no, solo queda en el log.
const recordActivity = async (userId, req) => {
    try {
        const { UserActivity } = await import('../models/UserActivity.js');
        await UserActivity.create({
        userId,
        activity: `${req.method} ${req.originalUrl}`,
        timestamp: new Date(),
    });
    } catch (error) {
        logger.warn('UserActivity no disponible; actividad solo registrada en el log', {
        error: error.message,
        });
    }
};

const logsToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.id) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        userId = decoded.id;
    } catch (error) {
        logger.warn('Token inválido en logsToken', { error: error.message });
        return res.status(401).json({ error: 'Token inválido' });
    }

    await recordActivity(userId, req);

    const safeBody = redactBody(req.body);
    logger.info(`User ${userId} accedió a ${req.method} ${req.originalUrl}`, { body: safeBody });

    return next();
};

export default logsToken;