import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';
import { SubscriptionPlan, SubscriptionRequestStatus } from '../types/enums';

/**
 * Pedido de assinatura da plataforma Kuava (2026-09-09): criado quando um
 * ADMIN escolhe um plano na página de assinatura, mostra uma fatura
 * pro-forma com uma referência única para o pagamento por transferência, e
 * fica PENDING até o superadmin confirmar (ou cancelar) manualmente, ver
 * subscriptionService.ts. Não é o mesmo que Sale (essas são vendas do
 * balcão de um tenant aos seus próprios clientes).
 */
export class SubscriptionRequest extends Model<
  InferAttributes<SubscriptionRequest>,
  InferCreationAttributes<SubscriptionRequest>
> {
  declare id: CreationOptional<string>;
  declare tenant_id: string;
  declare plan: SubscriptionPlan;
  declare amount: number;
  /** Código curto e único, o cliente coloca na descrição da transferência para o superadmin conseguir identificar o pagamento. */
  declare reference: string;
  declare status: CreationOptional<SubscriptionRequestStatus>;
  declare confirmed_at: Date | null;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

SubscriptionRequest.init(
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
    plan: {
      type: DataTypes.ENUM(...Object.values(SubscriptionPlan)),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      get(this: SubscriptionRequest) {
        const raw = this.getDataValue('amount');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    reference: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SubscriptionRequestStatus)),
      allowNull: false,
      defaultValue: SubscriptionRequestStatus.PENDING,
    },
    confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'SubscriptionRequest',
    tableName: 'subscription_requests',
  },
);
