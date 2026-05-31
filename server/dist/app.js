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
import { Prisma, Role, SaleStatus, PaymentMethod, InventoryMovementType, Unit } from '@prisma/client';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { authRequired, authenticate, requireRole } from './lib/auth.js';
import { currencyFormatter, toNumber } from './lib/money.js';
import { errorHandler, notFound } from './middleware/error.js';
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
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
const money = currencyFormatter(env.currencyCode);
function sendAuthUser(user) {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
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
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } }
        ]
    };
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
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const result = await authenticate(email, password);
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
        await logActivity(result.user.id, 'auth.login', 'user', result.user.id, { email: result.user.email });
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
        await prisma.product.delete({ where: { id } });
        await logActivity(req.user?.id, 'product.delete', 'product', id);
        res.json({ ok: true });
    }
    catch (error) {
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
                        { name: { contains: query, mode: 'insensitive' } },
                        { phone: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
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
        const { email, name, password, role } = req.body;
        if (!email || !name || !password || !role)
            return res.status(400).json({ message: 'Missing employee fields' });
        const user = await prisma.user.create({ data: { email, name, passwordHash: await bcrypt.hash(password, 10), role } });
        await logActivity(req.user?.id, 'user.create', 'user', user.id, { role });
        res.status(201).json({ user: sendAuthUser(user) });
    }
    catch (error) {
        next(error);
    }
});
app.put('/users/:id', authRequired, requireRole(Role.ADMIN), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const user = await prisma.user.update({
            where: { id },
            data: {
                name: req.body.name,
                role: req.body.role,
                active: req.body.active
            }
        });
        await logActivity(req.user?.id, 'user.update', 'user', user.id);
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
        const products = await prisma.product.findMany({ where: { id: { in: items.map((item) => item.productId) } }, include: { category: true } });
        const subtotal = Number(items.reduce((sum, item) => {
            const product = products.find((entry) => entry.id === item.productId);
            return sum + (product ? toNumber(product.price) * item.quantity : 0);
        }, 0).toFixed(2));
        const discountAmount = buildDiscount(subtotal, body.discountType, body.discountValue);
        const customer = body.customerId ? await prisma.customer.findUnique({ where: { id: body.customerId } }) : null;
        const redeemable = customer ? Math.min(body.pointsToRedeem ?? 0, customer.loyaltyPoints, Math.floor(subtotal - discountAmount)) : 0;
        const total = Math.max(0, Number((subtotal - discountAmount - redeemable).toFixed(2)));
        const payments = (body.payments?.length ? body.payments : [{ method: PaymentMethod.CASH, amount: total }]).map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount)
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
                    total,
                    amountPaid: paidAmount,
                    changeAmount,
                    pointsEarned: customer ? pointsEarnedFromTotal(total) : 0,
                    pointsRedeemed: redeemable,
                    items: {
                        create: items.map((cartItem) => {
                            const product = products.find((entry) => entry.id === cartItem.productId);
                            return {
                                productId: product.id,
                                productName: product.name,
                                sku: product.sku,
                                quantity: cartItem.quantity,
                                unitPrice: product.price,
                                costPrice: product.costPrice,
                                lineTotal: Number((toNumber(product.price) * cartItem.quantity).toFixed(2))
                            };
                        })
                    },
                    payments: {
                        create: payments
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
app.use(notFound);
app.use(errorHandler);
export default app;
