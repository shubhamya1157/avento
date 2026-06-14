import mongoose, { Connection } from "mongoose";

declare global {
  var mongooseConn:
    | { conn: Connection | null; promise: Promise<Connection> | null }
    | undefined;
}

const mongodbUrl = process.env.MONGODB_URL ?? process.env.MONGODB_URI;

if (!mongodbUrl) {
  throw new Error("MONGODB_URL or MONGODB_URI must be set in environment variables");
}

const connectionString: string = mongodbUrl;

let cached = global.mongooseConn;

if (!cached) {
  cached = global.mongooseConn = { conn: null, promise: null };
}

async function connectDB(): Promise<Connection> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(connectionString).then((instance) => instance.connection);
  }

  try {
    const conn = await cached!.promise;
    cached!.conn = conn;
    return conn;
  } catch (error) {
    cached!.promise = null;
    throw error;
  }
}

export default connectDB;
