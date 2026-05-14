# Hệ thống Quản lý Sân bóng — Mô tả toàn diện

> Bài tập lớn môn Hệ thống Thông tin Quản lý. Hệ thống quản lý nghiệp vụ
> đặt sân bóng đá end-to-end gồm backend REST API (NestJS + PostgreSQL) và
> frontend web (Next.js 16, App Router).

---

## 1. Bối cảnh & mục tiêu

Một cụm sân bóng đá nhỏ – trung bình (4–10 sân) cần một hệ thống nghiệp vụ
thay thế quy trình thủ công (sổ tay, Zalo, gọi điện) để:

- Khách hàng tự **tra cứu khung giờ trống** và **đặt sân online** 24/7.
- Chủ sân/Nhân viên **vận hành tại quầy**: duyệt đơn, thu cọc, check-in,
  bán dịch vụ kèm theo (nước, áo, trọng tài), in hóa đơn.
- Quản trị viên **báo cáo doanh thu**, theo dõi KPI, quản lý sân, giá thuê
  theo khung giờ, nhân viên và chương trình khuyến mãi.

Hệ thống đáp ứng **4 nghiệp vụ chính** với **3 vai trò** (Admin / Nhân viên /
Khách hàng) — kiến trúc gọn, dễ mở rộng cho mô hình đa cụm sân sau này.

---

## 2. Actors & vai trò

| Vai trò | Quyền truy cập |
|---|---|
| **Guest** (chưa đăng nhập) | Xem trang chủ, danh sách sân, chi tiết sân, danh sách khuyến mãi, đăng ký, đăng nhập |
| **Customer** (Khách hàng) | + Đặt sân, thanh toán, theo dõi lịch sử, hủy đơn (≥24h), đánh giá sân, cập nhật hồ sơ |
| **Staff** (Nhân viên) | Dashboard, duyệt/từ chối đơn, check-in, hoàn thành, bán dịch vụ tại quầy (POS), thu tiền mặt, in hóa đơn |
| **Admin** | Toàn quyền Staff + CRUD sân/giá/dịch vụ/nhân viên/khuyến mãi + báo cáo |

Phân quyền thực hiện ở **2 tầng**: JWT guard + `RolesGuard` (BE) và
`ProtectedRoute` client-side (FE) — đảm bảo an toàn ngay cả khi API bị
gọi trực tiếp.

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────┐      HTTPS/JSON       ┌──────────────────────┐
│  Next.js 16 (FE)     │ ───── REST API ─────▶ │  NestJS 11 (BE)      │
│  Tailwind v4         │      Bearer JWT       │  TypeORM             │
│  shadcn/ui           │                       │  class-validator     │
│  zustand + Query     │ ◀───── envelope ───── │  Swagger /docs       │
└──────────────────────┘                       └──────────┬───────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────────┐
                                                │  PostgreSQL 16       │
                                                │  11 tables           │
                                                └──────────────────────┘
```

### 3.1 Stack chi tiết

**Backend** ([be/](be/))
- NestJS 11 (Express adapter)
- PostgreSQL 16 + TypeORM 0.3 (migrations + seeds)
- `@nestjs/jwt` + `passport-jwt` (access + refresh token)
- `class-validator` + `class-transformer` (ValidationPipe whitelist)
- `bcrypt` cho password hashing (10 rounds)
- `multer` cho upload ảnh sân (`/uploads/fields/...`)
- `@nestjs/swagger` — UI ở `/docs`, JSON ở `/docs-json`
- `@nestjs/throttler` (mặc định 100 req/phút/IP)

**Frontend** ([fe/](fe/))
- Next.js 16 App Router + Turbopack
- Tailwind CSS 4 + shadcn/ui (Radix UI primitives)
- `@tanstack/react-query` (cache + invalidation)
- `react-hook-form` + `zod` (form + schema validation)
- `zustand` + `persist` (auth state trong localStorage)
- `axios` (interceptor unwrap envelope, refresh-token single-flight)
- `recharts` (biểu đồ báo cáo)
- `date-fns`, `lucide-react`, `sonner` (toast)

### 3.2 Response envelope

Mọi response thành công của BE được wrap thành:

```json
{ "success": true, "data": <payload>, "timestamp": "ISO" }
```

Lỗi:
```json
{ "statusCode": 400, "message": "...", "error": "Bad Request",
  "timestamp": "ISO", "path": "/api/v1/..." }
