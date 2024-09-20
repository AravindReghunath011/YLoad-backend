// db.js
import mongoose from 'mongoose'
import * as dotenv from 'dotenv';
dotenv.config();

// MongoDB connection URI
const uri =  process.env.MONGO_URI

// Function to connect to MongoDB
export const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
}; 


