import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { redisClient } from '../utils/redis';

// Load environment variables
dotenv.config({ path: '.env.test' });

let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  // Create an in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);

  // Connect to Redis (mock implementation)
  await redisClient.connect();
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Clean up after all tests
afterAll(async () => {
  // Disconnect from MongoDB
  await mongoose.disconnect();
  await mongoServer.stop();

  // Disconnect from Redis
  await redisClient.disconnect();
});

// Global test setup
jest.setTimeout(30000); // 30 seconds

// Mock console.error to keep test output clean
console.error = jest.fn();

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379'; 