```

FE axios interceptor tự unwrap `data` về payload phẳng cho consumer.

---

## 4. Sơ đồ Use Case (rút gọn)

```
                        ┌─── UC01. Xem danh sách sân
            ┌── Guest ──┼─── UC02. Tra cứu sân trống
            │           ├─── UC03. Đăng ký
            │           └─── UC04. Đăng nhập
            │
   Actors ──┼── Customer ─── UC05. Đặt sân
            │              ├─── UC06. Hủy đơn (>24h)
            │              ├─── UC07. Thêm dịch vụ
            │              ├─── UC08. Thanh toán cọc / đầy đủ
            │              ├─── UC09. Lịch sử đặt sân
            │              ├─── UC10. Đánh giá sân (sau COMPLETED)
            │              └─── UC11. Cập nhật hồ sơ / đổi mật khẩu
            │
            ├── Staff   ─── UC12. Duyệt / từ chối đơn
            │            ├─── UC13. Check-in / Hoàn thành
            │            ├─── UC14. Bán dịch vụ tại POS
            │            ├─── UC15. Thu tiền & in hóa đơn
            │            └─── UC16. Xem lịch hôm nay / lịch sân
            │
            └── Admin   ─── UC17. CRUD sân + ảnh
                         ├─── UC18. CRUD bảng giá theo khung giờ
                         ├─── UC19. CRUD dịch vụ
                         ├─── UC20. CRUD nhân viên & khách
                         ├─── UC21. CRUD khuyến mãi
                         ├─── UC22. Báo cáo doanh thu
                         └─── UC23. Báo cáo đặt sân / lấp đầy
```

---

## 5. Cơ sở dữ liệu — 11 bảng

```
users ─┬──< bookings >── fields ──< field_images
       │     │   │           │
       │     │   │           └──< prices
       │     │   ├──< booking_slots          (UNIQUE chống double-booking)
       │     │   ├──< booking_services >── services
       │     │   └──< payments
       │     │
       │     └──< reviews                    (UNIQUE per booking)
       │
       │  promotions ───< bookings (FK promotion_id)
```

### 5.1 Tóm tắt bảng

| Bảng | Mục đích | Trường chính |
|---|---|---|
| `users` | Tài khoản đa role | email, phone, role enum, isActive |
| `fields` | Sân bóng | name, type (FIVE/SEVEN/ELEVEN), surface (GRASS/ARTIFICIAL), status, open/closeTime |
| `field_images` | Ảnh sân (1-N) | imageUrl, isPrimary |
| `prices` | Bảng giá theo khung giờ | dayType (WEEKDAY/WEEKEND/HOLIDAY), startTime, endTime, pricePerHour. **UNIQUE(fieldId, dayType, startTime)** |
| `services` | Dịch vụ kèm | name, category (DRINK/EQUIPMENT/REFEREE/OTHER), unitPrice, stock |
| `bookings` | Đơn đặt sân | bookingCode `BK + yyyymmdd + 3số`, status, paymentStatus, totalPrice, depositAmount |
| `booking_slots` | Khung giờ chiếm (30 phút/slot) | slotDate, slotStart, slotEnd. **UNIQUE(fieldId, slotDate, slotStart)** ⇒ chặn double-booking ở tầng DB |
| `booking_services` | Dịch vụ trong đơn | quantity, unitPrice snapshot |
| `payments` | Giao dịch | amount, method (CASH/BANK_TRANSFER/VNPAY/MOMO), type (DEPOSIT/FULL_PAYMENT/REFUND), status |
| `promotions` | Mã giảm giá | code, discountType (PERCENT/FIXED), discountValue, minOrder, usageLimit |
| `reviews` | Đánh giá sân | rating 1-5, comment, **UNIQUE(bookingId)** |

### 5.2 Các enum quan trọng

```
BookingStatus     PENDING_PAYMENT ➝ CONFIRMED ➝ CHECKED_IN ➝ COMPLETED
                                          ↘ CANCELLED / REJECTED
