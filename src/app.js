import express from  'express';
import 'dotenv/config';
import expensesRouter from './routes/expenses.js';
import categoriesRoutes from './routes/categories.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'API is runnning'});
})

app.use('/api/expenses', expensesRouter);
app.use('/api/categories', categoriesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
