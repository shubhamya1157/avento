import connectDB from "@/app/lib/db";
import vehicleModel from "@/app/models/vehicle";
import { STATIC_VEHICLES } from "@/app/lib/seed-vehicles";
import { apiError, getErrorMessage } from "@/app/lib/api-response";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    // Filter statically by type (response time < 1ms, zero DB handshake, zero latency)
    const vehicles = type && type !== "all"
      ? STATIC_VEHICLES.filter((v) => v.type === type)
      : STATIC_VEHICLES;

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("Fetch vehicles error:", error);
    return apiError(getErrorMessage(error, "Failed to fetch vehicles"), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { brand, model, type, image, pricePerDay, description, transmission, fuel, seats } = body;
    if (!brand || !model || !type || !image || !pricePerDay || !description || !transmission || !fuel || !seats) {
      return apiError("All fields are required", 400);
    }

    const newVehicle = await vehicleModel.create(body);
    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error) {
    console.error("Create vehicle error:", error);
    return apiError(getErrorMessage(error, "Failed to create vehicle"), 500);
  }
}