PaymentStatus     UNPAID ➝ DEPOSITED ➝ FULLY_PAID / REFUNDED
TxStatus          PENDING ➝ SUCCESS / FAILED          (mỗi payment record)
PaymentMethod     CASH | BANK_TRANSFER | VNPAY | MOMO
PaymentType       DEPOSIT | FULL_PAYMENT | REFUND
```

---

## 6. Sơ đồ trạng thái đơn đặt sân

```
                      ┌────────────────┐
   POST /bookings  →  │PENDING_PAYMENT │
                      └──────┬─────────┘
            cọc 30%   ─────────┐
                               ▼
                      ┌────────────────┐  staff confirm
                      │   CONFIRMED    │ ← (auto khi thu đủ cọc)
                      └──────┬─────────┘
                             │ staff check-in
                             ▼
                      ┌────────────────┐
                      │   CHECKED_IN   │
                      └──────┬─────────┘
                             │ staff complete
                             ▼
                      ┌────────────────┐
                      │   COMPLETED    │ → customer có thể đánh giá
                      └────────────────┘

       PENDING_PAYMENT / CONFIRMED ─── customer cancel (>24h) ──▶ CANCELLED
                                                                 (slots release)
       PENDING_PAYMENT             ─── staff reject (kèm lý do) ─▶ REJECTED
```

---

## 7. Quy tắc nghiệp vụ then chốt

1. **Chống double-booking** — `booking_slots` có UNIQUE composite `(field_id, slot_date, slot_start)`.  `BookingsService.create` insert slots TRƯỚC trong transaction; nếu vi phạm UNIQUE (PostgreSQL code `23505`) ⇒ throw `ConflictException` ⇒ HTTP 409.

2. **Tính giá** — chia booking thành các slot 30 phút, mỗi slot lookup bảng `prices` theo `dayType` (Thứ 7/CN = WEEKEND, còn lại = WEEKDAY) và `startTime ≤ slot < endTime`. Cộng dồn `pricePerHour / 2` mỗi slot.

3. **Đặt cọc 30%** — `depositAmount = round(totalPrice * 0.3)`. Khi `payments` đạt mức cọc, `paymentStatus = DEPOSITED` và booking tự chuyển `PENDING_PAYMENT → CONFIRMED`.

4. **Mã booking** — `BK + yyyymmdd + 3-digit sequence trong ngày`, UNIQUE. Ví dụ `BK20260515001`.

5. **Hủy đơn** — customer chỉ được hủy khi `booking_date + start_time − now() > 24h` và status ∈ {`PENDING_PAYMENT`, `CONFIRMED`}. Khi hủy/reject, slots bị xóa để giải phóng giờ.

6. **Áp khuyến mãi** — Validate qua `POST /promotions/validate` với `{code, amount}`. BE trả `{valid, discountAmount, reason?}`. Khi đặt thành công, `usedCount` của promo +1 (atomic). Nếu hủy/reject thì -1.

7. **Cọc → cocfirm tự động** — Khi staff `POST /payments/cash` đủ `depositAmount`, BE tự đổi `bookings.status = CONFIRMED`, `paymentStatus = DEPOSITED`.

---

## 8. API endpoints — tổng quan (~50 endpoint)

Tiền tố: `/api/v1`. Auth qua header `Authorization: Bearer <JWT>`.

### 8.1 Auth
- `POST /auth/register` — đăng ký CUSTOMER → trả token + user
- `POST /auth/login` — đăng nhập, trả `{user, accessToken, refreshToken}`
- `POST /auth/refresh` — đổi refresh token lấy access token mới
- `POST /auth/logout` — client-side (chỉ xóa token)
- `GET  /auth/me` — thông tin user hiện tại

### 8.2 Users (Admin)
- `GET /users?role=&search=&page=&limit=`
- `POST /users` (Admin tạo staff/khách)
- `PATCH /users/:id` (Admin / Self)
- `DELETE /users/:id` (soft delete `isActive=false`)
- `PATCH /users/me/password`

### 8.3 Fields
- `GET /fields?type=&status=&search=&page=&limit=` *(public)*
- `GET /fields/:id` — kèm images, prices, averageRating *(public)*
- `GET /fields/:id/availability?date=YYYY-MM-DD` — trả 34 slot 30 phút *(public)*
- `POST/PATCH/DELETE /fields/:id` (Admin)
- `POST /fields/:id/images` (Admin, multipart)
- `DELETE /fields/:id/images/:imgId` (Admin)

### 8.4 Prices
- `GET /fields/:fieldId/prices` *(public)*
- `POST /fields/:fieldId/prices`, `PATCH/DELETE /prices/:id` (Admin)

### 8.5 Services
- `GET /services` *(public)*
- `POST/PATCH/DELETE /services/:id` (Admin)

### 8.6 Bookings (core)
- `POST /bookings` (Customer) — body `{fieldId, bookingDate, startTime, endTime, services?, promotionCode?}`
- `GET /bookings?status=&fieldId=&fromDate=&toDate=&page=&limit=` (Customer thấy của mình, Staff/Admin thấy tất cả)
- `GET /bookings/:id`
- `PATCH /bookings/:id/confirm | /reject | /cancel | /check-in | /complete`
- `POST /bookings/:id/services` (thêm dịch vụ phát sinh)
- `GET /bookings/:id/invoice` — JSON hóa đơn

### 8.7 Payments
- `POST /payments/cash` (Staff) — `{bookingId, amount, type}`
- `POST /payments/vnpay/create` (Customer) — tạo URL VNPay (mock hoặc thật)
- `GET /payments/vnpay/return` — callback
- `POST /payments/vnpay/ipn` — webhook
- `GET /bookings/:id/payments`

### 8.8 Promotions
- `GET /promotions` *(public, chỉ trả active)*
- `POST /promotions/validate` `{code, amount}`
- `POST/PATCH/DELETE /promotions/:id` (Admin)

### 8.9 Reviews
- `POST /reviews` (Customer, chỉ với booking COMPLETED của mình)
- `GET /fields/:fieldId/reviews` *(public)*
- `DELETE /reviews/:id` (Owner/Admin)

### 8.10 Reports (Admin)
- `GET /reports/summary?from=&to=` → totalRevenue, totalBookings, totalCustomers, averageBookingValue, totalFields
- `GET /reports/revenue?from=&to=&groupBy=day|month|field`
- `GET /reports/bookings?from=&to=` → byStatus map + series
- `GET /reports/top-customers?limit=`
- `GET /reports/field-utilization?from=&to=`
- `GET /reports/services?from=&to=`

Swagger UI đầy đủ: `http://localhost:4001/docs`.

