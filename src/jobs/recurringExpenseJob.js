import pool from '../config/db.js';

const INTERVAL_MAP = Object.freeze({
  daily:   '1 DAY',
  weekly:  '1 WEEK',
  monthly: '1 MONTH',
  yearly:  '1 YEAR',
});

// Processes a single recurring expense template
const processOne = async (recurring) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Idempotency check — has this already been generated today?
    const [existing] = await connection.query(
      `SELECT id FROM expenses
       WHERE recurring_expense_id = ? AND date = CURDATE()`,
      [recurring.id]
    );

    if (existing.length > 0) {
      // Already processed — skip silently
      await connection.rollback();
      return { skipped: true };
    }

    // Generate the actual expense record
    await connection.query(
      `INSERT INTO expenses
        (title, amount, category_id, date, notes, user_id, recurring_expense_id)
       VALUES (?, ?, ?, CURDATE(), ?, ?, ?)`,
      [
        recurring.title,
        recurring.amount,
        recurring.category_id || null,
        recurring.notes       || null,
        recurring.user_id,
        recurring.id,
      ]
    );

    // Advance next_due_date to the next occurrence
    const interval = INTERVAL_MAP[recurring.frequency];
    await connection.query(
      `UPDATE recurring_expenses
       SET next_due_date = DATE_ADD(next_due_date, INTERVAL ${interval}),
           last_run_date = CURDATE()
       WHERE id = ?`,
      [recurring.id]
    );

    await connection.commit();
    return { processed: true };

  } catch (err) {
    await connection.rollback();
    throw err; // re-throw so caller can log it
  } finally {
    connection.release();
  }
};

// Main job function — called by cron scheduler
export const processRecurringExpenses = async () => {
  console.log(`[${new Date().toISOString()}] Recurring expense job started`);

  let processed = 0;
  let skipped   = 0;
  let failed    = 0;

  try {
    // Find all active recurring expenses due today or overdue
    const [dueExpenses] = await pool.query(
      `SELECT * FROM recurring_expenses
       WHERE is_active = TRUE
         AND next_due_date <= CURDATE()
         AND (end_date IS NULL OR end_date >= CURDATE())`
    );

    console.log(`[RECURRING] Found ${dueExpenses.length} due recurring expenses`);

    // Process each one — for...of so we await properly
    for (const expense of dueExpenses) {
      try {
        const result = await processOne(expense);
        if (result.skipped) {
          skipped++;
          console.log(`[RECURRING] Skipped expense ${expense.id} — already generated`);
        } else {
          processed++;
          console.log(`[RECURRING] Processed expense ${expense.id} for user ${expense.user_id}`);
        }
      } catch (err) {
        failed++;
        // Log but continue — don't let one failure stop others
        console.error(`[RECURRING] Failed expense ${expense.id}:`, err.message);
      }
    }

  } catch (err) {
    console.error('[RECURRING] Job failed to fetch due expenses:', err.message);
  }

  console.log(
    `[${new Date().toISOString()}] Recurring job done — processed: ${processed}, skipped: ${skipped}, failed: ${failed}`
  );
};