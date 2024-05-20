// models/User.js
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../dbConnect.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

class User extends Model {
  static async hashPassword(password) {
    return bcrypt.hash(password, 8);
  }

  // Correct use of async/await in verifyPassword method
  async verifyPassword(password) {
    try {
      const comparisonResult = await bcrypt.compare(password, this.password);
      console.log("Password comparison result:", comparisonResult);
      return comparisonResult;
    } catch (error) {
      console.error("Error comparing password:", error);
      throw error;
    }
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      user.password = await User.hashPassword(user.password);
      // user.userToken = uuidv4();
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await User.hashPassword(user.password);
      }
    },
  }
});

export default User;
