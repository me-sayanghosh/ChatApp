import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[db] connected: ${mongoose.connection.name}`);
  console.log('mongodb connected successfully');
}
