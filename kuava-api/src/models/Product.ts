import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
} from 'sequelize';
import { sequelize } from '../config/database';
import { ProductUnit } from '../types/enums';

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
  /** Unidade em que o produto é vendido, UN (padrão) ou uma unidade fracionária (KG/G/L/M). */
  declare unit: CreationOptional<ProductUnit>;
  /**
   * Data de validade (opcional), string "AAAA-MM-DD" (DATEONLY, sem hora),
   * relevante sobretudo para farmácias. `null` significa "não aplicável"
   * (a maioria dos produtos de mercearia/ferragens não tem validade a
   * controlar), nunca "desconhecida".
   */
  declare expiry_date: string | null;
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
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      get(this: Product) {
        const raw = this.getDataValue('stock_quantity');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    min_stock_alert: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 5,
      get(this: Product) {
        const raw = this.getDataValue('min_stock_alert');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
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
    unit: {
      type: DataTypes.ENUM(...Object.values(ProductUnit)),
      allowNull: false,
      defaultValue: ProductUnit.UN,
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
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
