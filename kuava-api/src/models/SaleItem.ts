import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';

export class SaleItem extends Model<InferAttributes<SaleItem>, InferCreationAttributes<SaleItem>> {
  declare id: CreationOptional<string>;
  declare sale_id: string;
  declare product_id: string;
  declare quantity: number;
  declare unit_price: number;
  declare subtotal: number;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

SaleItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sale_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      // DECIMAL, não INTEGER: produtos vendidos por peso/comprimento (ver
      // ProductUnit em types/enums.ts) podem ter quantidade fracionária,
      // ex.: 2.5 kg de prego.
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      validate: {
        min: 0.001,
      },
      get(this: SaleItem) {
        const raw = this.getDataValue('quantity');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get(this: SaleItem) {
        const raw = this.getDataValue('unit_price');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get(this: SaleItem) {
        const raw = this.getDataValue('subtotal');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'SaleItem',
    tableName: 'sale_items',
    indexes: [{ fields: ['sale_id'] }, { fields: ['product_id'] }],
  },
);
