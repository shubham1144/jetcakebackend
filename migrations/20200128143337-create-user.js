'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        unique: true
      },
      contactNumber: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      dob: {
        type: Sequelize.STRING
      },
      address: {
        type: Sequelize.STRING
      },
      securityAns1: {
        type: Sequelize.STRING
      },
      securityAns2: {
        type: Sequelize.STRING
      },
      securityAns3: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('users');
  }
};