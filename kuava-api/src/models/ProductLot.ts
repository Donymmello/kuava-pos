import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Um lote de stock de um produto com `tracks_batches = true` (ver
 * Product.ts). Cada lote tem a sua própria quantidade e validade; a soma
 * das quantidades de todos os lotes com stock (`quantity > 0`) é o
 * `stock_quantity` do produto, mantido sincronizado por
 * productLotService.syncProductFromLots. `expiry_date` pode ser null
 * (mercadoria recebida sem validade indicada), esse lote fica então para
 * o fim ao ser consumido numa venda (FEFO, ver saleService.ts).
 */
export class ProductLot extends Model<InferAttributes<ProductLot>, InferCreationAttributes<ProductLot>> {
  declare id: CreationOptional<string>;
  declare tenant_id: string;
  declare product_id: string;
  declare quantity: number;
  declare expiry_date: string | null;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

ProductLot.init(
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
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      get(this: ProductLot) {
        const raw = this.getDataValue('quantity');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    expiry_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'ProductLot',
    tableName: 'product_lots',
    indexes: [{ fields: ['product_id', 'expiry_date'] }, { fields: ['tenant_id'] }],
  },
);
