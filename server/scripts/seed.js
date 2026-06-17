const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Counter = require('../models/Counter');
const connectDB = require('../config/db');

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Seeding database...');

    // Initialize Counter for the Current Year
    const currentYear = new Date().getFullYear();
    const counterId = `documentId-${currentYear}`;
    let counter = await Counter.findById(counterId);

    if (!counter) {
      counter = await Counter.create({
        _id: counterId,
        seq: 0
      });
      console.log(`Initialized sequential Document ID counter for year ${currentYear}`);
    } else {
      console.log(`Document ID counter for year ${currentYear} already exists at sequence ${counter.seq}`);
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process encountered an error:', error);
    process.exit(1);
  }
};

seedDatabase();
