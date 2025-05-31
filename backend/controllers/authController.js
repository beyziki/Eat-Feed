const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { createUser, verifyUser, findUserByEmail } = require('../models/userModel');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function signup(req, res) {
  const { name, surname, email, phone, password, role } = req.body;

  if (!name || !surname || !email || !phone || !password || !role) {
    return res.status(400).json({ message: 'Fill all fields.' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    await createUser({ name, surname, email, phone, password: hashedPassword, role, token });

    const verificationLink = `${process.env.BASE_URL}/verify?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      html: `<h2>Welcome, ${name}!</h2><p>Please verify your email by clicking the link below:</p><a href="${verificationLink}">Verify Email</a>`
    });

    res.status(201).json({ message: 'Registration successful. Check your email to verify your account.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
}

async function verify(req, res) {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const success = await verifyUser(token);

    if (!success) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    res.send('<h2>Email verified successfully! You can now login.</h2>');
  } catch (error) {
    console.error('Verify error:', error);
    res.status(400).send('<h2>Invalid or expired token.</h2>');
  }
}

module.exports = { signup, verify };
