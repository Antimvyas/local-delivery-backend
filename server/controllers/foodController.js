const foodRepository = require('../repositories/foodRepository');
const { cloudinary } = require('../config/cloudinary');
const logger = require('../utils/logger');

const sendSuccess = (res, message, data, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

exports.getFoods = async (req, res, next) => {
  try {
    const { vendor_id } = req.query;
    if (!vendor_id) {
      return res.status(400).json({ error: 'Missing vendor_id parameter' });
    }
    const results = await foodRepository.findFoods(vendor_id);
    if (results.length === 0) {
      return res.status(404).json({ message: 'No food items found' });
    }
    return res.json(results);
  } catch (err) {
    next(err);
  }
};

exports.addFood = async (req, res, next) => {
  try {
    const { food_name, cost, food_type, food_description } = req.body;
    const vendor_id = req.user.user_id;
    const food_img = req.file ? req.file.path : null;
    const food_img_public_id = req.file ? req.file.filename : null;

    const foodId = await foodRepository.createFood({
      food_name,
      cost: parseFloat(cost),
      food_img,
      food_img_public_id,
      food_type,
      food_description,
      vendor_id
    });

    logger.info(`Food item added successfully: foodId=${foodId}, vendorId=${vendor_id}`);

    return sendSuccess(res, 'Food item added successfully!', { food_id: foodId }, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateFood = async (req, res, next) => {
  try {
    const { food_id, food_name, cost, food_type, food_description } = req.body;
    const vendor_id = req.user.user_id;
    const food_img = req.file ? req.file.path : null;
    const food_img_public_id = req.file ? req.file.filename : null;

    const owns = await foodRepository.verifyFoodOwnership(food_id, vendor_id);
    if (!owns) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this food item.' });
    }

    const currentFood = await foodRepository.findFoodById(food_id);
    if (!currentFood) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    // Delete the old image from Cloudinary if a new image was uploaded
    if (food_img && currentFood.food_img_public_id) {
      cloudinary.uploader.destroy(currentFood.food_img_public_id, (err) => {
        if (err) logger.error('Error deleting old food image from Cloudinary:', err);
      });
    }

    const updateData = {
      food_name,
      cost: parseFloat(cost),
      food_type,
      food_description
    };

    if (food_img) {
      updateData.food_img = food_img;
      updateData.food_img_public_id = food_img_public_id;
    }

    await foodRepository.updateFood(food_id, updateData);
    logger.info(`Food item updated successfully: foodId=${food_id}`);

    return sendSuccess(res, 'Food item updated successfully!', {});
  } catch (err) {
    next(err);
  }
};

exports.deleteFood = async (req, res, next) => {
  try {
    const { food_id } = req.body;
    const vendor_id = req.user.user_id;

    const owns = await foodRepository.verifyFoodOwnership(food_id, vendor_id);
    if (!owns) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this food item.' });
    }

    const currentFood = await foodRepository.findFoodById(food_id);
    if (!currentFood) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    await foodRepository.deleteFood(food_id);

    // Delete image from Cloudinary if it exists
    if (currentFood.food_img_public_id) {
      cloudinary.uploader.destroy(currentFood.food_img_public_id, (err) => {
        if (err) logger.error('Error deleting food image from Cloudinary on delete:', err);
      });
    }

    logger.info(`Food item deleted successfully: foodId=${food_id}`);

    return sendSuccess(res, 'Food item deleted successfully!', {});
  } catch (err) {
    next(err);
  }
};
