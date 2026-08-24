import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';
import { UserRole } from '../types/enums';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  // null só para SUPERADMIN — todos os outros papéis pertencem sempre a um
  // estabelecimento.
  declare tenant_id: string | null;
  declare name: string;
  declare email: string;
  declare password_hash: string;
  declare role: UserRole;
  declare is_active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.CASHIER,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    indexes: [
      // Único globalmente, não só por estabelecimento: o login (e o token
      // JWT que ele emite) não pede ao utilizador para escolher a loja, só
      // email+senha. Se o mesmo email existisse em dois estabelecimentos,
      // User.findOne({ where: { email } }) no login devolveria sempre o
      // mesmo (arbitrário) dos dois, e o outro nunca conseguiria entrar.
      {
        unique: true,
        fields: ['email'],
        name: 'users_email_unique',
      },
    ],
  },
);
