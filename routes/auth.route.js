import express from 'express';
import User from '../models/user.model.js';
import Token from '../models/token.model.js';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { redisClient } from '../dbInitialize.js';

const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY;

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const emailLower = email.toLowerCase();
    const userExists = await User.findOne({ where: { email: emailLower } });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      email: emailLower,
      password,
      userToken: uuid()
    });

    // Generate a new access token and JTI
    const userResponse = { usertoken: user.userToken };
    const newJti = uuid();
    const newAccessToken = jwt.sign(userResponse, SECRET_KEY);

    // Insert the new token into Redis
    await redisClient.set(newJti, newAccessToken);

    // Store the new token information in the database
    await Token.create({
      userId: user.id,
      jti: newJti,
      token: newAccessToken,
      type: 'access'
    });

    res.cookie("jti", newJti, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    res.status(201).json({ message: 'SignUp successful', user: userResponse, jti: newJti });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Could not register user' });
  }
});

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user || !await user.verifyPassword(password)) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check for an existing token in the database
    const existingToken = await Token.findOne({
      where: {
        userId: user.id,
        type: 'access', // Delete with access tokens here
        deletedAt: null // Check only for non-soft-deleted tokens
      },
      order: [['createdAt', 'DESC']] // Fetch the most recent token
    });

    if (existingToken) {
      // Remove the existing token from Redis
      await redisClient.del(existingToken.jti);

      // Soft delete the token record in the database
      await existingToken.destroy();
    }

    // Generate a new access token and JTI
    const userResponse = { usertoken: user.userToken };
    const newJti = uuid();
    const newAccessToken = jwt.sign(userResponse, SECRET_KEY);

    // Insert the new token into Redis
    await redisClient.set(newJti, newAccessToken); // Set with the same expiry as the JWT

    // Store the new token information in the database
    await Token.create({
      userId: user.id,
      jti: newJti,
      token: newAccessToken,
      type: 'access'
    });

    res.cookie("jti", newJti, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    res.status(201).json({ message: 'SignIn successful', user: userResponse, jti: newJti });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
});

router.post('/signout', async (req, res) => {
  let userJti;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userJti = authHeader.split(' ')[1]; // Extracting JTI from the Bearer token
  }

  // Ensure we have a JTI to work with
  if (!userJti) {
    return res.status(400).json({ message: 'Invalid or missing authorization header.' });
  }

  // Check if the user is signed in by checking for a valid token in Redis
  const tokenExistsInRedis = await redisClient.get(userJti);
  if (!tokenExistsInRedis) {
    return res.status(400).json({ message: 'User is not signed in.' });
  }

  // Remove the token from Redis
  await redisClient.del(userJti);

  // Find the corresponding token record in the database using the JTI
  const tokenRecord = await Token.findOne({ where: { jti: userJti } });
  if (tokenRecord) {
    // Perform a soft delete on the found token record
    await tokenRecord.destroy();
  } else {
    // Log or handle the case where there is no matching token record in the database
    console.log("No matching token record found in the database for JTI:", userJti);
  }

  res.status(200).json({ message: 'SignOut successful' });
});

router.get('/profile', async (req, res) => {
  // Attempt to retrieve JTI from cookies first, then from the Authorization header
  // let jti = req.cookies.jti; // If using cookies to store the jti
  // if (!jti) {
  //   const authHeader = req.headers.authorization;
  //   if (authHeader && authHeader.startsWith('Bearer ')) {
  //     jti = authHeader.split(' ')[1]; // Bearer <token>
  //   }
  // }

  let userJti;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userJti = authHeader.split(' ')[1]; // Extracting JTI from the Bearer token
  }

  // If no JTI was found in either cookies or Authorization header
  if (!userJti) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = await redisClient.get(userJti);
  if (!token) {
    return res.status(403).json({ message: 'Session expired or invalid' });
  }

  jwt.verify(token, SECRET_KEY, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }

    // Optionally, fetch more user details from the database using decoded.id
    res.status(200).json(decoded);
  });
});

export default router;
