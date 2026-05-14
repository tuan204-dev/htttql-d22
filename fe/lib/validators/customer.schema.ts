import { z } from "zod";

/**
 * Vietnamese phone number: must start with 0 or +84 and contain 9-10 digits after.
 */
const VN_PHONE_REGEX = /^(0|\+84)[0-9]{9,10}$/;

/**
 * Schema for updating profile (PATCH /users/:id self-allowed fields).
 */
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .max(100, "Họ tên không được vượt quá 100 ký tự"),
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại")
    .regex(VN_PHONE_REGEX, "Số điện thoại không hợp lệ (VD: 0901234567)"),
  avatarUrl: z
    .string()
    .url("Đường dẫn ảnh đại diện không hợp lệ")
    .optional()
    .or(z.literal("")),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;

/**
 * Schema for changing password (PATCH /users/me/password).
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
      .max(50, "Mật khẩu mới không được vượt quá 50 ký tự"),
    confirmNewPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

/**
 * Schema for creating a review (POST /reviews).
 */
export const reviewSchema = z.object({
  rating: z
    .number({ message: "Vui lòng chọn số sao đánh giá" })
    .int("Số sao phải là số nguyên")
    .min(1, "Số sao tối thiểu là 1")
    .max(5, "Số sao tối đa là 5"),
  comment: z
    .string()
    .max(500, "Nhận xét không được vượt quá 500 ký tự")
    .optional()
    .or(z.literal("")),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
