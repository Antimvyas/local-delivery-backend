exports.validateFoodSet = (req, res, next) => {
  const { food_name, cost } = req.body;
  if (!food_name || !cost) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  next();
};

exports.validateFoodUpdate = (req, res, next) => {
  const { food_id, food_name, cost } = req.body;
  if (!food_id || !food_name || !cost) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  next();
};

exports.validateFoodDelete = (req, res, next) => {
  const { food_id } = req.body;
  if (!food_id) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  next();
};
