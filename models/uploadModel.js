import mongoose from 'mongoose'

const UploadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    default:''
  },
  uploadtos3: {
    type: Boolean,
    default:false
  },
  uploadtoYT: {
    type: Boolean,
    default:false
  },
  authenticated: {
    type: Boolean,
    default:false
  },
  uploader: {
    type: String,
    default:''
  },
  youtubeAccount: {
    type: String,
    default:''
  },
  
});

// Create the User model
const Upload = mongoose.model('Upload', UploadSchema);

// Export the User model
export default Upload
