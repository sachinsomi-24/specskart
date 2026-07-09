const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullname } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        code: 'auth/email-already-in-use',
        message: 'Email is already in use. Please use another email'
      });
    }

    // Format fullname
    const formattedName = fullname
      .split(' ')
      .map((name) => name[0].toUpperCase() + name.substring(1))
      .join(' ');

    const user = new User({
      fullname: formattedName,
      email,
      password,
      role: 'USER',
      dateJoined: Date.now()
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.fullname,
        photoURL: user.avatar,
        providerData: [{ providerId: 'password' }],
        metadata: { creationTime: new Date().toISOString() }
      },
      profile: {
        fullname: user.fullname,
        avatar: user.avatar,
        banner: user.banner,
        email: user.email,
        address: user.address,
        basket: user.basket,
        mobile: user.mobile,
        role: user.role,
        dateJoined: user.dateJoined
      },
      token
    });
  } catch (error) {
    res.status(500).json({ code: 'auth/server-error', message: error.message });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        code: 'auth/user-not-found',
        message: 'Incorrect email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        code: 'auth/wrong-password',
        message: 'Incorrect email or password'
      });
    }

    const token = generateToken(user);

    res.json({
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.fullname,
        photoURL: user.avatar,
        providerData: [{ providerId: 'password' }],
        metadata: { creationTime: new Date().toISOString() }
      },
      profile: {
        fullname: user.fullname,
        avatar: user.avatar,
        banner: user.banner,
        email: user.email,
        address: user.address,
        basket: user.basket,
        mobile: user.mobile,
        role: user.role,
        dateJoined: user.dateJoined
      },
      token
    });
  } catch (error) {
    res.status(500).json({ code: 'auth/server-error', message: error.message });
  }
});

// POST /api/auth/signout
router.post('/signout', (req, res) => {
  // JWT is stateless — client just discards the token
  res.json({ message: 'Signed out successfully' });
});

// GET /api/auth/me — get current authenticated user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      user: {
        uid: user._id,
        email: user.email,
        displayName: user.fullname,
        photoURL: user.avatar,
        providerData: [{ providerId: 'password' }],
        metadata: { creationTime: new Date().toISOString() }
      },
      profile: {
        fullname: user.fullname,
        avatar: user.avatar,
        banner: user.banner,
        email: user.email,
        address: user.address,
        basket: user.basket,
        mobile: user.mobile,
        role: user.role,
        dateJoined: user.dateJoined
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        code: 'auth/user-not-found',
        message: 'No user found with that email'
      });
    }
    // In production, send email with reset link.
    // For now, just acknowledge the request.
    res.json({ message: 'Password reset email has been sent to your provided email.' });
  } catch (error) {
    res.status(500).json({
      code: 'auth/reset-password-error',
      message: 'Failed to send password reset email.'
    });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        code: 'auth/wrong-password',
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
