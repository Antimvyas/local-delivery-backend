const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes('require(\'bcrypt\')')) {
  code = code.replace("const { promisify } = require('util');", "const { promisify } = require('util');\nconst bcrypt = require('bcrypt');\nconst jwt = require('jsonwebtoken');\nrequire('dotenv').config();");
}

const verifyTokenCode = `
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Invalid token format.' });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
`;

if (!code.includes('const verifyToken =')) {
  code = code.replace('// Input validation helpers', verifyTokenCode + '\n// Input validation helpers');
}

const publicEndpoints = [
  '/',
  '/api/v1/food',
  '/api/v1/set-data',
  '/api/v1/login',
  '/api/v1/vendors',
];

const routeRegex = /app\.(get|post|put|delete|patch)\(['"](\/api\/v1\/[^'"]+)['"],\s*(asyncHandler\(|validateVendorId|upload\.single|\(req,\s*res\))/g;

code = code.replace(routeRegex, (match, verb, path, handler) => {
  if (publicEndpoints.includes(path) || path.startsWith('/api/v1/food')) {
    return match; 
  }
  return `app.${verb}('${path}', verifyToken, ${handler}`;
});

fs.writeFileSync('server.js', code);
console.log('Routes protected');
