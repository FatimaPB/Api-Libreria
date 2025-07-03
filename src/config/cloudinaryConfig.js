// config/cloudinaryConfig.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dl91kein6', // Reemplaza con tu Cloud Name
  api_key: process.env.CLOUDINARY_API_KEY,       // Reemplaza con tu API Key
  api_secret: process.env.CLOUDINARY_API_SECRET, // Reemplaza con tu API Secret
  
});

module.exports = cloudinary;