---

## 9. Cấu trúc trang FE

```
URL                                Route group     Role yêu cầu     Mô tả
─────────────────────────────────  ──────────────  ───────────────  ─────────────────────────
/                                  (public)        —                Landing + sân nổi bật
/fields                            (public)        —                Danh sách sân + filter
/fields/[id]                       (public)        —                Chi tiết + AvailabilityGrid + đặt
/promotions                        (public)        —                Card khuyến mãi, copy mã
/login                             (public)        —                Form đăng nhập
/register                          (public)        —                Form đăng ký

/bookings                          (customer)      authenticated    Tabs trạng thái, bảng đơn của tôi
/bookings/[id]                     (customer)      owner            Chi tiết + thanh toán + đánh giá
/profile                           (customer)      authenticated    2 tab: hồ sơ / đổi mật khẩu

/staff/dashboard                   (staff)         STAFF / ADMIN    KPI hôm nay + đơn cần duyệt
/staff/schedule                    (staff)         STAFF / ADMIN    Lịch sân theo ngày
/staff/bookings                    (staff)         STAFF / ADMIN    Bảng đơn + action theo status
/staff/check-in                    (staff)         STAFF / ADMIN    Tìm mã đơn → check-in
/staff/pos                         (staff)         STAFF / ADMIN    Bán dịch vụ tại quầy + in hóa đơn

/admin/dashboard                   (admin)         ADMIN            KPI tháng + biểu đồ + đơn pending
/admin/fields                      (admin)         ADMIN            CRUD sân + upload ảnh
/admin/prices                      (admin)         ADMIN            Bảng giá theo sân
/admin/services                    (admin)         ADMIN            CRUD dịch vụ
/admin/users                       (admin)         ADMIN            Tabs theo role + CRUD
/admin/promotions                  (admin)         ADMIN            CRUD mã khuyến mãi
/admin/reports                     (admin)         ADMIN            5 tab: doanh thu / đặt sân / KH / sân / dịch vụ
```

