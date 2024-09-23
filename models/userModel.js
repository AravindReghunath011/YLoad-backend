import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password:{
    type: String,
    required: true
  }
},
{timestamps:true});

// Create the User model
const User = mongoose.model('Users', userSchema);

// Export the User model
export default User
