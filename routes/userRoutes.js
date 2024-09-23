import { Router } from "express";
import User from "../models/userModel.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import * as dotenv from 'dotenv';
dotenv.config();

const router = Router()
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;



router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email, and password are required'
            });
        }

        const existingUser = await User.findOne({ email: email });
        console.log(existingUser);
        if (existingUser) {
            return res.status(400).json({
                message: 'Email already exists'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({ name, email, password: hashedPassword });

        const accessToken = jwt.sign({ id: user._id, email: user.email }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user._id, email: user.email }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            newUser: user,
            token:{
                accessToken: accessToken,
                refreshToken: refreshToken
            }
        });

    } catch (e) {
        res.status(500).json({
            message: e.message
        });
    }
});


router.post('/login',async(req,res)=>{
    try {
        const {email,password } = req.body
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid email or password'
            });
        }

        const accessToken = jwt.sign({ id: user._id, email: user.email }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ id: user._id, email: user.email }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            tokens:{
                accessToken: accessToken,
                refreshToken: refreshToken
            }
        });
        
    } catch (error) {
        res.json({
            message:error.message
        })
    }
})



router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                message: 'Refresh token is required'
            });
        }

        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const userId = decoded.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        const newAccessToken = jwt.sign({ id: user._id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

        res.status(200).json({
            accessToken: newAccessToken
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

export default router