### 9.1 Component then chốt

| Component | Vai trò |
|---|---|
| [`AvailabilityGrid`](fe/components/booking/AvailabilityGrid.tsx) | Render lưới 30 phút từ 06:00–23:00, click chọn liền nhau, max 8 slot |
| [`ServicePicker`](fe/components/booking/ServicePicker.tsx) | Chọn dịch vụ kèm theo qty |
| [`BookingSummary`](fe/components/booking/BookingSummary.tsx) | Tổng tiền + cọc |
| [`ProtectedRoute`](fe/components/layout/ProtectedRoute.tsx) | Client guard, đợi hydrate xong rồi kiểm tra role |
| [`InvoicePrint`](fe/components/staff/InvoicePrint.tsx) | Hóa đơn 80mm printable cho POS |
| [`RevenueChart`](fe/components/admin/RevenueChart.tsx) | recharts Line/Bar cho báo cáo |

---

## 10. Bảo mật & best practice

- **Mật khẩu**: bcrypt 10 rounds, không bao giờ trả về client (entity có `@Exclude({ toPlainOnly: true })`).
- **JWT**: access token TTL 1 ngày, refresh token 7 ngày. Refresh token single-flight để tránh race.
- **CORS**: phản chiếu mọi Origin với credentials (`origin: (o, cb) => cb(null, true)`), allow `Authorization` header, max-age preflight 24h.
- **Validation**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` toàn cục — tự động strip field không khai báo trong DTO và 400 nếu có field lạ ⇒ chống mass-assignment.
- **Rate limit**: ThrottlerModule 100 req/phút.
- **SQL injection**: TypeORM parameterized queries.
- **RBAC**: `@Roles()` decorator + `RolesGuard`; FE thêm `ProtectedRoute` client.
- **Slot lock**: dựa hoàn toàn vào UNIQUE constraint (không cần SERIALIZABLE — đơn giản, throughput cao).

---

## 11. Dữ liệu mẫu

Sau khi `npm run seed && npm run seed:demo`, hệ thống có:

- **13 user**: 1 admin, 3 staff (`staff@`, `staff.linh@`, `staff.long@`), 9 customer (tên Việt, password `demo123`)
- **8 sân**: A1/A2/B1/B2 (cơ bản) + C1/C2/D1/D2 (demo), mỗi sân 3 ảnh từ picsum.photos
- **24 bảng giá**: 3 khung (WEEKDAY sáng/tối, WEEKEND cả ngày) × 8 sân
- **10 dịch vụ**: nước/áo/trọng tài/bia/cà phê/giày/băng cuốn
- **5 khuyến mãi**: `WELCOME10`, `SUMMER2026`, `STUDENT15`, `BIRTHDAY100`, `NEWUSER`
- **~33 booking** trải [−30 → +7] ngày với 6 trạng thái khác nhau
- **~30 payment** mix CASH/BANK_TRANSFER/VNPAY
- **8 review** rating 3–5⭐

### Tài khoản demo

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `admin@soccer.local` | `admin123` | Admin |
| `staff@soccer.local` / `staff.linh@demo.local` | `staff123` | Staff |
| `customer@soccer.local` | `customer123` | Customer |
| `nguyen.van.an@demo.local` (+ 7 KH demo khác) | `demo123` | Customer |

---

## 12. Setup & chạy

### 12.1 Yêu cầu

- Node.js 20+
- PostgreSQL 16+ (localhost:5432)
- npm

### 12.2 Các bước

```bash
# 1. Database
createdb soccer_db -h localhost -U postgres

