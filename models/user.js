'use strict';
module.exports = (sequelize, DataTypes) => {
  const user = sequelize.define('user', {
    email: DataTypes.STRING,
    contactNumber: DataTypes.STRING,
    password: DataTypes.STRING,
    dob: DataTypes.STRING,
    address: DataTypes.STRING,
    securityAns1: DataTypes.STRING,
    securityAns2: DataTypes.STRING,
    securityAns3: DataTypes.STRING,
  }, {});
  user.associate = function(models) {
    // associations can be defined here
  };
  return user;
};