# Sales Dashboard - PostgreSQL Integration

Sales analysis dashboard dengan PostgreSQL database integration untuk upload Excel/CSV data penjualan.

## Features

- **Dashboard Analisis**: 6 tabs dengan comprehensive sales analysis
  - Ringkasan: Overview metrik utama
  - Perbandingan Mingguan: Week 1-52 comparison
  - Analisis Kuartal: Q1-Q4 target/actual/variance
  - L4W vs C4W: Last 4 Weeks vs Current 4 Weeks
  - Tahun ke Tahun: YoY growth analysis
  - Analisis: Internal/External text areas

- **Admin Upload**: Excel/CSV upload ke PostgreSQL
  - Drag & drop file upload
  - Real-time data processing
  - Database statistics
  - File management

- **Database**: PostgreSQL dengan schema lengkap
  - Sales records tracking
  - File upload management
  - User authentication (optional)

## Tech Stack

- **Frontend**: Next.js 16.1.1, TypeScript, TailwindCSS
- **Charts**: Recharts
- **Database**: PostgreSQL
- **File Processing**: XLSX, Formidable
- **Icons**: Lucide React

## Setup Instructions

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb dashboard_db

# Run schema
psql dashboard_db < database/schema.sql
```

### 2. Environment Variables

Create `.env.local`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dashboard_db
DB_USER=postgres
DB_PASSWORD=your_password

# Next.js
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) untuk dashboard dan [http://localhost:3000/admin](http://localhost:3000/admin) untuk admin panel.

## File Upload Format

Excel/CSV files harus memiliki kolom berikut:
- Grand Total
- Minggu (Week)
- Tanggal (Date)
- Produk (Product)
- Customer
- Omzet (Nett)

## API Endpoints

- `GET /api/sales` - Fetch sales data dengan filter
- `POST /api/upload` - Upload Excel/CSV file
- `GET /api/files` - Get uploaded files list
- `DELETE /api/files/[id]` - Delete file dan records
- `GET /api/stats` - Database statistics

## Database Schema

Lihat `database/schema.sql` untuk complete schema structure.

## Development

```bash
# Install dependencies
npm install

# Run development
npm run dev

# Build for production
npm run build

# Start production
npm start
```

## Deployment

1. Setup PostgreSQL database
2. Configure environment variables
3. Run database schema
4. Deploy aplikasi

## Notes

- Mock data sudah dihapus - semua data dari database
- Admin only access (authentication middleware pending)
- Real-time data processing
- Comprehensive error handling
