import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { validationResult } from  'express-validator';

export const register = async (req, res, next ) =>
{
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const [existing] = await pool.query(
            `SELECT id FROM users WHERE email = ? `, [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: ' Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users (email, password) VALUES (?, ?)`,
            [email, hashedPassword]
        );

        const token = jwt.sign(
            { id: result.insertId, email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({ message: `User registered successfully`, token });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const [rows] = await pool.query(
            `SELECT * FROM users WHERE email = ?`, [email] 
        );

        if (rows.length ===0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user =  rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials '})
        }

        const token = jwt.sign(
            {id: user.id, email:user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ message: 'Login successful', token })
    } catch (err) {
        next(err)
    }
};