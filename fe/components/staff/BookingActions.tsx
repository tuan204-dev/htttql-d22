"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  Check,
  Eye,
  Loader,
  LogIn,
  PartyPopper,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { bookingsApi } from "@/lib/api/bookings.api";
import { BookingStatus, type Booking } from "@/types";

export interface BookingActionsProps {
  booking: Booking;
  /** Show "Chi tiết" link/button. */
  showDetail?: boolean;
  onDetail?: (booking: Booking) => void;
  /** Invalidation key(s) to refresh after a mutation. */
  invalidate?: string[][];
  /** Render buttons full-width and stacked on mobile. */
  fullWidthMobile?: boolean;
}

function describeError(err: unknown) {
  const ax = err as AxiosError<{ message?: string }>;
  return (
    ax.response?.data?.message || ax.message || "Có lỗi xảy ra. Vui lòng thử lại."
  );
}

export function BookingActions({
  booking,
  showDetail = true,
  onDetail,
  invalidate,
  fullWidthMobile = false,
}: BookingActionsProps) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<
    null | "confirm" | "checkIn" | "complete" | "reject"
  >(null);
  const [confirmOpen, setConfirmOpen] = useState<
    null | "confirm" | "checkIn" | "complete"
  >(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const refresh = async () => {
    if (invalidate?.length) {
      await Promise.all(
        invalidate.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      );
    } else {
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
    }
  };

  const doConfirm = async () => {
    setPending("confirm");
    try {
      await bookingsApi.confirm(booking.id);
      toast.success(`Đã xác nhận đơn ${booking.code}`);
      setConfirmOpen(null);
      await refresh();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(null);
    }
  };

  const doCheckIn = async () => {
    setPending("checkIn");
    try {
      await bookingsApi.checkIn(booking.id);
      toast.success(`Đã check-in đơn ${booking.code}`);
      setConfirmOpen(null);
      await refresh();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(null);
    }
  };

  const doComplete = async () => {
    setPending("complete");
    try {
      await bookingsApi.complete(booking.id);
      toast.success(`Đã hoàn thành đơn ${booking.code}`);
      setConfirmOpen(null);
      await refresh();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(null);
    }
  };

  const doReject = async () => {
    if (!reason.trim()) {
      toast.warning("Vui lòng nhập lý do từ chối");
      return;
    }
    setPending("reject");
    try {
      await bookingsApi.reject(booking.id, reason.trim());
      toast.success(`Đã từ chối đơn ${booking.code}`);
      setRejectOpen(false);
      setReason("");
      await refresh();
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setPending(null);
    }
  };

  const groupClass = fullWidthMobile
    ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5"
    : "flex flex-wrap items-center gap-1.5";
  const btnClass = fullWidthMobile ? "w-full sm:w-auto" : undefined;

  return (
    <div className={groupClass}>
      {booking.status === BookingStatus.PENDING && (
        <>
          <Button
            size="sm"
            onClick={() => setConfirmOpen("confirm")}
            disabled={!!pending}
            className={btnClass}
          >
            {pending === "confirm" ? (
              <Loader className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Xác nhận
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={!!pending}
            className={btnClass}
          >
            <X className="size-3.5" />
            Từ chối
          </Button>
        </>
      )}

      {booking.status === BookingStatus.CONFIRMED && (
        <Button
          size="sm"
          onClick={() => setConfirmOpen("checkIn")}
          disabled={!!pending}
          className={btnClass}
        >
          {pending === "checkIn" ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            <LogIn className="size-3.5" />
          )}
          Check-in
        </Button>
      )}

      {booking.status === BookingStatus.CHECKED_IN && (
        <Button
          size="sm"
          onClick={() => setConfirmOpen("complete")}
          disabled={!!pending}
          className={btnClass}
        >
          {pending === "complete" ? (
            <Loader className="size-3.5 animate-spin" />
          ) : (
            <PartyPopper className="size-3.5" />
          )}
          Hoàn thành
        </Button>
      )}

      {showDetail && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDetail?.(booking)}
          className={btnClass}
        >
          <Eye className="size-3.5" />
          Chi tiết
        </Button>
      )}

      {/* Confirm dialogs */}
      <Dialog
        open={!!confirmOpen}
        onOpenChange={(v) => !v && setConfirmOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmOpen === "confirm"
                ? "Xác nhận đơn?"
                : confirmOpen === "checkIn"
                  ? "Check-in cho khách?"
                  : "Hoàn thành đơn?"}
            </DialogTitle>
            <DialogDescription>
              {confirmOpen === "confirm"
                ? `Xác nhận đơn ${booking.code} của ${booking.customer?.fullName ?? "khách"}. Sau khi xác nhận, slot sân sẽ bị khóa.`
                : confirmOpen === "checkIn"
                  ? `Đánh dấu đơn ${booking.code} đã nhận sân. Khách bắt đầu sử dụng dịch vụ.`
                  : `Hoàn tất đơn ${booking.code}. Hãy chắc chắn khách đã thanh toán đầy đủ.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(null)}
              disabled={!!pending}
            >
              Hủy
            </Button>
            <Button
              onClick={
                confirmOpen === "confirm"
                  ? doConfirm
                  : confirmOpen === "checkIn"
                    ? doCheckIn
                    : doComplete
              }
              disabled={!!pending}
            >
              {pending && <Loader className="mr-1 size-3.5 animate-spin" />}
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đơn {booking.code}?</DialogTitle>
            <DialogDescription>
              Vui lòng cho biết lý do để hệ thống gửi thông báo tới khách hàng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Lý do từ chối</Label>
            <Textarea
              id="reject-reason"
              placeholder="Ví dụ: Sân không còn trống, khách hủy qua điện thoại,..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={!!pending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={doReject}
              disabled={!!pending}
            >
              {pending === "reject" && (
                <Loader className="mr-1 size-3.5 animate-spin" />
              )}
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BookingActions;
