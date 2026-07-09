const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for profile image uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'profiles');
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

// PUT /api/profile — update profile
router.put('/', authenticate, upload.fields([
  { name: 'avatarFile', maxCount: 1 },
  { name: 'bannerFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const updates = { ...req.body };

    // Parse mobile if it comes as string
    if (typeof updates.mobile === 'string') {
      updates.mobile = JSON.parse(updates.mobile);
    }

    // Handle avatar upload
    if (req.files && req.files.avatarFile) {
      updates.avatar = `/uploads/profiles/${req.files.avatarFile[0].filename}`;
    }

    // Handle banner upload
    if (req.files && req.files.bannerFile) {
      updates.banner = `/uploads/profiles/${req.files.bannerFile[0].filename}`;
    }

    // Don't allow password or role updates through this endpoint
    delete updates.password;
    delete updates.role;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      fullname: user.fullname,
      avatar: user.avatar,
      banner: user.banner,
      email: user.email,
      address: user.address,
      basket: user.basket,
      mobile: user.mobile,
      role: user.role,
      dateJoined: user.dateJoined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profile/email — update email
router.put('/email', authenticate, async (req, res) => {
  try {
    const { currentPassword, newEmail } = req.body;
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        code: 'auth/wrong-password',
        message: 'Current password is incorrect'
      });
    }

    // Check if new email is already in use
    const existing = await User.findOne({ email: newEmail });
    if (existing && existing._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        code: 'auth/email-already-in-use',
        message: 'Email is already in use'
      });
    }

    user.email = newEmail;
    await user.save();

    res.json({ message: 'Email Successfully updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profile/basket — save basket items
router.put('/basket', authenticate, async (req, res) => {
  try {
    const { basket } = req.body;

    await User.findByIdAndUpdate(req.user._id, { basket });

    res.json({ message: 'Basket saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
