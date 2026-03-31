import express from  'express';
import 'dotenv/config';
import helmet from 'helmet';
import limiter from './middleware/rateLimiter.js';
import errorHandler  from './middleware/errorHandler.js';
import expensesRouter from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';

const app = express();

app.use(helmet());
app.use(limiter);
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'API is runnning'});
})


app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRoutes);

app.use(errorHandler)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
