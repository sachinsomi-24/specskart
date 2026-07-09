const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  name_lower: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  maxQuantity: {
    type: Number,
    default: 10
  },
  description: {
    type: String,
    default: ''
  },
  keywords: {
    type: [String],
    default: []
  },
  sizes: {
    type: [Number],
    default: []
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isRecommended: {
    type: Boolean,
    default: false
  },
  availableColors: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    default: ''
  },
  imageCollection: {
    type: [
      {
        id: String,
        url: String
      }
    ],
    default: []
  },
  quantity: {
    type: Number,
    default: 1
  },
  dateAdded: {
    type: Number,
    default: () => Date.now()
  }
}, {
  timestamps: true
});

// Auto-generate name_lower before saving
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.name_lower = this.name.toLowerCase();
  }
  next();
});

productSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.name) {
    update.name_lower = update.name.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
