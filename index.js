import credentials from './credentials.json' with { type: 'json' };
import express, { json } from 'express';
import cors from 'cors';
import { createReadStream } from 'fs';
import multer, { diskStorage } from 'multer';
import pkg from 'youtube-api';
const { videos, authenticate } = pkg;
const { web } = credentials;
import openurl from 'openurl'
const app = express();
app.use(cors());
app.use(json());

const storage = diskStorage({
  destination: './',
  filename(req, file, cb) {
    const newFileName = `${Date.now()}-${file.originalname}`;
    cb(null, newFileName);
  }
});

const uploadVideoFile = multer({
  storage: storage,
}).single('videoFile');

// Test endpoint to ensure server is working
app.post('/hey', (req, res) => {
  openurl.open("https://monkeytype.com",()=>{
    console.log('heyyyy')
  })
});

// Updated upload route using res.redirect instead of openurl
app.post('/upload', (req, res) => {
  console.log('Entered upload endpoint');

  uploadVideoFile(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).send({ error: 'Multer error occurred during the upload.' });
    } else if (err) {
      console.error('Unknown error:', err);
      return res.status(500).send({ error: 'An error occurred during the upload.' });
    }

    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).send({ error: 'No file uploaded.' });
    }

    console.log('File uploaded successfully:', req.file.filename);
    const filename = req.file.filename; 
    const { title, description } = req.body;
 
    // Generate the OAuth authorization URL 
    const authUrl = oAuth.generateAuthUrl({
      access_type: 'offline',
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      state: JSON.stringify({ filename, title, description }),
    });

    console.log('Generated Auth URL:', authUrl);

    // Redirect the client to the OAuth URL
    res.json({
        authUrl,
    })
  });
});

app.get('/oauth2callback', (req, res) => {
    console.log('entered')
  res.redirect('http://localhost:3000/success');
  const { filename, title, description } = JSON.parse(req.query.state);
  oAuth.getToken(req.query.code, (err, token) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(token,'tok')
    oAuth.setCredentials(token);

    videos.insert({
      resource: {
        snippet: { title, description },
        status: { privacyStatus: 'private' },
      },
      part: 'snippet,status',
      media: {
        body: createReadStream(filename)
      }
    }, (err, data) => {
      if (err) {
        console.error('Error uploading video:', err);
      } else {
        console.log('Upload successful');
      }
      
    });
  });
});

const oAuth = authenticate({
  type: 'oauth',
  client_id: web.client_id,
  client_secret: web.client_secret,
  redirect_url: web.redirect_uris[0]
});

app.listen(8000, () => {
  console.log('App is listening at port 8000');
});
