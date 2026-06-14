const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        env[key] = val;
    }
});

const mongodbUrl = env.MONGODB_URL;
console.log("Connecting to:", mongodbUrl);

const vehicleSchema = new mongoose.Schema({
    brand: String,
    model: String,
    type: String,
});

const vehicleModel = mongoose.models.vehicleModel || mongoose.model('vehicleModel', vehicleSchema);

async function run() {
    try {
        await mongoose.connect(mongodbUrl);
        console.log("Connected to MongoDB!");
        const count = await vehicleModel.countDocuments();
        console.log("Total vehicles count:", count);
        
        const vehicles = await vehicleModel.find();
        console.log("Vehicles sample size:", vehicles.length);
        
        const counts = {};
        for (const v of vehicles) {
            const key = `${v.brand} ${v.model}`;
            counts[key] = (counts[key] || 0) + 1;
        }
        console.log("Counts per vehicle:", counts);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
