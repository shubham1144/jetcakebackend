const jwt = require('jsonwebtoken');

const JWT_SECRET = require('./config');

const createJWToken = (userDetails) =>{
  let token = jwt.sign(userDetails, JWT_SECRET, {
      expiresIn: '6h',
      algorithm: 'HS256'
  })
  return token
}
module.exports =  createJWToken;