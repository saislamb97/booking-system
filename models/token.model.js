import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../dbConnect.js';
import User from './user.model.js';

class Token extends Model {}

Token.init({
  // Token ID
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false
  },
  // User ID - foreign key from the User model
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    }
  },
  // The jti
  jti: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // The token itself
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM,
    values: ['refresh', 'access'],
    allowNull: false
  },
  // Token expiry date
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Soft deletion timestamp
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  // Any additional data you might want to store, such as the token's intended scope
  metaData: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Token',
  tableName: 'tokens',
  timestamps: true, // Enable timestamps if you want createdAt and updatedAt
  paranoid: true, // This enables the soft delete feature.
});

// Optional: If you want to enforce the relationship at the Sequelize level
User.hasMany(Token, { foreignKey: 'userId' });
Token.belongsTo(User, { foreignKey: 'userId' });

export default Token;
