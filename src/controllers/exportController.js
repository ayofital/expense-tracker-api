import PDFDocument from 'pdfkit';
import pool from '../config/db.js';
import { buildExpenseQuery } from '../utils/expenseQueryBuilder.js';

//Helper - escape a value for safe CSV inclusion
const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

