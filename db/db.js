// db.js
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

// MongoDB connection URI
const uri = process.env.MONGO_URI;

// Function to connect to MongoDB with retry mechanism
export const connectDB = async (retries = 5, delay = 5000) => {
  while (retries) {
    try {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connected successfully');
      return; // Exit the function if connection is successful
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
      retries -= 1; // Decrease retry count

      if (retries) {
        console.log(`Retrying connection... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, delay)); // Wait before retrying
      } else {
        console.error('Max retries reached. Exiting...');
      }
    }
  }
};
