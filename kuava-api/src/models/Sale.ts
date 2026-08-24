import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Op,
} from 'sequelize';
import { sequelize } from '../config/database';
import { MobileMoneyFlow, PaymentMethod, SaleStatus } from '../types/enums';

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
   * venda em segurança sem duplicar — ver services/saleService.ts.
   */
  declare client_ref: string | null;
  /** Só preenchido quando payment_method é MPESA/EMOLA — ver enums.ts. */
  declare mobile_money_flow: MobileMoneyFlow | null;
  /** Referência de confirmação da SMS, quando mobile_money_flow é TRANSFER. */
  declare payment_reference: string | null;
  /** Margem/comissão retida pela loja, quando mobile_money_flow é AGENT. */
  declare agent_margin_amount: number | null;
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
    mobile_money_flow: {
      type: DataTypes.ENUM(...Object.values(MobileMoneyFlow)),
      allowNull: true,
    },
    payment_reference: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    agent_margin_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get(this: Sale) {
        const raw = this.getDataValue('agent_margin_amount');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
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
