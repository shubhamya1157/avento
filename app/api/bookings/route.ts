import { auth } from "@/app/auth";
import connectDB from "@/app/lib/db";
import bookingModel from "@/app/models/booking";
import vehicleModel from "@/app/models/vehicle";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    await connectDB();

    const bookings = await bookingModel
      .find({ userId: session.user.id })
      .populate({ path: "vehicleId", model: vehicleModel })
      .sort({ createdAt: -1 });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return apiError(getErrorMessage(error, "Failed to fetch bookings"), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { vehicleId, startDate, endDate, totalAmount } = await req.json();

    if (!vehicleId || !startDate || !endDate || !totalAmount) {
      return apiError("Missing required fields", 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return apiError("Start date must be before end date", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return apiError("Start date cannot be in the past", 400);
    }

    await connectDB();

    // The fleet is served from a static list and isn't pre-loaded into the
    // database, so the first time a vehicle is booked we insert it on demand
    // (using its known id) so bookings can reference a real document.
    let vehicle = await vehicleModel.findById(vehicleId);
    if (!vehicle) {
      const staticVehicle = STATIC_VEHICLES.find((v) => v._id === vehicleId);
      if (!staticVehicle) {
        return apiError("Vehicle not found", 404);
      }
      const { _id, ...vehicleData } = staticVehicle;
      vehicle = await vehicleModel.create({ _id, ...vehicleData });
    }

    if (!vehicle.availability) {
      return apiError("Vehicle is currently not available for rent", 400);
    }

    const overlappingBooking = await bookingModel.findOne({
      vehicleId,
      status: { $ne: "cancelled" },
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    if (overlappingBooking) {
      return apiError("This vehicle is already booked for the selected dates.", 400);
    }

    const booking = await bookingModel.create({
      userId: session.user.id,
      vehicleId,
      startDate: start,
      endDate: end,
      totalAmount,
      status: "confirmed",
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return apiError(getErrorMessage(error, "Failed to place booking"), 500);
  }
}
