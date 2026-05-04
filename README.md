# Expense Tracker API
A production-ready REST API for personal expense tracking built with Node.js, Express, and MySQL.


# Features
- JWT authentication with bcrypt password hashing
- Full CRUD for expenses and categories
- Search, filtering, sorting and pagination
- Budget limits with real-time spending alerts
- Recurring expenses with cron job scheduling
- Multi-currency support with live exchange rates
- CSV and PDF export with filter support
- SQL reporting: monthly summaries, category breakdowns, spending overview

# Tech stack
Node.js · Express · MySQL · JWT · bcrypt · node-cron · pdfkit

# API endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get JWT |
| GET | /api/expenses | Get expenses (search, filter, paginate) |
| POST | /api/expenses | Create expense with currency conversion |
| GET | /api/reports/monthly | Monthly spending summary |
| GET | /api/reports/by-category | Spending by category |
| GET | /api/reports/overview | Overall statistics |
| POST | /api/budgets | Set budget for a category |
| GET | /api/budgets/status | Budget status overview |
| POST | /api/recurring | Create recurring expense |
| GET | /api/currency/rates | Live exchange rates |
| GET | /api/export/csv | Export expenses as CSV |
| GET | /api/export/pdf | Export expenses as PDF |

# Local setup
bash
git clone https://github.com/ayofital/expense-tracker-api
cd expense-tracker-api
npm install
cp .env.example .env
# fill in your .env values
npm run dev
