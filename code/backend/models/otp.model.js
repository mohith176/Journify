import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['registration', 'password-change'],
    default: 'registration'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes (600 seconds)
  }
});

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;