import { sequelize } from '../config/database';
import { Tenant } from './Tenant';
import { User } from './User';
import { Product } from './Product';
import { Sale } from './Sale';
import { SaleItem } from './SaleItem';
import { SubscriptionRequest } from './SubscriptionRequest';
import { ProductLot } from './ProductLot';
import { SaleItemLot } from './SaleItemLot';

// Tenant 1:N Users
Tenant.hasMany(User, { foreignKey: 'tenant_id', as: 'users' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Tenant 1:N Products
Tenant.hasMany(Product, { foreignKey: 'tenant_id', as: 'products' });
Product.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Tenant 1:N Sales
Tenant.hasMany(Sale, { foreignKey: 'tenant_id', as: 'sales' });
Sale.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// User 1:N Sales
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sale 1:N SaleItems
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

// Product 1:N SaleItems
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'saleItems' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Tenant 1:N SubscriptionRequests
Tenant.hasMany(SubscriptionRequest, { foreignKey: 'tenant_id', as: 'subscriptionRequests' });
SubscriptionRequest.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

// Product 1:N ProductLots (controle por lotes, ver Product.ts)
Product.hasMany(ProductLot, { foreignKey: 'product_id', as: 'lots', onDelete: 'CASCADE' });
ProductLot.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// SaleItem 1:N SaleItemLots (um item pode atravessar mais que um lote)
SaleItem.hasMany(SaleItemLot, { foreignKey: 'sale_item_id', as: 'lotConsumptions', onDelete: 'CASCADE' });
SaleItemLot.belongsTo(SaleItem, { foreignKey: 'sale_item_id', as: 'saleItem' });

// ProductLot 1:N SaleItemLots
ProductLot.hasMany(SaleItemLot, { foreignKey: 'product_lot_id', as: 'consumptions' });
SaleItemLot.belongsTo(ProductLot, { foreignKey: 'product_lot_id', as: 'productLot' });

export { sequelize, Tenant, User, Product, Sale, SaleItem, SubscriptionRequest, ProductLot, SaleItemLot };
