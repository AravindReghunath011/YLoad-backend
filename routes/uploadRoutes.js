import { Router } from "express";
import pkg from 'youtube-api';
const { videos, authenticate } = pkg;
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import Upload from '../models/uploadModel.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PassThrough } from 'stream'; 
import { createReadStream } from 'fs';

const router = Router();
console.log(process.env.AWS_BUCKET_NAME,'kk')


// OAuth2 authentication setup
const oAuth = authenticate({
    type: 'oauth',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_url: process.env.REDIRECT_URIS
});

// S3 client setup
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

// Route to generate a presigned URL for uploading videos to S3
router.post('/presignedurl', async (req, res) => {
    const { fileType, title, description } = req.body;

    const extension = fileType.split("/")[1];
    const Key = `${Date.now()}.${extension}`;

    const s3Params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key,
        ContentType: `video/${extension}`
    };

    // Create a new document in MongoDB
    const uploadDocument = new Upload({ title, description, key: Key });
    
    try {
        await uploadDocument.save(); 

        const command = new PutObjectCommand(s3Params);
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60000 });
        res.json({ uploadUrl, Key, id: uploadDocument._id });
    } catch (err) {
        console.error("Error generating presigned URL:", err);
        res.status(500).send("Error generating presigned URL");
    }
});

// Route to generate the OAuth authorization URL for YouTube
router.post('/generateAuthUrl', async (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ error: 'ID is required.' });
    }

    try {
        // Find the upload document by ID
        const uploadDocument = await Upload.findById(id);
        if (!uploadDocument) {
            return res.status(404).json({ error: 'Upload document not found.' });
        }

        const { key, title, description } = uploadDocument;

        // Generate OAuth authorization URL
        const authUrl = oAuth.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            state: JSON.stringify({ key, title, description, id }) // Include key, title, and description in state
        });

        await Upload.findByIdAndUpdate(id, { uploadtos3: true });

        console.log('Generated Auth URL:', authUrl);

        // Send the OAuth URL to the client
        res.json({ authUrl });
    } catch (error) {
        console.error('Error finding upload document:', error);
        res.status(500).json({ error: 'An error occurred while fetching the upload document.' });
    }
});
router.get('/oauth2callback', async (req, res) => {
    console.log('Entered OAuth callback endpoint');

    const { key, title, description, id } = JSON.parse(req.query.state);

    try {
        // Get the token
        const token = await new Promise((resolve, reject) => {
            oAuth.getToken(req.query.code, (err, token) => {
                if (err) {
                    console.error('Error getting token:', err);
                    return reject(new Error('Error getting token'));
                }
                resolve(token);
            });
        });

        // Log the token to see its contents
        console.log('Received token:', token);

        oAuth.setCredentials(

            {
                access_token: token.access_token
              }
        );
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        };

        const data = await s3.send(new GetObjectCommand(params));
        const fileStream = data.Body.pipe(new PassThrough());
        // Ensure the token has access and refresh tokens
        if (!token.access_token ) {
            throw new Error('Access token or refresh token is missing.');
        }

        // Path to the file you want to upload
        const filePath = 'C:/Users/arjun/Desktop/Brocamp/Youtube API/backend/tmp/1726769068531.mp4' // Adjust this path if necessary

        // Upload video to YouTube using a local file
        try {
            const videoData = await videos.insert({
                auth: oAuth,  // Add this line to explicitly pass the authenticated client
                resource: {
                  snippet: { title, description },
                  status: { privacyStatus: 'private'},
                },
                part: 'snippet,status',
                media: {
                  body: fileStream,
                },
              });
            console.log('Upload successful:', videoData);
        } catch (error) {
            console.error('Error while uploading video:', error);
            throw new Error('Error uploading video');
        }

        // Update upload data in MongoDB
        const updateData = await Upload.findByIdAndUpdate(
            id,
            { uploadtoYT: true, authenticated: true },
            { new: true }
        );

        console.log('Upload data updated successfully');
        res.json({ message: 'Upload successful and data updated', updateData });

    } catch (error) {
        console.log('OAuth client state:', oAuth);
        console.error('Error in OAuth callback:', error);
        res.status(500).json({ error: error.message || 'An error occurred during the upload process' });
    }
});



export default router;
 