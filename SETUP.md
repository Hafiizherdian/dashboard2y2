# Setup Instructions - Sales Dashboard

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb dashboard_db

# Run schema (copy from database/schema.sql)
psql dashboard_db < database/schema.sql
```

### 3. Environment Variables
Create `.env.local` file:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dashboard_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### 4. Run Application
```bash
npm run dev
```

## Access Points

- **Dashboard**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

## File Upload Format

Excel/CSV files harus memiliki kolom:
- Grand Total
- Minggu (Week)
- Tanggal (Date)
- Produk (Product)
- Customer
- Omzet (Nett)

## Troubleshooting

### Database Connection Issues
1. Pastikan PostgreSQL running
2. Check database name, user, password
3. Verify schema sudah di-run

### File Upload Issues
1. Check file format (.xlsx, .xls, .csv)
2. Verify column names match exactly
3. Ensure file tidak kosong

### Dependencies Issues
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
```

## API Endpoints

- `GET /api/sales` - Fetch sales data
- `POST /api/upload` - Upload Excel/CSV
- `GET /api/files` - List uploaded files
- `DELETE /api/files/[id]` - Delete file
- `GET /api/stats` - Database stats
