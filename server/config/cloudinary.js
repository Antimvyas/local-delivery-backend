const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary using environmental variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const createStorage = (subfolder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `local-delivery/${subfolder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit' }]
    }
  });
};

const foodStorage = createStorage('foods');
const vendorStorage = createStorage('vendors');
const customerStorage = createStorage('customers');
const bannerStorage = createStorage('banners');
const reviewStorage = createStorage('reviews');

module.exports = {
  cloudinary,
  uploadFood: multer({ storage: foodStorage }),
  uploadVendor: multer({ storage: vendorStorage }),
  uploadCustomer: multer({ storage: customerStorage }),
  uploadBanner: multer({ storage: bannerStorage }),
  uploadReview: multer({ storage: reviewStorage })
};
