/**
 * CareerForge AI — Authentication Controller
 * Multi-tenant user registration, login, profile retrieval, and settings synchronization.
 */

const jwt = require('jsonwebtoken');
const User = require('../../models/user.model');
const { isConnected } = require('../../core/database');

const JWT_SECRET = process.env.JWT_SECRET || 'careerforge_ai_super_secret_jwt_key_2026_production_aes256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signUserToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

class AuthController {
  /**
   * Registers a new tenant user account.
   */
  static async register(req, res) {
    if (!isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    try {
      const { email, password, name, university, title } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Name, email, and password are required.'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long.'
        });
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email address already exists.'
        });
      }

      const passwordHash = await User.hashPassword(password);
      const newUser = new User({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password_hash: passwordHash,
        candidate_profile: {
          title: title || 'DevSecOps & Backend Engineer',
          university: university || 'ESPRIT',
          graduation_year: 2026
        }
      });

      await newUser.save();
      const token = signUserToken(newUser);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          candidate_profile: newUser.candidate_profile
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Authenticates user and returns JWT token.
   */
  static async login(req, res) {
    if (!isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required.'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.'
        });
      }

      user.last_login_at = new Date();
      await user.save();

      const token = signUserToken(user);

      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          candidate_profile: user.candidate_profile
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Returns current authenticated user profile.
   */
  static async getMe(req, res) {
    if (!isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    try {
      const user = await User.findById(req.user.id).select('-password_hash');
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      return res.json({
        success: true,
        user
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Updates candidate profile, search criteria, and application answers in MongoDB.
   */
  static async updateProfile(req, res) {
    if (!isConnected()) {
      return res.status(503).json({ success: false, error: 'Database unavailable' });
    }

    try {
      const updates = req.body;
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      if (updates.name) user.name = updates.name.trim();

      // Deep merge candidate profile updates
      if (updates.candidate_profile) {
        user.candidate_profile = {
          ...user.candidate_profile.toObject(),
          ...updates.candidate_profile
        };
      }

      await user.save();

      return res.json({
        success: true,
        message: 'Profile updated in MongoDB Atlas',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          candidate_profile: user.candidate_profile
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AuthController;
