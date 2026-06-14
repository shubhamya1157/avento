import { auth } from "@/app/auth";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { id } = await context.params;
    const { status } = await req.json();

    if (status !== "cancelled") {
      return apiError("Invalid action", 400);
    }

    await connectDB();

    const booking = await bookingModel.findById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    if (booking.userId.toString() !== session.user.id) {
      return apiError("Unauthorized to update this booking", 403);
    }

    booking.status = "cancelled";
    await booking.save();

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Update booking error:", error);
    return apiError(getErrorMessage(error, "Failed to update booking"), 500);
  }
}
