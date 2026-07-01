const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { uploadFood } = require('../config/cloudinary');
const { 
  validateFoodSet, 
  validateFoodUpdate, 
  validateFoodDelete 
} = require('../validations/foodValidation');

router.get('/food', foodController.getFoods);

router.post(
  '/food-set', 
  verifyToken, 
  requireRole('vendor'), 
  uploadFood.single('food_img'), 
  validateFoodSet, 
  foodController.addFood
);

router.post(
  '/food-update', 
  verifyToken, 
  requireRole('vendor'), 
  uploadFood.single('food_img'), 
  validateFoodUpdate, 
  foodController.updateFood
);

router.put(
  '/food-update', 
  verifyToken, 
  requireRole('vendor'), 
  uploadFood.single('food_img'), 
  validateFoodUpdate, 
  foodController.updateFood
);

router.delete(
  '/food-delete', 
  verifyToken, 
  requireRole('vendor'), 
  validateFoodDelete, 
  foodController.deleteFood
);

router.post(
  '/food-delete', 
  verifyToken, 
  requireRole('vendor'), 
  validateFoodDelete, 
  foodController.deleteFood
);

module.exports = router;
