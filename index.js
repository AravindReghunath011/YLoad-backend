import express, { json } from 'express';
import cors from 'cors';
import path from 'path';
import { createReadStream } from 'fs';
import multer, { diskStorage } from 'multer';
import pkg from 'youtube-api';
import * as dotenv from 'dotenv';
dotenv.config();
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connectDB } from './db/db.js';
import uploadRoutes from './routes/uploadRoutes.js'

const { videos, authenticate } = pkg;
 
const app = express(); 
connectDB()

// CORS configuration
const corsOptions = {
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // If you need to allow cookies or credentials
};
app.use(cors(corsOptions));
app.use(json());
app.use('/api/v1',uploadRoutes)

// Configure multer to use /tmp directory for uploads because other wise in vercel it will show error read only 
const storage = diskStorage({
    destination: '/tmp',
    filename(req, file, cb) {
        const newFileName = `${Date.now()}-${file.originalname}`;
        cb(null, newFileName);
    }
});

const uploadVideoFile = multer({ storage }).single('videoFile');

// Initialize OAuth client
const oAuth = authenticate({
    type: 'oauth',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_url: process.env.REDIRECT_URIS
});
 
console.log(process.env.AWS_ACCESS_KEY)
console.log(process.env.AWS_SECRET_KEY)
console.log(process.env.AWS_REGION)

const s3 = new S3Client({
    region: process.env.AWS_REGION, // specify your AWS region
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY, // your AWS access key
        secretAccessKey: process.env.AWS_SECRET_KEY // your AWS secret key
    },
    // The signature version is automatically set to "v4" 
});

// Test endpoint
app.get('/getPresignedUrl', async (req, res) => {
    const extension = req.query.fileType.split("/")[1];
    const Key = `${Date.now()}.${extension}`;
    
    const s3Params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key,
        ContentType: `video/${extension}`
    };

    try {
        const command = new PutObjectCommand(s3Params);
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
        res.json({ uploadUrl, Key });
    } catch (err) {
        console.error("Error getting signed URL:", err);
        res.status(500).send("Error generating signed URL");
    }
});

// Upload endpoint
app.post('/upload', (req, res) => {
    console.log('Entered upload endpoint');

    uploadVideoFile(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            return res.status(400).send({ error: 'Multer error occurred during the upload.'});
        } else if (err) {
            console.error('Unknown error:', err);
            return res.status(500).send({ error: 'An error occurred during the upload.'});
        }

        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).send({ error: 'No file uploaded.' });
        }

        console.log('File uploaded successfully:', req.file.filename);
        const filename = req.file.filename; 
        const { title, description } = req.body;

        // Generate OAuth authorization URL
        const authUrl = oAuth.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            state: JSON.stringify({ filename, title, description }),
        });

        console.log('Generated Auth URL:', authUrl);

        // Send the OAuth URL to the client
        res.json({ authUrl });
    });
});

// OAuth callback endpoint
app.get('/oauth2callback', (req, res) => {
    console.log('Entered OAuth callback endpoint');
    const { filename, title, description } = JSON.parse(req.query.state);

    oAuth.getToken(req.query.code, (err, token) => {
        if (err) {
            console.log('Error getting token:', err);
            return res.status(500).send('Error getting token');
        }

        oAuth.setCredentials(token);
        console.log(token,'from index.js')

        // Path to file in /tmp directory 
        const filePath = path.join('/tmp', filename);

        // Upload video to YouTube
        videos.insert({
            resource: {
                snippet: { title, description },
                status: { privacyStatus: 'private'},
            },
            part: 'snippet,status',
            media: {
                body: createReadStream(filePath)
            }
        }, (err, data) => {
            if (err) {
                console.error('Error uploading video:', err);
                return res.status(500).send('Error uploading video');
            }

            console.log('Upload successful');
            res.send('Upload successful');
        });
    });
});

app.listen(8000, () => {
    console.log('App is listening at port 8000');
});
