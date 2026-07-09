require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');

const defaultProducts = [
  {
    name: 'Classic Aviator',
    brand: 'Specskart',
    price: 1500,
    maxQuantity: 10,
    description: 'Classic aviator sunglasses with UV400 protection. Timeless design for everyday wear.',
    keywords: ['aviator', 'classic', 'sunglasses', 'uv400'],
    sizes: [28, 36, 42],
    isFeatured: true,
    isRecommended: true,
    availableColors: ['#000000', '#C0C0C0', '#FFD700'],
    image: '/static/salt-image-1.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625097600000
  },
  {
    name: 'Round Retro Frame',
    brand: 'Specskart Premium',
    price: 2000,
    maxQuantity: 5,
    description: 'Vintage round frames with anti-glare lenses. Perfect for a retro look.',
    keywords: ['round', 'retro', 'vintage', 'frame'],
    sizes: [36, 42],
    isFeatured: true,
    isRecommended: false,
    availableColors: ['#000000', '#8B4513'],
    image: '/static/salt-image-2.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625184000000
  },
  {
    name: 'Sport Wraparound',
    brand: 'Specskart Active',
    price: 1800,
    maxQuantity: 15,
    description: 'Lightweight wraparound sports glasses with polarized lenses. Ideal for outdoor activities.',
    keywords: ['sport', 'wraparound', 'polarized', 'outdoor'],
    sizes: [28, 36, 42],
    isFeatured: false,
    isRecommended: true,
    availableColors: ['#FF0000', '#0000FF', '#000000'],
    image: '/static/salt-image-3.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625270400000
  },
  {
    name: 'Cat Eye Designer',
    brand: 'Specskart Luxe',
    price: 3000,
    maxQuantity: 8,
    description: 'Elegant cat-eye frames crafted with premium acetate. A statement piece for any outfit.',
    keywords: ['cat-eye', 'designer', 'luxury', 'acetate'],
    sizes: [42],
    isFeatured: true,
    isRecommended: true,
    availableColors: ['#800020', '#000000'],
    image: '/static/salt-image-4.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625356800000
  },
  {
    name: 'Blue Light Blocker',
    brand: 'Specskart',
    price: 2500,
    maxQuantity: 12,
    description: 'Computer glasses with blue light filtering technology. Reduce eye strain during screen time.',
    keywords: ['blue-light', 'computer', 'blocker', 'eyestrain'],
    sizes: [28, 36],
    isFeatured: false,
    isRecommended: true,
    availableColors: ['#1E90FF', '#000000'],
    image: '/static/salt-image-5.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625443200000
  },
  {
    name: 'Wayfarer Classic',
    brand: 'Specskart Premium',
    price: 1200,
    maxQuantity: 20,
    description: 'Iconic wayfarer shape with scratch-resistant lenses. Versatile design for all face shapes.',
    keywords: ['wayfarer', 'classic', 'scratch-resistant'],
    sizes: [36, 42],
    isFeatured: true,
    isRecommended: false,
    availableColors: ['#000000', '#8B0000'],
    image: '/static/salt-image-7.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625529600000
  },
  {
    name: 'Titanium Rimless',
    brand: 'Specskart',
    price: 3500,
    maxQuantity: 10,
    description: 'Ultra-lightweight titanium rimless frames. Minimalist design with maximum comfort.',
    keywords: ['titanium', 'rimless', 'lightweight', 'minimalist'],
    sizes: [28, 36, 42],
    isFeatured: false,
    isRecommended: true,
    availableColors: ['#C0C0C0', '#FFD700', '#000000'],
    image: '/static/salt-image-10.png',
    imageCollection: [],
    quantity: 1,
    dateAdded: 1625616000000
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    await User.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed products
    const products = await Product.insertMany(defaultProducts);
    console.log(`📦 Seeded ${products.length} products`);

    // Seed admin user
    const admin = new User({
      fullname: 'Admin User',
      email: 'admin@specskart.com',
      password: 'admin123',
      avatar: '/static/profile.jpg',
      banner: '/static/banner.jpg',
      role: 'ADMIN',
      dateJoined: Date.now()
    });
    await admin.save();
    console.log('👤 Created admin user (admin@specskart.com / admin123)');

    // Seed regular user
    const user = new User({
      fullname: 'Test User',
      email: 'user@specskart.com',
      password: 'user123',
      avatar: '/static/profile.jpg',
      banner: '/static/banner.jpg',
      role: 'USER',
      dateJoined: Date.now()
    });
    await user.save();
    console.log('👤 Created test user (user@specskart.com / user123)');

    console.log('\n🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
