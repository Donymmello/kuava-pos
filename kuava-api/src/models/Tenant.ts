import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../config/database';

export class Tenant extends Model<InferAttributes<Tenant>, InferCreationAttributes<Tenant>> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare nuit: string;
  declare address: string | null;
  declare phone: string | null;
  declare email: string | null;
  declare default_tax_rate: CreationOptional<number>;
  declare is_active: CreationOptional<boolean>;
  // Plano/trial (2026-08-24): trial_ends_at fica null para tenants criados
  // antes desta funcionalidade, só um registo novo (authService.registerTenant)
  // define os dois.
  declare trial_ends_at: Date | null;
  /**
   * Substitui o antigo `subscription_active` booleano (2026-09-09): null
   * significa sem subscrição paga ativa (só o trial conta, se ainda válido),
   * uma data no futuro significa pago até lá. Estende-se a cada confirmação
   * de um pedido de assinatura (ver subscriptionService.confirmSubscriptionRequest),
   * nunca é editada à mão. Tenants que já estavam com o plano ativo antes
   * desta mudança ficam com uma data bem no futuro (ver a migração), para
   * continuarem a funcionar sem qualquer alteração.
   */
  declare subscription_expires_at: Date | null;
  /**
   * Dias que faltavam no último aviso de fim de trial enviado (7, 3 ou 1),
   * ou null se ainda não foi enviado nenhum. Só existe para o agendador não
   * repetir o mesmo aviso a cada passagem, ver services/trialReminderService.ts.
   */
  declare trial_reminder_days_sent: CreationOptional<number | null>;
  declare readonly created_at: CreationOptional<Date>;
  declare readonly updated_at: CreationOptional<Date>;
}

Tenant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    nuit: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        len: [9, 20],
      },
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    default_tax_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.16,
      get(this: Tenant) {
        const raw = this.getDataValue('default_tax_rate');
        return raw === null || raw === undefined ? raw : parseFloat(raw as unknown as string);
      },
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    subscription_expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trial_reminder_days_sent: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Tenant',
    tableName: 'tenants',
  },
);
