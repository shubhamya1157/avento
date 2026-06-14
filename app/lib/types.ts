export type VehicleType = "car" | "bike" | "suv";
export type Transmission = "Automatic" | "Manual";
export type FuelType = "Electric" | "Petrol" | "Diesel" | "Hybrid";
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Vehicle {
  _id: string;
  brand: string;
  model: string;
  type: VehicleType;
  image: string;
  pricePerDay: number;
  description: string;
  transmission: Transmission;
  fuel: FuelType;
  seats: number;
  availability: boolean;
  // Optional CSS object-position for the card image (e.g. "center 70%")
  // when a photo needs to be cropped higher or lower than the default.
  imagePosition?: string;
}

export interface BookingVehicle {
  brand: string;
  model: string;
  image: string;
  type: string;
  pricePerDay: number;
}

export interface Booking {
  _id: string;
  vehicleId: BookingVehicle | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
}
