import jwt from 'jsonwebtoken';
import bcyptjs  from 'bcryptjs';
import mysql from 'mysql2/promise';


export const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});


export const registerUser = async (req, res) => {
    // Validar que se reciban los campos necesarios
    const {username, email, password} = req.body;

    const hashedPassword = await bcryptjs.hash(password, 10);

};

export const loginUser = async (req, res) => {
    const {email, password} = req.body;

    // valida el usuario y contraseña
    const token = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expirenIn: "7d",

    });
    res.json({token});
};
