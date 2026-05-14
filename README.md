# Hệ thống Quản lý Sân bóng (HTTT QL)

Hệ thống thông tin quản lý sân bóng end-to-end gồm backend NestJS + PostgreSQL và frontend Next.js. Đáp ứng đủ 4 nghiệp vụ: đặt sân, quản lý sân & giá thuê, thanh toán & hóa đơn, dịch vụ kèm theo & báo cáo. Phân quyền 3 vai trò: **Admin / Nhân viên / Khách hàng**.

## Cấu trúc dự án

```
HTTTQL2/
├── be/                  # Backend NestJS 11 + TypeORM + PostgreSQL
│   └── src/
│       ├── common/      # guards, decorators, filters, interceptors, enums
│       ├── config/      # database, jwt, app config
│       ├── database/    # data-source, migrations, seeds
│       └── modules/     # auth, users, fields, prices, services, bookings, promotions, payments, reviews, reports
└── fe/                  # Frontend Next.js 16 (App Router) + Tailwind v4 + shadcn/ui
    ├── app/
    │   ├── (public)/    # /, /login, /register, /fields
    │   ├── (customer)/  # /bookings, /profile
    │   ├── (staff)/     # /staff/dashboard, /staff/bookings, /staff/check-in, /staff/pos, /staff/schedule
    │   └── (admin)/     # /admin/dashboard, /admin/fields, /admin/prices, /admin/services, /admin/users, /admin/promotions, /admin/reports
    ├── components/      # ui (shadcn), booking, customer, staff, admin, layout
    └── lib/             # api, store (zustand), validators (zod), utils
```

Plan thiết kế đầy đủ: `~/.claude/plans/thi-t-k-cho-t-i-greedy-pascal.md`.

## Yêu cầu môi trường

- Node.js 20+
- PostgreSQL 16+ (chạy local trên `localhost:5432`)
- npm

## Cài đặt & chạy

### 1. Database

```bash
# Tạo DB (nếu chưa có)
createdb soccer_db -h localhost -U postgres
# hoặc: psql -U postgres -c "CREATE DATABASE soccer_db;"
```

### 2. Backend

```bash
cd be
npm install
cp .env.example .env          # đã có sẵn .env mặc định cho dev

# Apply schema
npm run migration:run

# Seed dữ liệu mẫu (admin/staff/customer + 4 sân + 12 prices + 6 services + 2 promotions)
npm run seed

# Run dev
npm run start:dev             # http://localhost:3001/api/v1
# Swagger: http://localhost:3001/docs
```

### 3. Frontend

```bash
cd fe
npm install
# .env.local đã có NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
npm run dev                   # http://localhost:3000
```

> Nếu port 3000 bị chiếm, Next sẽ tự chuyển sang 3001/3002. Khi đó, cập nhật `CORS_ORIGIN` trong `be/.env` rồi restart BE.

## Tài khoản seed

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@soccer.local` | `admin123` |
| Nhân viên | `staff@soccer.local` | `staff123` |
| Khách hàng | `customer@soccer.local` | `customer123` |

## Kiến trúc & nghiệp vụ then chốt

- **Chống double-booking**: bảng `booking_slots` có UNIQUE composite `(field_id, slot_date, slot_start)`. `BookingsService.create` insert slots trong transaction → PostgreSQL raise `23505` khi trùng → trả 409 với message tiếng Việt.
- **Auto-confirm**: khi `payCash` đạt mức cọc, booking tự chuyển từ `PENDING_PAYMENT` → `CONFIRMED`, `payment_status` → `DEPOSITED`.
- **Pricing**: chia booking thành slot 30 phút, lookup `prices` theo `dayType` (WEEKDAY/WEEKEND), cộng dồn `pricePerHour / 2` cho mỗi slot.
- **Mã booking**: `BK` + `yyyymmdd` + 3-digit sequence (`BK20260515001`).
- **Đặt cọc**: 30% × `total_price` (làm tròn), customer chỉ hủy được khi còn hơn 24h trước giờ đá.
- **VNPay**: hỗ trợ cả mock (nếu thiếu env) và sandbox thực (HMAC-SHA512).

## Smoke test (đã pass)

| # | Bước | Kết quả |
|---|---|---|
| 1 | `GET /health` | 200 OK |
| 2 | Login admin/staff/customer | accessToken + refreshToken |
| 3 | `GET /fields` | List 4 sân kèm prices + images |
| 4 | `GET /fields/:id/availability?date=tomorrow` | 34 slots 30 phút |
| 5 | Customer `POST /bookings` (18:00–19:30 Sân B2) | `BK20260515001`, giá 525k, cọc 157.5k |
| 6 | Customer đặt đè cùng slot | **HTTP 409** "Khung giờ vừa bị người khác đặt..." |
| 7 | Availability sau khi đặt | 3 slots 18:00/18:30/19:00 → `available: false` |
| 8 | Staff `POST /payments/cash` (DEPOSIT 157.5k) | Payment SUCCESS, booking auto-confirm |
| 9 | `GET /reports/revenue?groupBy=day` | tổng 157.5k với series theo ngày |
| 10 | Customer gọi `/users` (Admin only) | **HTTP 403** "Required roles: ADMIN" |

## Mở rộng

- Thêm hỗ trợ HOLIDAY trong `prices.day_type` (cần bảng `holidays` riêng).
- Hoàn thiện xuất Excel cho báo cáo doanh thu.
- Push notification (email/SMS) khi đơn được xác nhận / từ chối.
- Refresh token rotation + blacklist.

## Tài liệu môn HTTT Quản lý

Plan thiết kế (`~/.claude/plans/thi-t-k-cho-t-i-greedy-pascal.md`) chứa đủ:
- Bối cảnh & yêu cầu
- Use Case diagram + đặc tả 24 use case
- ERD + thiết kế 11 bảng với khóa, ràng buộc, index
- ~50 REST API endpoints (phân theo role)
- Wireframe 5 màn hình trọng tâm
- Quy tắc nghiệp vụ + kịch bản kiểm thử
# htttql-d22
