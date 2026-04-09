import pool from '../config/db.js';

export const getCategories =  async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            `SELECT * FROM categories ORDER BY name ASC`
        );
        res.json(rows);
    } catch (err) {
        next(err);
    }
};
export const createCategory = async ( req, res, next) => {
    const { name } = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO categories (name) VALUES (?)`, [name.trim()]
        );
        res.status(201).json({ id: result.insertId, name: name.trim()});
    } catch (err){
        next(err);
    }
};