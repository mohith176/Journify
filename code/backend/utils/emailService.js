import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Debug the credentials (don't include this in production code)
console.log('Email credentials check:', {
  hasUser: !!process.env.EMAIL_USER,
  hasPass: !!process.env.EMAIL_PASS,
  userFirstChar: process.env.EMAIL_USER ? process.env.EMAIL_USER.charAt(0) : 'missing',
  passLength: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'missing'
});

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Debug settings
  debug: true,
  logger: true
});

// Verify the connection configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log('SMTP connection error:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});

// Function to send OTP email
export const sendOTPEmail = async (email, otp, type = 'Registration') => {
  try {
    // Setup email data with different content based on type
    let subject, heading, introText;
    
    if (type === 'Password Change') {
      subject = 'Password Change Verification for Journify';
      heading = 'Change Your Password';
      introText = 'You have requested to change your password for Journify. Please use the following verification code to proceed:';
    } else {
      // Default registration email
      subject = 'Verify Your Email for Journify';
      heading = 'Verify Your Email for Journify';
      introText = 'Thank you for signing up with Journify. To complete your registration, please use the following verification code:';
    }
    
    const mailOptions = {
      from: `"Journify" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4f46e5; text-align: center;">${heading}</h2>
          <p style="font-size: 16px; margin-top: 20px;">${introText}</p>
          <div style="background-color: #f0f0f0; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="letter-spacing: 5px; margin: 0; color: #333;">${otp}</h1>
          </div>
          <p style="font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
          <div style="margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
            <p>© ${new Date().getFullYear()} Journify. All rights reserved.</p>
          </div>
        </div>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};