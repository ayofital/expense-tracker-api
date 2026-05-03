import PDFDocument from 'pdfkit';
import pool from '../config/db.js';
import { buildExpenseQuery } from '../utils/expenseQueryBuilder.js';

// Helper — escape a value for safe CSV inclusion
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Shared query — fetch filtered expenses for export
const fetchExpensesForExport = async (userId, query) => {
  const { whereClause, params } = buildExpenseQuery(userId, query);

  const [rows] = await pool.query(`
    SELECT
      e.id,
      e.title,
      e.amount,
      e.currency,
      e.amount_base,
      e.date,
      e.notes,
      e.created_at,
      c.name AS category
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    WHERE ${whereClause}
    ORDER BY e.date DESC
  `, params);

  return rows;
};

// GET /api/export/csv
export const exportCSV = async (req, res, next) => {
  try {
    const expenses = await fetchExpensesForExport(req.user.id, req.query);
    const date     = new Date().toISOString().split('T')[0];

    // Set download headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${date}.csv"`);

    // Build CSV headers
    const headers = [
      'ID', 'Date', 'Title', 'Amount', 'Currency',
      'Amount (Base)', 'Category', 'Notes',
    ];

    // Build CSV rows — escape every value
    const rows = expenses.map(e => [
      escapeCSV(e.id),
      escapeCSV(e.date),
      escapeCSV(e.title),
      escapeCSV(e.amount),
      escapeCSV(e.currency || 'NGN'),
      escapeCSV(e.amount_base || e.amount),
      escapeCSV(e.category   || ''),
      escapeCSV(e.notes      || ''),
    ].join(','));

    // Combine header + rows into final CSV string
    const csv = [headers.join(','), ...rows].join('\n');

    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// GET /api/export/pdf
export const exportPDF = async (req, res, next) => {
  try {
    const expenses = await fetchExpensesForExport(req.user.id, req.query);
    const date     = new Date().toISOString().split('T')[0];

    // Get user email for report header
    const [userRows] = await pool.query(
      'SELECT email, base_currency FROM users WHERE id = ?', [req.user.id]
    );
    const user = userRows[0];

    // Calculate totals for summary section
    const totalBase = expenses.reduce(
      (sum, e) => sum + parseFloat(e.amount_base || e.amount), 0
    );

    // Set download headers before creating document
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${date}.pdf"`);

    // Create PDF document and pipe directly to response
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ── Title section ──
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Expense Report', { align: 'center' });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Account: ${user.email}`, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleDateString('en-GB', { dateStyle: 'long' })}`, { align: 'center' })
      .text(`Total expenses: ${expenses.length}`, { align: 'center' })
      .text(`Total spent: ${user.base_currency} ${totalBase.toFixed(2)}`, { align: 'center' });

    doc.moveDown();

    // ── Divider line ──
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#cccccc')
      .stroke();

    doc.moveDown(0.5);

    // ── Column headers ──
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#000000');

    const colX = { date: 50, title: 120, amount: 310, currency: 375, category: 430 };

    doc.text('Date',     colX.date,     doc.y, { continued: false });
    const headerY = doc.y - 12;
    doc.text('Date',     colX.date,     headerY);
    doc.text('Title',    colX.title,    headerY);
    doc.text('Amount',   colX.amount,   headerY);
    doc.text('Currency', colX.currency, headerY);
    doc.text('Category', colX.category, headerY);

    doc.moveDown(0.3);

    // ── Header underline ──
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#000000')
      .stroke();

    doc.moveDown(0.3);

    // ── Expense rows ──
    doc.fontSize(9).font('Helvetica').fillColor('#000000');

    expenses.forEach((expense, index) => {
      // Alternate row background for readability
      if (index % 2 === 0) {
        doc
          .rect(50, doc.y - 2, 495, 16)
          .fillColor('#f9f9f9')
          .fill();
        doc.fillColor('#000000');
      }

      const rowY = doc.y;
      const title = expense.title.length > 35
        ? expense.title.substring(0, 35) + '...'
        : expense.title;

      doc.text(String(expense.date),              colX.date,     rowY);
      doc.text(title,                              colX.title,    rowY);
      doc.text(parseFloat(expense.amount).toFixed(2), colX.amount, rowY);
      doc.text(expense.currency || 'NGN',          colX.currency, rowY);
      doc.text(expense.category || '—',            colX.category, rowY);

      doc.moveDown(0.6);

      // Add new page if near bottom
      if (doc.y > 700) {
        doc.addPage();
        doc.fontSize(9).font('Helvetica').fillColor('#000000');
      }
    });

    // ── Summary footer ──
    doc.moveDown();
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor('#cccccc')
      .stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Total: ${user.base_currency} ${totalBase.toFixed(2)}`, { align: 'right' });

    // Finalise — must call end() to complete the stream
    doc.end();

  } catch (err) {
    next(err);
  }
};