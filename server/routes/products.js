const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// GET /api/products — list products (paginated)
router.get('/', async (req, res) => {
  try {
    const { lastKey, limit = 12 } = req.query;
    const parsedLimit = parseInt(limit);

    let query = {};
    if (lastKey) {
      query = { _id: { $gt: lastKey } };
    }

    const products = await Product.find(query)
      .sort({ _id: 1 })
      .limit(parsedLimit);

    const total = await Product.countDocuments();
    const lastProduct = products.length > 0 ? products[products.length - 1]._id : null;

    res.json({
      products: products.map((p) => ({
        id: p._id,
        ...p.toObject(),
        _id: undefined
      })),
      lastKey: lastProduct,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/featured
router.get('/featured', async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const products = await Product.find({ isFeatured: true }).limit(parseInt(limit));

    res.json({
      products: products.map((p) => ({
        id: p._id,
        ...p.toObject(),
        _id: undefined
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/recommended
router.get('/recommended', async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const products = await Product.find({ isRecommended: true }).limit(parseInt(limit));

    res.json({
      products: products.map((p) => ({
        id: p._id,
        ...p.toObject(),
        _id: undefined
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/search?q=searchterm
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ products: [], lastKey: null });
    }

    const searchKey = q.toLowerCase();
    const searchWords = searchKey.split(' ').filter(Boolean);

    // Search by name (prefix match) and by keywords
    const nameResults = await Product.find({
      name_lower: { $regex: `^${searchKey}`, $options: 'i' }
    }).limit(12);

    const keywordResults = await Product.find({
      keywords: { $in: searchWords }
    }).limit(12);

    // Merge and deduplicate
    const merged = {};
    [...nameResults, ...keywordResults].forEach((p) => {
      merged[p._id.toString()] = {
        id: p._id,
        ...p.toObject(),
        _id: undefined
      };
    });

    res.json({
      products: Object.values(merged),
      lastKey: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({
      id: product._id,
      ...product.toObject(),
      _id: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products — add product (admin only)
router.post('/', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    let productData = req.body;

    // Parse JSON fields that may come as strings from FormData
    if (typeof productData.keywords === 'string') {
      productData.keywords = JSON.parse(productData.keywords);
    }
    if (typeof productData.sizes === 'string') {
      productData.sizes = JSON.parse(productData.sizes);
    }
    if (typeof productData.availableColors === 'string') {
      productData.availableColors = JSON.parse(productData.availableColors);
    }
    if (typeof productData.imageCollection === 'string') {
      productData.imageCollection = JSON.parse(productData.imageCollection);
    }

    if (req.file) {
      productData.image = `/uploads/products/${req.file.filename}`;
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      id: product._id,
      ...product.toObject(),
      _id: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id — edit product (admin only)
router.put('/:id', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    let updates = req.body;

    // Parse JSON fields
    if (typeof updates.keywords === 'string') {
      updates.keywords = JSON.parse(updates.keywords);
    }
    if (typeof updates.sizes === 'string') {
      updates.sizes = JSON.parse(updates.sizes);
    }
    if (typeof updates.availableColors === 'string') {
      updates.availableColors = JSON.parse(updates.availableColors);
    }
    if (typeof updates.imageCollection === 'string') {
      updates.imageCollection = JSON.parse(updates.imageCollection);
    }

    if (req.file) {
      updates.image = `/uploads/products/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      id: product._id,
      ...product.toObject(),
      _id: undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id — remove product (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/upload-image — upload an image and return URL
router.post('/upload-image', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    const url = `/uploads/products/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
