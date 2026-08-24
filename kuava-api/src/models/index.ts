import { sequelize } from '../config/database';
import { Tenant } from './Tenant';
import { User } from './User';
import { Product } from './Product';
import { Sale } from './Sale';
import { SaleItem } from './SaleItem';

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

export { sequelize, Tenant, User, Product, Sale, SaleItem };
