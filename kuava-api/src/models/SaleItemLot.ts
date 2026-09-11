import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Regista exatamente quanto um item de venda tirou de cada lote (um mesmo
 * item pode atravessar mais que um lote, ver
 * productLotService.consumeFromLots). Sem isto, cancelar uma venda de um
 * produto com `tracks_batches = true` não saberia a qual lote devolver a
 * quantidade (ver productLotService.restoreToLots).
 */
export class SaleItemLot extends Model<InferAttributes<SaleItemLot>, InferCreationAttributes<SaleItemLot>> {
  declare id: CreationOptional<string>;
  declare sale_item_id: string;
  declare product_lot_id: string;
  declare quantity: number;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

SaleItemLot.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sale_item_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_lot_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      get(this: SaleItemLot) {
        const raw = this.getDataValue('quantity');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'SaleItemLot',
    tableName: 'sale_item_lots',
    indexes: [{ fields: ['sale_item_id'] }, { fields: ['product_lot_id'] }],
  },
);
