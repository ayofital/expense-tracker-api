import express from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import cron from 'node-cron';
import limiter from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import expensesRouter from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';
import reportsRouter from './routes/reports.js';
import budgetsRouter from './routes/budgets.js';
import recurringRouter from './routes/recurring.js';
import currencyRouter from './routes/currency.js';
import exportRouter from './routes/export.js';
import { processRecurringExpenses } from './jobs/recurringExpenseJob.js';

const app = express();

app.use(helmet());
app.use(limiter);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRoutes);
app.use('/api/reports', reportsRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/export', exportRouter);

app.use(errorHandler);

// Start cron job — runs at midnight on the 1st of every month for monthly
// and at midnight every day (handles daily/weekly/monthly/yearly by checking next_due_date)
cron.schedule('0 0 * * *', () => {
  processRecurringExpenses();
});

console.log('Cron job scheduled — recurring expenses checked daily at midnight');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});