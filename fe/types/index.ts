/**
 * Shared TypeScript interfaces for the football-field management frontend.
 * These types should mirror DTOs returned by the backend API.
 */

// ---------- Enums ----------

export enum UserRole {
  CUSTOMER = "CUSTOMER",
  STAFF = "STAFF",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED",
}

// Must match backend's FieldType enum: FIVE / SEVEN / ELEVEN.
// Old `*_A_SIDE` names kept as aliases pointing at the BE string values so
// existing references stay source-compatible.
export enum FieldType {
  FIVE = "FIVE",
  SEVEN = "SEVEN",
  ELEVEN = "ELEVEN",
  FIVE_A_SIDE = "FIVE",
  SEVEN_A_SIDE = "SEVEN",
  ELEVEN_A_SIDE = "ELEVEN",
}

// Must match backend's FieldStatus enum: AVAILABLE / MAINTENANCE / CLOSED.
// Old `ACTIVE`/`INACTIVE` names kept as aliases to BE values.
export enum FieldStatus {
  AVAILABLE = "AVAILABLE",
  MAINTENANCE = "MAINTENANCE",
  CLOSED = "CLOSED",
  ACTIVE = "AVAILABLE",
  INACTIVE = "CLOSED",
}

// Must match backend's BookingStatus enum exactly — BE rejects unknown values
// at the ValidationPipe layer (status query/body params).
export enum BookingStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRMED = "CONFIRMED",
  CHECKED_IN = "CHECKED_IN",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
  /**
   * Alias kept for source-compat with existing components that reference
   * `BookingStatus.PENDING`. Same underlying string value as PENDING_PAYMENT
   * so equality checks still work without rewriting every call site.
   */
  PENDING = "PENDING_PAYMENT",
  /**
   * FE-only legacy value. BE does not currently emit NO_SHOW, but several
   * label maps reference it. Kept so those `[BookingStatus.NO_SHOW]: ...`
   * entries remain valid type-wise; they will simply never match runtime data.
   */
  NO_SHOW = "NO_SHOW",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  FAILED = "FAILED",
}

export enum PaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  E_WALLET = "E_WALLET",
  VNPAY = "VNPAY",
  MOMO = "MOMO",
}

export enum PromotionType {
  PERCENT = "PERCENT",
  FIXED = "FIXED",
}

export enum DayOfWeek {
  MONDAY = "MONDAY",
  TUESDAY = "TUESDAY",
  WEDNESDAY = "WEDNESDAY",
  THURSDAY = "THURSDAY",
  FRIDAY = "FRIDAY",
  SATURDAY = "SATURDAY",
  SUNDAY = "SUNDAY",
}

// ---------- Common ----------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ---------- User ----------

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

// ---------- Field ----------

// Image record returned by BE — `field_images` row.
export interface FieldImage {
  id: string;
  fieldId?: string;
  imageUrl: string;
  isPrimary: boolean;
}

export interface Field {
  id: string;
  name: string;
  type: FieldType;
  description?: string;
  imageUrl?: string;
  // BE returns FieldImage[] but older code may pass string[]. Accept both.
  images?: FieldImage[] | string[];
  status: FieldStatus;
  basePrice?: number;
  capacity?: number;
  amenities?: string[];
  address?: string;
  surface?: string;
  openTime?: string;
  closeTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldAvailabilitySlot {
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  available: boolean;
  price?: number;
  bookingId?: string;
}

export interface FieldAvailability {
  fieldId: string;
  date: string; // yyyy-MM-dd
  slots: FieldAvailabilitySlot[];
}

// ---------- Price ----------

export interface Price {
  id: string;
  fieldId: string;
  dayOfWeek?: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  pricePerHour: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Service (extra services offered with a booking) ----------

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------- Booking ----------

export interface BookingSlot {
  id: string;
  bookingId: string;
  fieldId: string;
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  pricePerHour: number;
  subtotal: number;
}

export interface BookingService {
  id: string;
  bookingId: string;
  serviceId: string;
  service?: Service;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Mirrors BE Booking entity. Numeric columns (totalPrice, depositAmount, ...)
// come back from PostgreSQL as decimal *strings* — call sites must
// `Number(...)` them before arithmetic. The legacy aliases (`code`,
// `totalAmount`, `finalAmount`) are kept as optional to ease the
// transition; new code should prefer the canonical names.
export interface Booking {
  id: string;
  bookingCode: string;
  customerId: string;
  customer?: User;
  fieldId: string;
  field?: Field;
  bookingDate: string;       // 'YYYY-MM-DD'
  startTime: string;         // 'HH:mm:ss' or 'HH:mm'
  endTime: string;
  totalHours: number | string;
  fieldPrice: number | string;
  servicePrice: number | string;
  discountAmount: number | string;
  totalPrice: number | string;
  depositAmount: number | string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  promotionId?: string | null;
  promotion?: Promotion | null;
  note?: string | null;
  confirmedBy?: string | null;
  slots?: BookingSlot[];
  services?: BookingService[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;

  // ---- Legacy aliases kept for source-compat (avoid touching every UI) ----
  /** @deprecated use `bookingCode` */ code?: string;
  /** @deprecated use `totalPrice` */ totalAmount?: number;
  /** @deprecated use `totalPrice` (after discount it's already the final) */ finalAmount?: number;
  /** @deprecated use `note` */ notes?: string;
}

// Matches backend POST /bookings DTO exactly. The BE accepts ONE contiguous
// time range per booking, with times as 'HH:mm' strings (multiples of 30').
export interface CreateBookingPayload {
  fieldId: string;
  bookingDate: string;          // 'YYYY-MM-DD'
  startTime: string;            // 'HH:mm'
  endTime: string;              // 'HH:mm'
  services?: Array<{
    serviceId: string;
    quantity: number;
  }>;
  promotionCode?: string;
  note?: string;
}

// ---------- Payment ----------

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentPayload {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
}

// ---------- Promotion ----------

// Shape mirrors the backend `Promotion` entity exactly. Numeric columns
// (`discountValue`, `minOrder`) come back from PostgreSQL as decimal *strings*,
// so consumers should `Number(...)` them before arithmetic.
export interface Promotion {
  id: string;
  code: string;
  description?: string;
  discountType: PromotionType;
  discountValue: number | string;
  minOrder?: number | string;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---------- Review ----------

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  customer?: User;
  fieldId: string;
  field?: Field;
  rating: number; // 1..5
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Reports ----------

export interface RevenueReportItem {
  period: string; // e.g. yyyy-MM-dd or yyyy-MM
  revenue: number;
  bookingCount: number;
}

export interface FieldUsageReportItem {
  fieldId: string;
  fieldName: string;
  bookingCount: number;
  totalHours: number;
  revenue: number;
}
