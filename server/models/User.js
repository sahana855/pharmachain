// PharmaChain User model
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manufacturer', 'dealer', 'transport', 'pharmacy', 'patient'],
      default: 'patient',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    // KYC / verification fields (business roles)
    aadharNumber: { type: String, trim: true },
    businessLicense: { type: String, trim: true },
    idProofType: { type: String, trim: true },
    idProofNumber: { type: String, trim: true },
    // Optional profile
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    // One-time password (OTP) for email verification on login
    otp: { type: String, trim: true, select: false },
    otpExpires: { type: Date },
    otpAttempts: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true, versionKey: false, transform: transformUser }, toObject: { virtuals: true, versionKey: false, transform: transformUser } }
);

function transformUser(doc, ret) {
  delete ret.password;
  return ret;
}

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Unique index on verification fields when present (sparse unique)
userSchema.index({ aadharNumber: 1 }, { unique: true, sparse: true });
userSchema.index({ businessLicense: 1 }, { unique: true, sparse: true });
userSchema.index({ idProofNumber: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

export default User;

