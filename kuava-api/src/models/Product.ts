import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
} from 'sequelize';
import { sequelize } from '../config/database';

export class Product extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {
  declare id: CreationOptional<string>;
  declare tenant_id: string;
  declare barcode: string | null;
  declare name: string;
  declare price: number;
  declare cost_price: number;
  declare stock_quantity: number;
  declare min_stock_alert: CreationOptional<number>;
  declare tax_rate: CreationOptional<number>;
  declare category: string | null;
  declare is_active: CreationOptional<boolean>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Product.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    barcode: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get(this: Product) {
        const raw = this.getDataValue('price');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    cost_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      get(this: Product) {
        const raw = this.getDataValue('cost_price');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    stock_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    min_stock_alert: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    tax_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.16,
      get(this: Product) {
        const raw = this.getDataValue('tax_rate');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: true,
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
    modelName: 'Product',
    tableName: 'products',
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'barcode'],
        name: 'products_tenant_id_barcode_unique',
        where: {
          barcode: { [Op.ne]: null },
        },
      },
    ],
  },
);