# 2. Backend
cd be
npm install
cp .env.example .env
npm run migration:run     # tạo schema
npm run seed              # dữ liệu cơ bản
npm run seed:demo         # dữ liệu demo phong phú
npm run start:dev         # http://localhost:4001/api/v1
                          # Swagger: http://localhost:4001/docs

# 3. Frontend (terminal khác)
cd fe
npm install
PORT=4000 npm run dev     # http://localhost:4000
```

### 12.3 Forward qua tunnel (cho test mobile / chia sẻ)

- VS Code → Ports panel → Forward port 4001 (BE) và 4000 (FE)
- Right-click port 4001 → **Port Visibility → Public** (không thì tunnel chặn CORS)
- Cập nhật `fe/.env.local`:
  ```
  NEXT_PUBLIC_API_URL=https://<your-tunnel>-4001.<region>.devtunnels.ms/api/v1
  PORT=4000
  ```

---

## 13. Đặc điểm nổi bật trong thiết kế

1. **Slot 30 phút + UNIQUE constraint**: đơn giản, gọn, không cần lock optimistic/pessimistic, không cần SERIALIZABLE — DB tự xử lý race condition.
2. **Snapshot giá tại thời điểm đặt**: `booking_services.unitPrice` lưu copy giá lúc đặt, nên admin sửa giá service sau không ảnh hưởng đơn cũ.
3. **Response envelope thống nhất**: BE luôn trả `{success, data, timestamp}`, FE axios interceptor unwrap về `data` ⇒ consumer không phải `.data.data`.
4. **Pagination cross-compat**: FE call `pageSize=10`, axios request interceptor tự rename thành `limit=10` để khớp BE DTO; response `{data, meta}` được normalize thành `{items, totalPages, ...}` cho consumer.
5. **Auto-confirm khi đủ cọc**: chỉ cần 1 lần thu cọc, booking tự chuyển trạng thái — không cần thao tác thủ công.
6. **Mock VNPay**: nếu không có VNPAY env, BE tự chuyển sang mock URL, vẫn full flow để demo.
7. **Idempotent seed**: cả 2 seed file đều check marker user trước khi insert ⇒ chạy lại nhiều lần an toàn.
8. **Vai trò Admin kế thừa Staff**: layout `(staff)` cho phép cả ADMIN + STAFF, không phải re-implement view staff cho admin.

---

## 14. Hạn chế & hướng mở rộng

| Hạn chế hiện tại | Giải pháp đề xuất |
|---|---|
| HOLIDAY chưa tự detect — fallback WEEKDAY/WEEKEND | Thêm bảng `holidays` + admin CRUD |
| VNPay mock — chưa integrate sandbox thật | Thêm webhook verify với hash secret |
| Chưa có notification (email/SMS) khi đơn được xác nhận | Tích hợp SendGrid / Twilio + queue |
| Refresh token không rotate | Lưu refresh token trong bảng + blacklist khi logout |
| Báo cáo "Xuất Excel" mới stub button | Dùng `xlsx` hoặc `exceljs` ở BE |
| Đa chi nhánh / đa cụm sân chưa hỗ trợ | Thêm entity `Branch`, FK ở `Field`, role `BranchManager` |
| Search FE chưa debounce | Thêm `useDebouncedValue` 300ms |
| Không có dark mode toggle trong UI dù theme đã có | Thêm `ThemeProvider` + button toggle |

---

## 15. File / tài liệu liên quan

- Plan thiết kế ban đầu (ERD + Use Case chi tiết): `~/.claude/plans/thi-t-k-cho-t-i-greedy-pascal.md`
- README ngắn: [README.md](README.md)
- Swagger JSON: `http://localhost:4001/docs-json`
- API runbook (curl examples): xem `README.md` mục "Smoke test"

---

## 16. Tổng kết một câu

> **Hệ thống Quản lý Sân bóng** là một SaaS web nhỏ – đầy đủ nghiệp vụ
> đặt sân – thanh toán – báo cáo, kiến trúc microservice-ready với BE
> NestJS + PostgreSQL và FE Next.js 16, phân quyền 3 vai trò, an toàn race
> condition bằng UNIQUE constraint ở DB, và sẵn dữ liệu demo phong phú để
> trình diễn ngay sau khi cài đặt.
