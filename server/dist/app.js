import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Prisma, Role, SaleStatus, PaymentMethod, InventoryMovementType, Unit, CouponType, PromotionType, DrawerStatus, CashMovementType } from '@prisma/client';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { authRequired, authenticate, requireRole } from './lib/auth.js';
import { currencyFormatter, toNumber } from './lib/money.js';
import { errorHandler, notFound } from './middleware/error.js';
import { defaultSystemSettings } from './lib/bootstrap.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '..', env.uploadsDir.replace(/^server[\/]/, ''));
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
    storage: multer.diskStorage({
        destination: uploadsDir,
        filename: (_req, file, callback) => {
            const safeName = `${Date.now()}-${file.originalname}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
            callback(null, safeName);
        }
    })
});
const app = express();
function isDevClientOrigin(origin) {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
app.use(cors({
    origin(origin, callback) {
        if (!origin || origin === env.clientUrl || isDevClientOrigin(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
const money = currencyFormatter(env.currencyCode);
function sendAuthUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        name: user.name,
        role: user.role,
        active: user.active ?? true
    };
}
function logActivity(userId, action, entity, entityId, metadata) {
    return prisma.activityLog.create({
        data: {
            userId,
            action,
            entity,
            entityId,
            metadata
        }
    });
}
function productWhere(query) {
    if (!query)
        return undefined;
    return {
        OR: [
            { name: { contains: query } },
            { sku: { contains: query } },
            { barcode: { contains: query } }
        ]
    };
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((item) => typeof item === 'string');
}
function buildDiscount(subtotal, discountType, discountValue) {
    if (!discountType || !discountValue)
        return 0;
    if (discountType === 'PERCENT')
        return Number((subtotal * (discountValue / 100)).toFixed(2));
    return Math.min(subtotal, Number(discountValue.toFixed(2)));
}
function pointsEarnedFromTotal(total) {
    return Math.floor(total / 10);
}
async function enrichSale(saleId) {
    return prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            items: { include: { product: true } },
            payments: true,
            customer: true,
            user: true
        }
    });
}
app.get('/health', (_req, res) => {
    res.json({ ok: true, currency: env.currencyCode });
});
app.post('/auth/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const result = await authenticate(username, password);
        if (!result) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        res.cookie('auth_token', result.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 1000 * 60 * 60 * 24 * 7
        });
        if (result.user.role === Role.CASHIER) {
            await prisma.cashierSession.create({ data: { userId: result.user.id } });
        }
        await logActivity(result.user.id, 'auth.login', 'user', result.user.id, { username: result.user.username });
        res.json({ user: sendAuthUser(result.authUser) });
    }
    catch (error) {
        next(error);
    }
});
app.post('/auth/logout', authRequired, async (req, res, next) => {
    try {
        res.clearCookie('auth_token');
        await prisma.cashierSession.updateMany({ where: { userId: req.user?.id, active: true }, data: { active: false } });
        await logActivity(req.user?.id, 'auth.logout', 'user', req.user?.id);
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
app.get('/auth/me', authRequired, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user)
        return res.status(401).json({ message: 'Not authenticated' });
    res.json({ user: sendAuthUser(user) });
});
app.get('/dashboard/summary', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const last7 = subDays(new Date(), 6);
        const [todaySales, lowStockProducts, activeCashiers, recentSales, topProducts] = await Promise.all([
            prisma.sale.aggregate({
                where: { createdAt: { gte: todayStart, lte: todayEnd }, status: SaleStatus.COMPLETED },
                _sum: { total: true },
                _count: { _all: true }
            }),
            prisma.product.findMany({ where: { stockQuantity: { lte: 10 } }, take: 10, include: { category: true } }),
            prisma.cashierSession.count({ where: { active: true } }),
            prisma.sale.findMany({
                where: { createdAt: { gte: last7 }, status: SaleStatus.COMPLETED },
                select: { createdAt: true, total: true },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.saleItem.groupBy({
                by: ['productId', 'productName', 'sku'],
                where: { sale: { createdAt: { gte: todayStart, lte: todayEnd }, status: SaleStatus.COMPLETED } },
                _sum: { quantity: true, lineTotal: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5
            })
        ]);
        res.json({
            todaySales: {
                count: todaySales._count._all,
                revenue: toNumber(todaySales._sum.total)
            },
            lowStockProducts,
            activeCashiers,
            revenueLast7Days: recentSales.map((sale) => ({ date: format(sale.createdAt, 'EEE'), total: toNumber(sale.total) })),
            topProducts: topProducts.map((item) => ({
                productId: item.productId,
                name: item.productName,
                sku: item.sku,
                quantity: item._sum.quantity ?? 0,
                revenue: toNumber(item._sum.lineTotal)
            }))
        });
    }
    catch (error) {
        next(error);
    }
});
app.get('/products', authRequired, async (req, res, next) => {
    try {
        const query = typeof req.query.query === 'string' ? req.query.query : undefined;
        const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',').filter(Boolean) : undefined;
        const lowStock = req.query.lowStock === 'true';
        const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
        const products = await prisma.product.findMany({
            where: {
                ...(ids ? { id: { in: ids } } : {}),
                ...(productWhere(query) ?? {}),
                ...(categoryId ? { categoryId } : {}),
                ...(lowStock ? { stockQuantity: { lte: 10 } } : {})
            },
            include: { category: true },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ products });
    }
    catch (error) {
        next(error);
    }
});
app.post('/products', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), upload.single('image'), async (req, res, next) => {
    try {
        const body = req.body;
        const categoryId = body.categoryId;
        if (!categoryId)
            return res.status(400).json({ message: 'Category is required' });
        const product = await prisma.product.create({
            data: {
                name: body.name,
                sku: body.sku,
                barcode: body.barcode || null,
                categoryId,
                price: new Prisma.Decimal(body.price ?? '0'),
                costPrice: new Prisma.Decimal(body.costPrice ?? '0'),
                stockQuantity: Number(body.stockQuantity ?? 0),
                lowStockThreshold: Number(body.lowStockThreshold ?? 10),
                unit: body.unit ?? Unit.PIECE,
                imageUrl: req.file ? `/uploads/${req.file.filename}` : body.imageUrl || null,
                expiryTracked: body.expiryTracked === 'true',
                active: body.active !== 'false'
            },
            include: { category: true }
        });
        await logActivity(req.user?.id, 'product.create', 'product', product.id, { sku: product.sku, name: product.name });
        res.status(201).json({ product });
    }
    catch (error) {
        next(error);
    }
});
app.put('/products/:id', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), upload.single('image'), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const body = req.body;
        const product = await prisma.product.update({
            where: { id },
            data: {
                name: body.name,
                sku: body.sku,
                barcode: body.barcode || null,
                categoryId: body.categoryId,
                price: body.price ? new Prisma.Decimal(body.price) : undefined,
                costPrice: body.costPrice ? new Prisma.Decimal(body.costPrice) : undefined,
                stockQuantity: body.stockQuantity ? Number(body.stockQuantity) : undefined,
                lowStockThreshold: body.lowStockThreshold ? Number(body.lowStockThreshold) : undefined,
                unit: body.unit ? body.unit : undefined,
                imageUrl: req.file ? `/uploads/${req.file.filename}` : body.imageUrl || undefined,
                expiryTracked: body.expiryTracked ? body.expiryTracked === 'true' : undefined,
                active: body.active ? body.active === 'true' : undefined
            },
            include: { category: true }
        });
        await logActivity(req.user?.id, 'product.update', 'product', product.id, { sku: product.sku, name: product.name });
        res.json({ product });
    }
    catch (error) {
        next(error);
    }
});
app.delete('/products/:id', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        // Check if product has sales or refunds
        const saleItems = await prisma.saleItem.count({ where: { productId: id } });
        const refundItems = await prisma.refundItem.count({ where: { productId: id } });
        if (saleItems > 0 || refundItems > 0) {
            return res.status(400).json({ message: 'Cannot delete product because it has past sales or refunds. Please deactivate it instead.' });
        }
        // Safe to delete: clean up inventory history first, then delete product
        await prisma.inventoryMovement.deleteMany({ where: { productId: id } });
        await prisma.product.delete({ where: { id } });
        await logActivity(req.user?.id, 'product.delete', 'product', id);
        res.json({ ok: true });
    }
    catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Cannot delete product because it has past sales or inventory history. Please deactivate it instead.' });
        }
        next(error);
    }
});
app.get('/categories', authRequired, async (_req, res, next) => {
    try {
        const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
        res.json({ categories });
    }
    catch (error) {
        next(error);
    }
});
app.post('/categories', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const { name, slug } = req.body;
        if (!name || !slug)
            return res.status(400).json({ message: 'Name and slug are required' });
        const category = await prisma.category.create({ data: { name, slug } });
        await logActivity(req.user?.id, 'category.create', 'category', category.id, { name });
        res.status(201).json({ category });
    }
    catch (error) {
        next(error);
    }
});
app.put('/categories/:id', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const { name, slug } = req.body;
        const id = String(req.params.id);
        const category = await prisma.category.update({ where: { id }, data: { name, slug } });
        await logActivity(req.user?.id, 'category.update', 'category', category.id, { name });
        res.json({ category });
    }
    catch (error) {
        next(error);
    }
});
app.delete('/categories/:id', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        // Check if any products use this category before deleting
        const productCount = await prisma.product.count({ where: { categoryId: id } });
        if (productCount > 0) {
            return res.status(400).json({ message: 'Cannot delete category because it has products assigned to it. Please reassign or delete those products first.' });
        }
        await prisma.category.delete({ where: { id } });
        await logActivity(req.user?.id, 'category.delete', 'category', id);
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
app.get('/suppliers', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (_req, res, next) => {
    try {
        const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ suppliers });
    }
    catch (error) {
        next(error);
    }
});
app.post('/suppliers', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const supplier = await prisma.supplier.create({ data: req.body });
        await logActivity(req.user?.id, 'supplier.create', 'supplier', supplier.id, supplier);
        res.status(201).json({ supplier });
    }
    catch (error) {
        next(error);
    }
});
app.put('/suppliers/:id', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const supplier = await prisma.supplier.update({ where: { id }, data: req.body });
        await logActivity(req.user?.id, 'supplier.update', 'supplier', supplier.id);
        res.json({ supplier });
    }
    catch (error) {
        next(error);
    }
});
app.delete('/suppliers/:id', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        await prisma.supplier.delete({ where: { id } });
        await logActivity(req.user?.id, 'supplier.delete', 'supplier', id);
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
app.get('/customers', authRequired, async (req, res, next) => {
    try {
        const query = typeof req.query.query === 'string' ? req.query.query : undefined;
        const customers = await prisma.customer.findMany({
            where: query
                ? {
                    OR: [
                        { name: { contains: query } },
                        { phone: { contains: query } },
                        { email: { contains: query } }
                    ]
                }
                : undefined,
            include: { sales: { orderBy: { createdAt: 'desc' }, take: 10 } },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ customers });
    }
    catch (error) {
        next(error);
    }
});
app.post('/customers', authRequired, async (req, res, next) => {
    try {
        const customer = await prisma.customer.create({ data: req.body });
        await logActivity(req.user?.id, 'customer.create', 'customer', customer.id);
        res.status(201).json({ customer });
    }
    catch (error) {
        next(error);
    }
});
app.put('/customers/:id', authRequired, async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const customer = await prisma.customer.update({ where: { id }, data: req.body });
        await logActivity(req.user?.id, 'customer.update', 'customer', customer.id);
        res.json({ customer });
    }
    catch (error) {
        next(error);
    }
});
app.delete('/customers/:id', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        await prisma.customer.delete({ where: { id } });
        await logActivity(req.user?.id, 'customer.delete', 'customer', id);
        res.json({ ok: true });
    }
    catch (error) {
        next(error);
    }
});
app.get('/users', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ users: users.map(sendAuthUser) });
    }
    catch (error) {
        next(error);
    }
});
app.post('/users', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        return res.status(403).json({ message: 'This installation supports one administrator account only' });
    }
    catch (error) {
        next(error);
    }
});
app.put('/users/:id', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        if (req.user?.id !== id) {
            return res.status(403).json({ message: 'Only the administrator account can be edited' });
        }
        const user = await prisma.user.update({
            where: { id },
            data: {
                username: req.body.username,
                email: req.body.email ?? null,
                name: req.body.name,
                role: Role.ADMIN,
                active: req.body.active,
                ...(req.body.password ? { passwordHash: await bcrypt.hash(String(req.body.password), 12) } : {})
            }
        });
        await logActivity(req.user?.id, 'user.update', 'user', user.id, { username: user.username, passwordChanged: Boolean(req.body.password) });
        res.json({ user: sendAuthUser(user) });
    }
    catch (error) {
        next(error);
    }
});
app.get('/inventory/movements', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (_req, res, next) => {
    try {
        const movements = await prisma.inventoryMovement.findMany({
            include: { product: true, supplier: true, createdBy: true },
            orderBy: { createdAt: 'desc' },
            take: 200
        });
        res.json({ movements });
    }
    catch (error) {
        next(error);
    }
});
app.post('/inventory/stock-in', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const { productId, quantity, supplierId, reference, note, expiresAt } = req.body;
        if (!productId || !quantity)
            return res.status(400).json({ message: 'Product and quantity are required' });
        const movement = await prisma.$transaction(async (tx) => {
            const product = await tx.product.update({ where: { id: productId }, data: { stockQuantity: { increment: Number(quantity) } } });
            await tx.stockIn.create({ data: { supplierId, reference, note, createdById: req.user?.id } });
            return tx.inventoryMovement.create({
                data: {
                    productId,
                    type: InventoryMovementType.IN,
                    quantity: Number(quantity),
                    supplierId,
                    reference,
                    note,
                    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
                    createdById: req.user?.id
                },
                include: { product: true, supplier: true }
            });
        });
        await logActivity(req.user?.id, 'inventory.stockIn', 'inventory', movement.id, movement);
        res.status(201).json({ movement });
    }
    catch (error) {
        next(error);
    }
});
app.post('/inventory/adjustments', authRequired, requireRole(Role.ADMIN, Role.STOCK_MANAGER), async (req, res, next) => {
    try {
        const { productId, quantity, reason, note } = req.body;
        if (!productId || !quantity || !reason)
            return res.status(400).json({ message: 'Product, quantity, and reason are required' });
        const movement = await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
            const nextQuantity = Math.max(0, product.stockQuantity + Number(quantity));
            await tx.product.update({ where: { id: productId }, data: { stockQuantity: nextQuantity } });
            return tx.inventoryMovement.create({
                data: {
                    productId,
                    type: InventoryMovementType.ADJUSTMENT,
                    quantity: Number(quantity),
                    reason,
                    note,
                    createdById: req.user?.id
                },
                include: { product: true }
            });
        });
        await logActivity(req.user?.id, 'inventory.adjustment', 'inventory', movement.id, { reason, quantity });
        res.status(201).json({ movement });
    }
    catch (error) {
        next(error);
    }
});
app.get('/sales', authRequired, async (req, res, next) => {
    try {
        const sales = await prisma.sale.findMany({
            include: { items: true, payments: true, customer: true, user: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ sales });
    }
    catch (error) {
        next(error);
    }
});
app.get('/sales/lookup', authRequired, async (req, res, next) => {
    try {
        const receiptNumber = typeof req.query.receipt === 'string' ? req.query.receipt : undefined;
        if (!receiptNumber)
            return res.status(400).json({ message: 'Receipt number required' });
        const sale = await prisma.sale.findUnique({
            where: { receiptNumber },
            include: { items: { include: { product: true } }, payments: true, customer: true, user: true, refunds: { include: { items: true } } }
        });
        if (!sale)
            return res.status(404).json({ message: 'Receipt not found' });
        res.json({ sale });
    }
    catch (error) {
        next(error);
    }
});
app.get('/sales/holds', authRequired, async (req, res, next) => {
    try {
        const user = req.user;
        const holds = await prisma.heldTransaction.findMany({
            where: user?.role === Role.CASHIER && user ? { cashierId: user.id } : undefined,
            include: { cashier: true, sale: true },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ holds });
    }
    catch (error) {
        next(error);
    }
});
app.get('/sales/:id', authRequired, async (req, res, next) => {
    try {
        const sale = await enrichSale(String(req.params.id));
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        res.json({ sale });
    }
    catch (error) {
        next(error);
    }
});
app.get('/sales/:id/receipt.pdf', authRequired, async (req, res, next) => {
    try {
        const sale = await enrichSale(String(req.params.id));
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        const doc = new PDFDocument({ margin: 36 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${sale.receiptNumber}.pdf`);
        doc.pipe(res);
        doc.fontSize(20).text('Supermarket Receipt', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(11).text(`Receipt: ${sale.receiptNumber}`);
        doc.text(`Date: ${format(sale.createdAt, 'PPP p')}`);
        doc.text(`Cashier: ${sale.user.name}`);
        if (sale.customer)
            doc.text(`Customer: ${sale.customer.name}`);
        doc.moveDown();
        sale.items.forEach((item) => {
            doc.text(`${item.productName} x${item.quantity}  ${money.format(toNumber(item.lineTotal))}`);
        });
        doc.moveDown();
        doc.text(`Subtotal: ${money.format(toNumber(sale.subtotal))}`);
        doc.text(`Discount: ${money.format(toNumber(sale.discountAmount))}`);
        doc.text(`Total: ${money.format(toNumber(sale.total))}`);
        doc.text(`Paid: ${money.format(toNumber(sale.amountPaid))}`);
        doc.text(`Change: ${money.format(toNumber(sale.changeAmount))}`);
        doc.end();
    }
    catch (error) {
        next(error);
    }
});
app.post('/sales/hold', authRequired, async (req, res, next) => {
    try {
        const payload = req.body;
        const hold = await prisma.heldTransaction.create({
            data: {
                cashierId: req.user.id,
                customerId: typeof payload.customerId === 'string' ? payload.customerId : undefined,
                payload: payload
            }
        });
        await logActivity(req.user?.id, 'sale.hold', 'heldTransaction', hold.id);
        res.status(201).json({ hold });
    }
    catch (error) {
        next(error);
    }
});
app.post('/sales/holds/:id/resume', authRequired, async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const hold = await prisma.heldTransaction.findUnique({ where: { id } });
        if (!hold)
            return res.status(404).json({ message: 'Hold not found' });
        await logActivity(req.user?.id, 'sale.resume', 'heldTransaction', hold.id);
        res.json({ hold });
    }
    catch (error) {
        next(error);
    }
});
app.post('/sales/checkout', authRequired, async (req, res, next) => {
    try {
        const body = req.body;
        const items = body.items ?? [];
        if (!items.length)
            return res.status(400).json({ message: 'Cart is empty' });
        const products = await prisma.product.findMany({
            where: { id: { in: items.map((item) => item.productId) } },
            include: { category: true, taxCategory: true }
        });
        // Check age verification
        const hasAgeRestrictedItem = products.some(p => p.ageRestricted && p.minAge > 0);
        if (hasAgeRestrictedItem && !body.ageVerified) {
            return res.status(400).json({ message: 'Age verification required for restricted items' });
        }
        const subtotal = Number(items.reduce((sum, item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return sum + (product ? toNumber(product.price) * item.quantity : 0);
        }, 0).toFixed(2));
        // 1. Calculate manual discount
        const discountAmount = buildDiscount(subtotal, body.discountType, body.discountValue);
        // 2. Calculate coupon discount
        let coupon = null;
        let couponDiscount = 0;
        if (body.couponCode) {
            coupon = await prisma.coupon.findUnique({
                where: { code: body.couponCode.toUpperCase(), active: true }
            });
            if (!coupon) {
                return res.status(400).json({ message: 'Invalid or inactive coupon code' });
            }
            const now = new Date();
            if (coupon.validFrom > now || (coupon.validUntil && coupon.validUntil < now)) {
                return res.status(400).json({ message: 'Coupon has expired or is not yet valid' });
            }
            if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
                return res.status(400).json({ message: 'Coupon has reached its maximum usage limit' });
            }
            if (subtotal < toNumber(coupon.minPurchase)) {
                return res.status(400).json({ message: `Minimum purchase of ${money.format(toNumber(coupon.minPurchase))} required for this coupon` });
            }
            if (coupon.type === CouponType.PERCENT) {
                couponDiscount = Number((subtotal * (toNumber(coupon.value) / 100)).toFixed(2));
            }
            else if (coupon.type === CouponType.FIXED) {
                couponDiscount = Math.min(subtotal, toNumber(coupon.value));
            }
        }
        // 3. Calculate auto-promotions
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: { active: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
            orderBy: { priority: 'desc' }
        });
        const promoItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                productId: item.productId,
                categoryId: product?.categoryId ?? '',
                quantity: item.quantity,
                price: product ? toNumber(product.price) : 0
            };
        });
        let promoDiscount = 0;
        const appliedPromos = [];
        for (const promo of promotions) {
            const config = promo.config;
            const productIds = asStringArray(promo.productIds);
            const categoryIds = asStringArray(promo.categoryIds);
            const applicableItems = promoItems.filter(item => (productIds.length === 0 && categoryIds.length === 0) ||
                productIds.includes(item.productId) ||
                categoryIds.includes(item.categoryId));
            if (applicableItems.length === 0)
                continue;
            if (promo.type === PromotionType.PERCENT_OFF) {
                const pct = Number(config.percent ?? 0);
                const discount = applicableItems.reduce((sum, i) => sum + (i.price * i.quantity * pct / 100), 0);
                if (discount > 0) {
                    const roundedDiscount = Number(discount.toFixed(2));
                    promoDiscount += roundedDiscount;
                    appliedPromos.push({ promotionId: promo.id, discount: roundedDiscount, description: `${pct}% off` });
                }
            }
            else if (promo.type === PromotionType.FIXED_OFF) {
                const amt = Number(config.amount ?? 0);
                if (amt > 0) {
                    promoDiscount += amt;
                    appliedPromos.push({ promotionId: promo.id, discount: amt, description: `$${amt} off` });
                }
            }
            else if (promo.type === PromotionType.BOGO) {
                const buyQty = Number(config.buy ?? 1);
                const freeQty = Number(config.free ?? 1);
                for (const item of applicableItems) {
                    const sets = Math.floor(item.quantity / (buyQty + freeQty));
                    if (sets > 0) {
                        const discount = Number((sets * freeQty * item.price).toFixed(2));
                        promoDiscount += discount;
                        appliedPromos.push({ promotionId: promo.id, discount, description: `Buy ${buyQty} get ${freeQty} free` });
                    }
                }
            }
            else if (promo.type === PromotionType.MULTI_BUY) {
                const minQty = Number(config.quantity ?? 2);
                const fixedPrice = Number(config.price ?? 0);
                for (const item of applicableItems) {
                    if (item.quantity >= minQty && fixedPrice > 0) {
                        const normalPrice = item.price * minQty;
                        const discount = Number(Math.max(0, normalPrice - fixedPrice).toFixed(2));
                        if (discount > 0) {
                            promoDiscount += discount;
                            appliedPromos.push({ promotionId: promo.id, discount, description: `${minQty} for $${fixedPrice}` });
                        }
                    }
                }
            }
        }
        // 4. Calculate loyalty discount
        const customer = body.customerId ? await prisma.customer.findUnique({ where: { id: body.customerId } }) : null;
        const remainingAfterDiscounts = Math.max(0, subtotal - discountAmount - couponDiscount - promoDiscount);
        const redeemable = customer ? Math.min(body.pointsToRedeem ?? 0, customer.loyaltyPoints, Math.floor(remainingAfterDiscounts)) : 0;
        const total = Math.max(0, Number((remainingAfterDiscounts - redeemable).toFixed(2)));
        // 5. Calculate taxes (inclusive VAT)
        let totalTaxAmount = 0;
        const saleItemsWithTax = items.map((cartItem) => {
            const product = products.find((entry) => entry.id === cartItem.productId);
            const rate = product.taxCategory ? toNumber(product.taxCategory.rate) : 0;
            const lineTotal = Number((toNumber(product.price) * cartItem.quantity).toFixed(2));
            const lineTax = Number((lineTotal * rate / (1 + rate)).toFixed(2));
            totalTaxAmount += lineTax;
            return {
                productId: product.id,
                productName: product.name,
                sku: product.sku,
                quantity: cartItem.quantity,
                unitPrice: product.price,
                costPrice: product.costPrice,
                taxAmount: lineTax,
                lineTotal
            };
        });
        const payments = (body.payments?.length ? body.payments : [{ method: PaymentMethod.CASH, amount: total }]).map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount),
            reference: payment.reference
        }));
        const paidAmount = Number(payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2));
        const changeAmount = Math.max(0, Number((paidAmount - total).toFixed(2)));
        const sale = await prisma.$transaction(async (tx) => {
            for (const cartItem of items) {
                const product = products.find((entry) => entry.id === cartItem.productId);
                if (!product)
                    throw new Error(`Product ${cartItem.productId} not found`);
                if (product.stockQuantity < cartItem.quantity)
                    throw new Error(`Not enough stock for ${product.name}`);
            }
            const createdSale = await tx.sale.create({
                data: {
                    receiptNumber: `R-${Date.now()}`,
                    userId: req.user.id,
                    customerId: body.customerId,
                    status: SaleStatus.COMPLETED,
                    subtotal,
                    discountType: body.discountType,
                    discountValue: body.discountValue ? new Prisma.Decimal(body.discountValue) : null,
                    discountAmount,
                    couponId: coupon?.id,
                    couponDiscount,
                    taxAmount: totalTaxAmount,
                    total,
                    amountPaid: paidAmount,
                    changeAmount,
                    pointsEarned: customer ? pointsEarnedFromTotal(total) : 0,
                    pointsRedeemed: redeemable,
                    items: {
                        create: saleItemsWithTax
                    },
                    payments: {
                        create: payments
                    },
                    appliedPromotions: {
                        create: appliedPromos.map(ap => ({
                            promotionId: ap.promotionId,
                            discount: ap.discount,
                            description: ap.description
                        }))
                    }
                },
                include: { items: true, payments: true }
            });
            for (const cartItem of items) {
                await tx.product.update({ where: { id: cartItem.productId }, data: { stockQuantity: { decrement: cartItem.quantity } } });
                await tx.inventoryMovement.create({
                    data: {
                        productId: cartItem.productId,
                        type: InventoryMovementType.OUT,
                        quantity: -cartItem.quantity,
                        reference: createdSale.receiptNumber,
                        createdById: req.user.id
                    }
                });
            }
            if (coupon) {
                await tx.coupon.update({
                    where: { id: coupon.id },
                    data: { usedCount: { increment: 1 } }
                });
            }
            if (body.customerId) {
                await tx.customer.update({
                    where: { id: body.customerId },
                    data: {
                        loyaltyPoints: { increment: pointsEarnedFromTotal(total) - redeemable }
                    }
                });
                await tx.loyaltyEntry.createMany({
                    data: [
                        ...(pointsEarnedFromTotal(total)
                            ? [{ customerId: body.customerId, saleId: createdSale.id, points: pointsEarnedFromTotal(total), type: 'EARN', note: 'Points earned from purchase' }]
                            : []),
                        ...(redeemable
                            ? [{ customerId: body.customerId, saleId: createdSale.id, points: -redeemable, type: 'REDEEM', note: 'Points redeemed at POS' }]
                            : [])
                    ]
                });
            }
            if (body.holdId) {
                await tx.heldTransaction.delete({ where: { id: body.holdId } });
            }
            return createdSale;
        });
        await logActivity(req.user?.id, 'sale.checkout', 'sale', sale.id, { receiptNumber: sale.receiptNumber, total });
        const receipt = await enrichSale(sale.id);
        res.status(201).json({ sale: receipt });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/sales', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const range = typeof req.query.range === 'string' ? req.query.range : 'monthly';
        const now = new Date();
        const start = range === 'daily' ? startOfDay(now) : range === 'weekly' ? subDays(now, 7) : subDays(now, 30);
        const sales = await prisma.sale.findMany({ where: { createdAt: { gte: start }, status: SaleStatus.COMPLETED }, include: { items: true } });
        const totals = sales.reduce((acc, sale) => {
            const subtotal = toNumber(sale.subtotal);
            const total = toNumber(sale.total);
            const cost = sale.items.reduce((sum, item) => sum + toNumber(item.costPrice) * item.quantity, 0);
            acc.revenue += total;
            acc.cost += cost;
            acc.profit += total - cost;
            acc.subtotal += subtotal;
            return acc;
        }, { revenue: 0, cost: 0, profit: 0, subtotal: 0 });
        res.json({
            range,
            summary: totals,
            salesByDay: sales.map((sale) => ({ date: format(sale.createdAt, 'yyyy-MM-dd'), total: toNumber(sale.total) })),
            itemCount: sales.reduce((sum, sale) => sum + sale.items.reduce((inner, item) => inner + item.quantity, 0), 0)
        });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/top-products', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const range = typeof req.query.range === 'string' ? req.query.range : 'monthly';
        const now = new Date();
        const start = range === 'daily' ? startOfDay(now) : range === 'weekly' ? subDays(now, 7) : subDays(now, 30);
        const topProducts = await prisma.saleItem.groupBy({
            by: ['productId', 'productName', 'sku'],
            where: { sale: { createdAt: { gte: start }, status: SaleStatus.COMPLETED } },
            _sum: { quantity: true, lineTotal: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10
        });
        res.json({
            topProducts: topProducts.map((item) => ({
                productId: item.productId,
                name: item.productName,
                sku: item.sku,
                quantity: item._sum.quantity ?? 0,
                revenue: toNumber(item._sum.lineTotal)
            }))
        });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/export', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const formatType = typeof req.query.format === 'string' ? req.query.format : 'excel';
        const sales = await prisma.sale.findMany({ include: { items: true, customer: true, user: true }, orderBy: { createdAt: 'desc' }, take: 1000 });
        if (formatType === 'pdf') {
            const doc = new PDFDocument({ margin: 36, size: 'A4' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
            doc.pipe(res);
            doc.fontSize(18).text('Sales Report', { align: 'center' });
            doc.moveDown();
            sales.slice(0, 25).forEach((sale) => {
                doc.fontSize(10).text(`${format(sale.createdAt, 'PPpp')} | ${sale.receiptNumber} | ${money.format(toNumber(sale.total))}`);
            });
            doc.end();
            return;
        }
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sales');
        sheet.columns = [
            { header: 'Receipt', key: 'receipt', width: 20 },
            { header: 'Date', key: 'date', width: 22 },
            { header: 'Cashier', key: 'cashier', width: 20 },
            { header: 'Customer', key: 'customer', width: 20 },
            { header: 'Total', key: 'total', width: 14 }
        ];
        sales.forEach((sale) => {
            sheet.addRow({
                receipt: sale.receiptNumber,
                date: format(sale.createdAt, 'PPpp'),
                cashier: sale.user.name,
                customer: sale.customer?.name ?? 'Walk-in',
                total: toNumber(sale.total)
            });
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        next(error);
    }
});
// ─── REPORTS: EXTENDED ENDPOINTS ────────────────────────────────────────────
app.get('/reports/dashboard', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const [completedSales, voidedCount, refunds] = await Promise.all([
            prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED }, include: { items: true } }),
            prisma.sale.count({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.VOIDED } }),
            prisma.refund.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { amount: true } }),
        ]);
        const revenue = completedSales.reduce((s, sale) => s + toNumber(sale.total), 0);
        const cost = completedSales.reduce((s, sale) => s + sale.items.reduce((si, item) => si + toNumber(item.costPrice) * item.quantity, 0), 0);
        const profit = revenue - cost;
        const discounts = completedSales.reduce((s, sale) => s + toNumber(sale.discountAmount) + toNumber(sale.couponDiscount), 0);
        const totalRefunds = refunds.reduce((s, r) => s + toNumber(r.amount), 0);
        const itemsSold = completedSales.reduce((s, sale) => s + sale.items.reduce((si, item) => si + item.quantity, 0), 0);
        const avgSale = completedSales.length > 0 ? revenue / completedSales.length : 0;
        res.json({
            revenue: +revenue.toFixed(2), cost: +cost.toFixed(2), profit: +profit.toFixed(2),
            transactions: completedSales.length, itemsSold, avgSale: +avgSale.toFixed(2),
            discounts: +discounts.toFixed(2), refunds: +totalRefunds.toFixed(2), voids: voidedCount,
        });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/sales-detail', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const cashierId = typeof req.query.cashierId === 'string' && req.query.cashierId ? req.query.cashierId : undefined;
        const pm = typeof req.query.paymentMethod === 'string' && req.query.paymentMethod ? req.query.paymentMethod : undefined;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Number(req.query.limit) || 50);
        const where = { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED };
        if (cashierId)
            where.userId = cashierId;
        if (pm)
            where.payments = { some: { method: pm } };
        const [sales, total, chartSales] = await Promise.all([
            prisma.sale.findMany({ where, include: { payments: true, customer: true, user: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
            prisma.sale.count({ where }),
            prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED }, select: { createdAt: true, total: true }, orderBy: { createdAt: 'asc' } }),
        ]);
        const dailyMap = {};
        for (const s of chartSales) {
            const d = format(s.createdAt, 'yyyy-MM-dd');
            dailyMap[d] = (dailyMap[d] || 0) + toNumber(s.total);
        }
        const salesByDay = Object.entries(dailyMap).map(([date, t]) => ({ date, total: +t.toFixed(2) }));
        res.json({ sales, total, page, limit, salesByDay });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/payment-methods', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const payments = await prisma.salePayment.findMany({
            where: { sale: { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED } },
            select: { method: true, amount: true },
        });
        const bm = {};
        for (const p of payments) {
            if (!bm[p.method])
                bm[p.method] = { count: 0, total: 0 };
            bm[p.method].count++;
            bm[p.method].total += toNumber(p.amount);
        }
        const grandTotal = Object.values(bm).reduce((s, b) => s + b.total, 0);
        const result = Object.entries(bm).map(([method, b]) => ({ method, count: b.count, total: +b.total.toFixed(2), percentage: grandTotal > 0 ? +((b.total / grandTotal) * 100).toFixed(1) : 0 }));
        res.json({ payments: result, grandTotal: +grandTotal.toFixed(2) });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/employees', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const [users, salesData, refundsData, voidsData] = await Promise.all([
            prisma.user.findMany({ select: { id: true, name: true, role: true } }),
            prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED }, select: { userId: true, total: true, discountAmount: true, couponDiscount: true } }),
            prisma.refund.findMany({ where: { createdAt: { gte: from, lte: to } }, select: { createdById: true, amount: true } }),
            prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.VOIDED }, select: { userId: true } }),
        ]);
        const sm = {};
        for (const u of users)
            sm[u.id] = { txns: 0, rev: 0, disc: 0, ref: 0, voids: 0 };
        for (const s of salesData) {
            if (!sm[s.userId])
                sm[s.userId] = { txns: 0, rev: 0, disc: 0, ref: 0, voids: 0 };
            sm[s.userId].txns++;
            sm[s.userId].rev += toNumber(s.total);
            sm[s.userId].disc += toNumber(s.discountAmount) + toNumber(s.couponDiscount);
        }
        for (const r of refundsData) {
            if (!sm[r.createdById])
                sm[r.createdById] = { txns: 0, rev: 0, disc: 0, ref: 0, voids: 0 };
            sm[r.createdById].ref += toNumber(r.amount);
        }
        for (const v of voidsData) {
            if (!sm[v.userId])
                sm[v.userId] = { txns: 0, rev: 0, disc: 0, ref: 0, voids: 0 };
            sm[v.userId].voids++;
        }
        const employees = users.map(u => { const s = sm[u.id] || { txns: 0, rev: 0, disc: 0, ref: 0, voids: 0 }; return { id: u.id, name: u.name, role: u.role, transactions: s.txns, revenue: +s.rev.toFixed(2), avgSale: s.txns > 0 ? +(s.rev / s.txns).toFixed(2) : 0, discounts: +s.disc.toFixed(2), refunds: +s.ref.toFixed(2), voids: s.voids }; }).sort((a, b) => b.revenue - a.revenue);
        res.json({ employees });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/customers-report', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const [allCustomers, salesInRange] = await Promise.all([
            prisma.customer.findMany({ select: { id: true, name: true, phone: true, loyaltyPoints: true, createdAt: true } }),
            prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED, customerId: { not: null } }, select: { customerId: true, total: true } }),
        ]);
        const spend = {}, txns = {};
        for (const s of salesInRange) {
            if (!s.customerId)
                continue;
            spend[s.customerId] = (spend[s.customerId] || 0) + toNumber(s.total);
            txns[s.customerId] = (txns[s.customerId] || 0) + 1;
        }
        const newCustomers = allCustomers.filter(c => c.createdAt >= from && c.createdAt <= to).length;
        const topCustomers = allCustomers.filter(c => spend[c.id]).map(c => ({ id: c.id, name: c.name, phone: c.phone ?? null, loyaltyPoints: c.loyaltyPoints, spend: +(spend[c.id] || 0).toFixed(2), transactions: txns[c.id] || 0 })).sort((a, b) => b.spend - a.spend).slice(0, 20);
        res.json({ total: allCustomers.length, newCustomers, returningCustomers: Object.keys(txns).filter(id => txns[id] > 1).length, activeInRange: Object.keys(spend).length, totalLoyaltyPoints: allCustomers.reduce((s, c) => s + c.loyaltyPoints, 0), topCustomers });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/inventory-snapshot', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        const products = await prisma.product.findMany({ include: { category: true }, orderBy: { stockQuantity: 'asc' } });
        const inventoryValue = products.reduce((s, p) => s + toNumber(p.costPrice) * p.stockQuantity, 0);
        const retailValue = products.reduce((s, p) => s + toNumber(p.price) * p.stockQuantity, 0);
        res.json({
            total: products.length,
            inStock: products.filter(p => p.stockQuantity > p.lowStockThreshold).length,
            lowStock: products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold).length,
            outOfStock: products.filter(p => p.stockQuantity === 0).length,
            inventoryValue: +inventoryValue.toFixed(2), retailValue: +retailValue.toFixed(2),
            products: products.slice(0, 150).map(p => ({ id: p.id, name: p.name, sku: p.sku, category: p.category.name, stock: p.stockQuantity, threshold: p.lowStockThreshold, costPrice: toNumber(p.costPrice), price: toNumber(p.price), value: +(toNumber(p.costPrice) * p.stockQuantity).toFixed(2), status: p.stockQuantity === 0 ? 'OUT' : p.stockQuantity <= p.lowStockThreshold ? 'LOW' : 'OK' })),
        });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/cash-drawers-report', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const drawers = await prisma.cashDrawer.findMany({ where: { openedAt: { gte: from, lte: to } }, include: { user: true, movements: true }, orderBy: { openedAt: 'desc' } });
        const result = await Promise.all(drawers.map(async (drawer) => {
            const end = drawer.closedAt ?? new Date();
            const sales = await prisma.sale.findMany({ where: { userId: drawer.userId, createdAt: { gte: drawer.openedAt, lte: end }, status: SaleStatus.COMPLETED }, include: { payments: true } });
            const totalSales = sales.reduce((s, sale) => s + toNumber(sale.total), 0);
            const cashSales = sales.reduce((s, sale) => s + sale.payments.filter(p => p.method === PaymentMethod.CASH).reduce((ps, p) => ps + toNumber(p.amount), 0), 0);
            const cardSales = sales.reduce((s, sale) => s + sale.payments.filter(p => p.method === PaymentMethod.CARD).reduce((ps, p) => ps + toNumber(p.amount), 0), 0);
            const cashIn = drawer.movements.filter(m => m.type === CashMovementType.CASH_IN).reduce((s, m) => s + toNumber(m.amount), 0);
            const cashOut = drawer.movements.filter(m => m.type === CashMovementType.CASH_OUT).reduce((s, m) => s + toNumber(m.amount), 0);
            const openingFloat = toNumber(drawer.openingFloat);
            const expectedCash = openingFloat + cashSales + cashIn - cashOut;
            const closingFloat = drawer.closingFloat ? toNumber(drawer.closingFloat) : null;
            return { id: drawer.id, cashier: drawer.user.name, openedAt: drawer.openedAt.toISOString(), closedAt: drawer.closedAt?.toISOString() ?? null, status: drawer.status, openingFloat: +openingFloat.toFixed(2), closingFloat: closingFloat != null ? +closingFloat.toFixed(2) : null, totalSales: +totalSales.toFixed(2), cashSales: +cashSales.toFixed(2), cardSales: +cardSales.toFixed(2), cashIn: +cashIn.toFixed(2), cashOut: +cashOut.toFixed(2), expectedCash: +expectedCash.toFixed(2), difference: closingFloat != null ? +(closingFloat - expectedCash).toFixed(2) : null, salesCount: sales.length };
        }));
        res.json({ drawers: result });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/tax', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 29);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const sales = await prisma.sale.findMany({ where: { createdAt: { gte: from, lte: to }, status: SaleStatus.COMPLETED }, select: { createdAt: true, taxAmount: true, total: true } });
        const totalTax = sales.reduce((s, sale) => s + toNumber(sale.taxAmount), 0);
        const dailyMap = {};
        for (const s of sales) {
            const d = format(s.createdAt, 'yyyy-MM-dd');
            if (!dailyMap[d])
                dailyMap[d] = { tax: 0, revenue: 0 };
            dailyMap[d].tax += toNumber(s.taxAmount);
            dailyMap[d].revenue += toNumber(s.total);
        }
        res.json({ totalTax: +totalTax.toFixed(2), transactionCount: sales.length, taxByDay: Object.entries(dailyMap).map(([date, v]) => ({ date, tax: +v.tax.toFixed(2), revenue: +v.revenue.toFixed(2) })) });
    }
    catch (error) {
        next(error);
    }
});
app.get('/reports/z-reports-list', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const from = req.query.from ? startOfDay(new Date(String(req.query.from))) : subDays(startOfDay(new Date()), 90);
        const to = req.query.to ? endOfDay(new Date(String(req.query.to))) : endOfDay(new Date());
        const drawers = await prisma.cashDrawer.findMany({ where: { openedAt: { gte: from, lte: to } }, include: { user: true, movements: true }, orderBy: { openedAt: 'desc' }, take: 100 });
        const result = await Promise.all(drawers.map(async (drawer, index) => {
            const end = drawer.closedAt ?? new Date();
            const [sales, refunds, voidCount] = await Promise.all([
                prisma.sale.findMany({ where: { userId: drawer.userId, createdAt: { gte: drawer.openedAt, lte: end }, status: SaleStatus.COMPLETED }, include: { payments: true } }),
                prisma.refund.findMany({ where: { createdById: drawer.userId, createdAt: { gte: drawer.openedAt, lte: end } }, select: { amount: true } }),
                prisma.sale.count({ where: { userId: drawer.userId, updatedAt: { gte: drawer.openedAt, lte: end }, status: SaleStatus.VOIDED } }),
            ]);
            const totalSales = sales.reduce((s, sale) => s + toNumber(sale.total), 0);
            const cashSales = sales.reduce((s, sale) => s + sale.payments.filter(p => p.method === PaymentMethod.CASH).reduce((ps, p) => ps + toNumber(p.amount), 0), 0);
            const cardSales = sales.reduce((s, sale) => s + sale.payments.filter(p => p.method === PaymentMethod.CARD).reduce((ps, p) => ps + toNumber(p.amount), 0), 0);
            const totalRefunds = refunds.reduce((s, r) => s + toNumber(r.amount), 0);
            const cashIn = drawer.movements.filter(m => m.type === CashMovementType.CASH_IN).reduce((s, m) => s + toNumber(m.amount), 0);
            const cashOut = drawer.movements.filter(m => m.type === CashMovementType.CASH_OUT).reduce((s, m) => s + toNumber(m.amount), 0);
            const discounts = sales.reduce((s, sale) => s + toNumber(sale.discountAmount) + toNumber(sale.couponDiscount), 0);
            const openingFloat = toNumber(drawer.openingFloat);
            const expectedCash = openingFloat + cashSales + cashIn - cashOut - totalRefunds;
            const closingFloat = drawer.closingFloat ? toNumber(drawer.closingFloat) : null;
            return { reportNumber: `Z-${String(drawers.length - index).padStart(4, '0')}`, id: drawer.id, cashier: drawer.user.name, shiftStart: drawer.openedAt.toISOString(), shiftEnd: drawer.closedAt?.toISOString() ?? null, status: drawer.status, totalSales: +totalSales.toFixed(2), cashSales: +cashSales.toFixed(2), cardSales: +cardSales.toFixed(2), discounts: +discounts.toFixed(2), totalRefunds: +totalRefunds.toFixed(2), refundsCount: refunds.length, voidsCount: voidCount, cashIn: +cashIn.toFixed(2), cashOut: +cashOut.toFixed(2), openingFloat: +openingFloat.toFixed(2), expectedCash: +expectedCash.toFixed(2), closingFloat: closingFloat != null ? +closingFloat.toFixed(2) : null, difference: closingFloat != null ? +(closingFloat - expectedCash).toFixed(2) : null, salesCount: sales.length };
        }));
        res.json({ reports: result });
    }
    catch (error) {
        next(error);
    }
});
// ─────────────────────────────────────────────────────────────────────────────
app.get('/activity', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        const activity = await prisma.activityLog.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 250 });
        res.json({ activity });
    }
    catch (error) {
        next(error);
    }
});
app.get('/cashier/sessions', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        const sessions = await prisma.cashierSession.findMany({ include: { user: true }, where: { active: true }, orderBy: { startedAt: 'desc' } });
        res.json({ sessions });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// VOID SALE
// ────────────────────────────────────────────────
app.post('/sales/:id/void', authRequired, async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { pin } = req.body;
        if (req.user?.role !== Role.ADMIN) {
            if (!pin)
                return res.status(400).json({ message: 'Manager PIN override required' });
            const managers = await prisma.user.findMany({ where: { role: Role.ADMIN, active: true, pin: { not: null } } });
            let pinValid = false;
            for (const m of managers) {
                if (m.pin && await bcrypt.compare(pin, m.pin)) {
                    pinValid = true;
                    break;
                }
            }
            if (!pinValid)
                return res.status(401).json({ message: 'Invalid manager PIN' });
        }
        const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        if (sale.status !== SaleStatus.COMPLETED)
            return res.status(400).json({ message: 'Only completed sales can be voided' });
        await prisma.$transaction(async (tx) => {
            await tx.sale.update({ where: { id }, data: { status: SaleStatus.VOIDED } });
            for (const item of sale.items) {
                await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
                await tx.inventoryMovement.create({
                    data: { productId: item.productId, type: InventoryMovementType.ADJUSTMENT, quantity: item.quantity, reference: `VOID:${sale.receiptNumber}`, createdById: req.user.id }
                });
            }
        });
        await logActivity(req.user?.id, 'sale.void', 'sale', id, { receiptNumber: sale.receiptNumber });
        const updated = await enrichSale(id);
        res.json({ sale: updated });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// VOID SINGLE LINE ITEM
// ────────────────────────────────────────────────
app.post('/sales/:saleId/items/:itemId/void', authRequired, async (req, res, next) => {
    try {
        const { saleId, itemId } = req.params;
        const { pin } = req.body;
        if (req.user?.role !== Role.ADMIN) {
            if (!pin)
                return res.status(400).json({ message: 'Manager PIN override required' });
            const managers = await prisma.user.findMany({ where: { role: Role.ADMIN, active: true, pin: { not: null } } });
            let pinValid = false;
            for (const m of managers) {
                if (m.pin && await bcrypt.compare(pin, m.pin)) {
                    pinValid = true;
                    break;
                }
            }
            if (!pinValid)
                return res.status(401).json({ message: 'Invalid manager PIN' });
        }
        const sale = await prisma.sale.findUnique({ where: { id: String(saleId) }, include: { items: true, payments: true } });
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        if (sale.status !== SaleStatus.COMPLETED)
            return res.status(400).json({ message: 'Cannot void items on non-completed sales' });
        const item = sale.items.find(i => i.id === String(itemId));
        if (!item)
            return res.status(404).json({ message: 'Item not found' });
        if (item.voided)
            return res.status(400).json({ message: 'Item already voided' });
        await prisma.$transaction(async (tx) => {
            await tx.saleItem.update({ where: { id: item.id }, data: { voided: true } });
            const newSubtotal = sale.items.filter(i => i.id !== item.id && !i.voided).reduce((sum, i) => sum + toNumber(i.lineTotal), 0);
            const newTotal = Math.max(0, newSubtotal - toNumber(sale.discountAmount));
            await tx.sale.update({ where: { id: String(saleId) }, data: { subtotal: newSubtotal, total: newTotal } });
            await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
        });
        await logActivity(req.user?.id, 'sale.voidItem', 'saleItem', item.id, { productName: item.productName });
        const updated = await enrichSale(String(saleId));
        res.json({ sale: updated });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// REFUND
// ────────────────────────────────────────────────
app.post('/sales/:id/refund', authRequired, async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { items, reason, pin } = req.body;
        if (req.user?.role !== Role.ADMIN) {
            if (!pin)
                return res.status(400).json({ message: 'Manager PIN override required' });
            const managers = await prisma.user.findMany({ where: { role: Role.ADMIN, active: true, pin: { not: null } } });
            let pinValid = false;
            for (const m of managers) {
                if (m.pin && await bcrypt.compare(pin, m.pin)) {
                    pinValid = true;
                    break;
                }
            }
            if (!pinValid)
                return res.status(401).json({ message: 'Invalid manager PIN' });
        }
        if (!items?.length)
            return res.status(400).json({ message: 'No items to refund' });
        const sale = await prisma.sale.findUnique({ where: { id }, include: { items: true } });
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        if (sale.status === SaleStatus.VOIDED)
            return res.status(400).json({ message: 'Cannot refund a voided sale' });
        const refund = await prisma.$transaction(async (tx) => {
            let totalRefundAmount = 0;
            const refundItems = [];
            for (const refundReq of items) {
                const saleItem = sale.items.find(i => i.productId === refundReq.productId && !i.voided);
                if (!saleItem)
                    continue;
                const qty = Math.min(refundReq.quantity, saleItem.quantity);
                const amount = Number((toNumber(saleItem.unitPrice) * qty).toFixed(2));
                totalRefundAmount += amount;
                refundItems.push({ productId: refundReq.productId, quantity: qty, amount });
                await tx.product.update({ where: { id: refundReq.productId }, data: { stockQuantity: { increment: qty } } });
                await tx.inventoryMovement.create({
                    data: { productId: refundReq.productId, type: InventoryMovementType.REFUND, quantity: qty, reference: `REFUND:${sale.receiptNumber}`, createdById: req.user.id }
                });
            }
            const r = await tx.refund.create({
                data: {
                    originalSaleId: id,
                    reason,
                    amount: totalRefundAmount,
                    createdById: req.user.id,
                    items: { create: refundItems }
                },
                include: { items: true }
            });
            if (totalRefundAmount >= toNumber(sale.total)) {
                await tx.sale.update({ where: { id }, data: { status: SaleStatus.REFUNDED } });
            }
            return r;
        });
        await logActivity(req.user?.id, 'sale.refund', 'refund', refund.id, { saleId: id, amount: toNumber(refund.amount) });
        res.status(201).json({ refund });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// COUPONS
// ────────────────────────────────────────────────
app.get('/coupons', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ coupons });
    }
    catch (error) {
        next(error);
    }
});
app.post('/coupons', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const { code, type, value, minPurchase, maxUses, validFrom, validUntil } = req.body;
        if (!code || !type || value == null)
            return res.status(400).json({ message: 'Code, type, and value are required' });
        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                type: type,
                value,
                minPurchase: minPurchase ?? 0,
                maxUses,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null
            }
        });
        await logActivity(req.user?.id, 'coupon.create', 'coupon', coupon.id, { code: coupon.code });
        res.status(201).json({ coupon });
    }
    catch (error) {
        next(error);
    }
});
app.post('/coupons/validate', authRequired, async (req, res, next) => {
    try {
        const { code, subtotal } = req.body;
        if (!code)
            return res.status(400).json({ valid: false, message: 'Coupon code required' });
        const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
        if (!coupon || !coupon.active)
            return res.json({ valid: false, message: 'Coupon not found or inactive' });
        const now = new Date();
        if (now < coupon.validFrom)
            return res.json({ valid: false, message: 'Coupon not yet valid' });
        if (coupon.validUntil && now > coupon.validUntil)
            return res.json({ valid: false, message: 'Coupon expired' });
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
            return res.json({ valid: false, message: 'Coupon usage limit reached' });
        if (subtotal < toNumber(coupon.minPurchase))
            return res.json({ valid: false, message: `Minimum purchase of ${money.format(toNumber(coupon.minPurchase))} required` });
        let discount = 0;
        if (coupon.type === CouponType.PERCENT) {
            discount = Number((subtotal * (toNumber(coupon.value) / 100)).toFixed(2));
        }
        else if (coupon.type === CouponType.FIXED) {
            discount = Math.min(subtotal, toNumber(coupon.value));
        }
        res.json({ valid: true, coupon, discount });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// PROMOTIONS
// ────────────────────────────────────────────────
app.get('/promotions', authRequired, async (_req, res, next) => {
    try {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: { active: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
            orderBy: { priority: 'desc' }
        });
        res.json({ promotions });
    }
    catch (error) {
        next(error);
    }
});
app.post('/promotions', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const { name, type, config, productIds, categoryIds, validFrom, validUntil, priority } = req.body;
        if (!name || !type || !config)
            return res.status(400).json({ message: 'Name, type, and config required' });
        const promotion = await prisma.promotion.create({
            data: {
                name, type: type, config: config,
                productIds: productIds ?? [], categoryIds: categoryIds ?? [],
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null,
                priority: priority ?? 0
            }
        });
        await logActivity(req.user?.id, 'promotion.create', 'promotion', promotion.id, { name });
        res.status(201).json({ promotion });
    }
    catch (error) {
        next(error);
    }
});
app.post('/promotions/match', authRequired, async (req, res, next) => {
    try {
        const { items } = req.body;
        if (!items?.length)
            return res.json({ matches: [] });
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: { active: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
            orderBy: { priority: 'desc' }
        });
        const matches = [];
        for (const promo of promotions) {
            const config = promo.config;
            const productIds = asStringArray(promo.productIds);
            const categoryIds = asStringArray(promo.categoryIds);
            const applicableItems = items.filter(item => (productIds.length === 0 && categoryIds.length === 0) ||
                productIds.includes(item.productId) ||
                categoryIds.includes(item.categoryId));
            if (applicableItems.length === 0)
                continue;
            if (promo.type === PromotionType.PERCENT_OFF) {
                const pct = Number(config.percent ?? 0);
                const discount = applicableItems.reduce((sum, i) => sum + (i.price * i.quantity * pct / 100), 0);
                if (discount > 0) {
                    matches.push({ promotionId: promo.id, name: promo.name, type: promo.type, discount: Number(discount.toFixed(2)), description: `${pct}% off`, affectedItems: applicableItems.map(i => i.productId) });
                }
            }
            else if (promo.type === PromotionType.FIXED_OFF) {
                const amt = Number(config.amount ?? 0);
                if (amt > 0) {
                    matches.push({ promotionId: promo.id, name: promo.name, type: promo.type, discount: amt, description: `${money.format(amt)} off`, affectedItems: applicableItems.map(i => i.productId) });
                }
            }
            else if (promo.type === PromotionType.BOGO) {
                const buyQty = Number(config.buy ?? 1);
                const freeQty = Number(config.free ?? 1);
                for (const item of applicableItems) {
                    const sets = Math.floor(item.quantity / (buyQty + freeQty));
                    if (sets > 0) {
                        const discount = Number((sets * freeQty * item.price).toFixed(2));
                        matches.push({ promotionId: promo.id, name: promo.name, type: promo.type, discount, description: `Buy ${buyQty} get ${freeQty} free`, affectedItems: [item.productId] });
                    }
                }
            }
            else if (promo.type === PromotionType.MULTI_BUY) {
                const minQty = Number(config.quantity ?? 2);
                const fixedPrice = Number(config.price ?? 0);
                for (const item of applicableItems) {
                    if (item.quantity >= minQty && fixedPrice > 0) {
                        const normalPrice = item.price * minQty;
                        const discount = Number(Math.max(0, normalPrice - fixedPrice).toFixed(2));
                        if (discount > 0) {
                            matches.push({ promotionId: promo.id, name: promo.name, type: promo.type, discount, description: `${minQty} for ${money.format(fixedPrice)}`, affectedItems: [item.productId] });
                        }
                    }
                }
            }
        }
        res.json({ matches });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// PIN VERIFICATION
// ────────────────────────────────────────────────
app.post('/auth/verify-pin', authRequired, async (req, res, next) => {
    try {
        const { pin } = req.body;
        if (!pin)
            return res.status(400).json({ valid: false, message: 'PIN required' });
        const managers = await prisma.user.findMany({
            where: { role: { in: [Role.ADMIN] }, active: true, pin: { not: null } }
        });
        for (const manager of managers) {
            if (manager.pin && await bcrypt.compare(pin, manager.pin)) {
                await logActivity(manager.id, 'auth.pinVerify', 'user', manager.id, { verifiedFor: 'override' });
                return res.json({ valid: true, manager: { id: manager.id, name: manager.name, role: manager.role } });
            }
        }
        res.json({ valid: false, message: 'Invalid PIN' });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// TAX CATEGORIES
// ────────────────────────────────────────────────
app.get('/tax-categories', authRequired, async (_req, res, next) => {
    try {
        const categories = await prisma.taxCategory.findMany({ orderBy: { name: 'asc' } });
        res.json({ categories });
    }
    catch (error) {
        next(error);
    }
});
app.post('/tax-categories', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const { name, rate } = req.body;
        if (!name || rate == null)
            return res.status(400).json({ message: 'Name and rate required' });
        const category = await prisma.taxCategory.create({ data: { name, rate } });
        await logActivity(req.user?.id, 'taxCategory.create', 'taxCategory', category.id, { name, rate });
        res.status(201).json({ category });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// CASH DRAWER
// ────────────────────────────────────────────────
app.get('/cashier/drawer', authRequired, async (req, res, next) => {
    try {
        const drawer = await prisma.cashDrawer.findFirst({
            where: { userId: req.user.id, status: DrawerStatus.OPEN },
            include: { movements: { orderBy: { createdAt: 'desc' } } }
        });
        res.json({ drawer });
    }
    catch (error) {
        next(error);
    }
});
app.post('/cashier/drawer/open', authRequired, async (req, res, next) => {
    try {
        const { openingFloat } = req.body;
        if (openingFloat == null)
            return res.status(400).json({ message: 'Opening float required' });
        const existing = await prisma.cashDrawer.findFirst({ where: { userId: req.user.id, status: DrawerStatus.OPEN } });
        if (existing)
            return res.status(400).json({ message: 'Drawer already open' });
        const drawer = await prisma.cashDrawer.create({
            data: { userId: req.user.id, openingFloat }
        });
        await logActivity(req.user?.id, 'drawer.open', 'cashDrawer', drawer.id, { openingFloat });
        res.status(201).json({ drawer });
    }
    catch (error) {
        next(error);
    }
});
app.post('/cashier/drawer/cash-in', authRequired, async (req, res, next) => {
    try {
        const { amount, reason } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'Amount required' });
        const drawer = await prisma.cashDrawer.findFirst({ where: { userId: req.user.id, status: DrawerStatus.OPEN } });
        if (!drawer)
            return res.status(400).json({ message: 'No open drawer' });
        const movement = await prisma.cashMovement.create({
            data: { drawerId: drawer.id, type: CashMovementType.CASH_IN, amount, reason, createdById: req.user.id }
        });
        await logActivity(req.user?.id, 'drawer.cashIn', 'cashMovement', movement.id, { amount, reason });
        res.status(201).json({ movement });
    }
    catch (error) {
        next(error);
    }
});
app.post('/cashier/drawer/cash-out', authRequired, async (req, res, next) => {
    try {
        const { amount, reason } = req.body;
        if (!amount || amount <= 0)
            return res.status(400).json({ message: 'Amount required' });
        const drawer = await prisma.cashDrawer.findFirst({ where: { userId: req.user.id, status: DrawerStatus.OPEN } });
        if (!drawer)
            return res.status(400).json({ message: 'No open drawer' });
        const movement = await prisma.cashMovement.create({
            data: { drawerId: drawer.id, type: CashMovementType.CASH_OUT, amount, reason, createdById: req.user.id }
        });
        await logActivity(req.user?.id, 'drawer.cashOut', 'cashMovement', movement.id, { amount, reason });
        res.status(201).json({ movement });
    }
    catch (error) {
        next(error);
    }
});
app.post('/cashier/drawer/close', authRequired, async (req, res, next) => {
    try {
        const { closingFloat } = req.body;
        if (closingFloat == null)
            return res.status(400).json({ message: 'Closing float required' });
        const drawer = await prisma.cashDrawer.findFirst({
            where: { userId: req.user.id, status: DrawerStatus.OPEN },
            include: { movements: true }
        });
        if (!drawer)
            return res.status(400).json({ message: 'No open drawer' });
        const updated = await prisma.cashDrawer.update({
            where: { id: drawer.id },
            data: { status: DrawerStatus.CLOSED, closingFloat, closedAt: new Date() },
            include: { movements: true }
        });
        await logActivity(req.user?.id, 'drawer.close', 'cashDrawer', drawer.id, { closingFloat });
        res.json({ drawer: updated });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// Z-REPORT
// ────────────────────────────────────────────────
app.get('/cashier/z-report', authRequired, async (req, res, next) => {
    try {
        const drawer = await prisma.cashDrawer.findFirst({
            where: { userId: req.user.id },
            orderBy: { openedAt: 'desc' },
            include: { movements: true, user: true }
        });
        if (!drawer)
            return res.status(404).json({ message: 'No drawer session found' });
        const sessionStart = drawer.openedAt;
        const sessionEnd = drawer.closedAt ?? new Date();
        const sales = await prisma.sale.findMany({
            where: { userId: req.user.id, createdAt: { gte: sessionStart, lte: sessionEnd }, status: SaleStatus.COMPLETED },
            include: { payments: true }
        });
        const refunds = await prisma.refund.findMany({
            where: { createdById: req.user.id, createdAt: { gte: sessionStart, lte: sessionEnd } }
        });
        const voidedSales = await prisma.sale.findMany({
            where: { userId: req.user.id, updatedAt: { gte: sessionStart, lte: sessionEnd }, status: SaleStatus.VOIDED }
        });
        const totalSales = sales.reduce((sum, s) => sum + toNumber(s.total), 0);
        const cashSales = sales.reduce((sum, s) => sum + s.payments.filter(p => p.method === PaymentMethod.CASH).reduce((ps, p) => ps + toNumber(p.amount), 0), 0);
        const cardSales = sales.reduce((sum, s) => sum + s.payments.filter(p => p.method === PaymentMethod.CARD).reduce((ps, p) => ps + toNumber(p.amount), 0), 0);
        const totalRefunds = refunds.reduce((sum, r) => sum + toNumber(r.amount), 0);
        const totalVoids = voidedSales.reduce((sum, s) => sum + toNumber(s.total), 0);
        const cashIn = drawer.movements.filter(m => m.type === CashMovementType.CASH_IN).reduce((sum, m) => sum + toNumber(m.amount), 0);
        const cashOut = drawer.movements.filter(m => m.type === CashMovementType.CASH_OUT).reduce((sum, m) => sum + toNumber(m.amount), 0);
        const openingFloat = toNumber(drawer.openingFloat);
        const expectedCash = openingFloat + cashSales - totalRefunds + cashIn - cashOut;
        const closingFloat = drawer.closingFloat ? toNumber(drawer.closingFloat) : undefined;
        res.json({
            sessionStart: sessionStart.toISOString(),
            sessionEnd: sessionEnd.toISOString(),
            cashier: drawer.user.name,
            openingFloat,
            totalSales: Number(totalSales.toFixed(2)),
            salesCount: sales.length,
            cashSales: Number(cashSales.toFixed(2)),
            cardSales: Number(cardSales.toFixed(2)),
            totalRefunds: Number(totalRefunds.toFixed(2)),
            refundsCount: refunds.length,
            totalVoids: Number(totalVoids.toFixed(2)),
            voidsCount: voidedSales.length,
            cashIn: Number(cashIn.toFixed(2)),
            cashOut: Number(cashOut.toFixed(2)),
            expectedCash: Number(expectedCash.toFixed(2)),
            closingFloat,
            difference: closingFloat != null ? Number((closingFloat - expectedCash).toFixed(2)) : undefined
        });
    }
    catch (error) {
        next(error);
    }
});
const settingsKey = 'system';
async function readSettings() {
    const record = await prisma.appSetting.findUnique({ where: { key: settingsKey } });
    if (!record) {
        return defaultSystemSettings;
    }
    return record.value;
}
async function writeSettings(data) {
    const record = await prisma.appSetting.upsert({
        where: { key: settingsKey },
        update: { value: data },
        create: { key: settingsKey, value: data }
    });
    return record.value;
}
app.get('/settings', authRequired, requireRole(Role.ADMIN), async (_req, res, next) => {
    try {
        res.json({ settings: await readSettings() });
    }
    catch (error) {
        next(error);
    }
});
app.put('/settings', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const current = await readSettings();
        const incoming = req.body;
        const merged = {
            store: { ...current.store, ...(incoming.store ?? {}) },
            pos: { ...current.pos, ...(incoming.pos ?? {}) },
            taxes: { ...current.taxes, ...(incoming.taxes ?? {}) },
            receipt: { ...current.receipt, ...(incoming.receipt ?? {}) },
            security: { ...current.security, ...(incoming.security ?? {}) }
        };
        const settings = await writeSettings(merged);
        await logActivity(req.user?.id, 'settings.update', 'settings', undefined, settings);
        res.json({ settings });
    }
    catch (error) {
        next(error);
    }
});
// ────────────────────────────────────────────────
// MANUAL CASH DRAWER POP
// ────────────────────────────────────────────────
app.post('/cashier/drawer/pop', authRequired, async (req, res, next) => {
    try {
        const { reason } = req.body;
        const stationId = req.headers['x-station-id'] ?? 'unknown';
        // Find active drawer for user (for reference — pop does not require open drawer to allow manager emergency opens)
        const drawer = await prisma.cashDrawer.findFirst({
            where: { userId: req.user.id, status: DrawerStatus.OPEN }
        });
        await logActivity(req.user?.id, 'drawer.pop', 'cashDrawer', drawer?.id, { reason: reason ?? 'Manual open', stationId, manual: true, userName: req.user?.name });
        res.json({ ok: true, message: 'Drawer pop command logged' });
    }
    catch (error) {
        next(error);
    }
});
app.use(notFound);
app.use(errorHandler);
export default app;
