import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
} from 'sequelize';
import { sequelize } from '../config/database';
import { PaymentMethod, SaleStatus } from '../types/enums';

export class Sale extends Model<InferAttributes<Sale>, InferCreationAttributes<Sale>> {
  declare id: CreationOptional<string>;
  declare tenant_id: string;
  declare user_id: string;
  declare total_amount: number;
  declare tax_amount: number;
  declare payment_method: PaymentMethod;
  declare status: CreationOptional<SaleStatus>;
  /**
   * Chave de idempotência opcional gerada no cliente (ex.: uma venda feita
   * offline no POS e sincronizada mais tarde). Permite reenviar a mesma
   * venda em segurança sem duplicar, ver services/saleService.ts.
   */
  declare client_ref: string | null;
  /** Referência livre e opcional, preenchida pelo caixa quando payment_method é TRANSFER. */
  declare payment_reference: string | null;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Sale.init(
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get(this: Sale) {
        const raw = this.getDataValue('total_amount');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    tax_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get(this: Sale) {
        const raw = this.getDataValue('tax_amount');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    payment_method: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SaleStatus)),
      allowNull: false,
      defaultValue: SaleStatus.COMPLETED,
    },
    client_ref: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    payment_reference: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Sale',
    tableName: 'sales',
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['tenant_id', 'created_at'] },
      {
        unique: true,
        fields: ['tenant_id', 'client_ref'],
        name: 'sales_tenant_id_client_ref_unique',
        where: {
          client_ref: { [Op.ne]: null },
        },
      },
    ],
  },
);
