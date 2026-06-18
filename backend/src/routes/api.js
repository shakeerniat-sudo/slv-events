const express = require('express');
const router = express.Router();

// Middleware
const { authenticateToken } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/auth.controller');
const eventController = require('../controllers/event.controller');
const resourceController = require('../controllers/resource.controller');
const assignmentController = require('../controllers/assignment.controller');
const dashboardController = require('../controllers/dashboard.controller');
const paymentController = require('../controllers/payment.controller');
const inventoryController = require('../controllers/inventory.controller');
const notificationController = require('../controllers/notification.controller');

// ==========================================
// Authentication Routes
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/me', authenticateToken, authController.getMe);

// ==========================================
// Dashboard Routes
// ==========================================
router.get('/dashboard/kpi', authenticateToken, dashboardController.getKpiStats);
router.get('/dashboard/charts', authenticateToken, dashboardController.getChartsData);
router.get('/dashboard/activities', authenticateToken, dashboardController.getRecentActivities);

// ==========================================
// Events Routes
// ==========================================
router.get('/events', authenticateToken, eventController.listEvents);
router.get('/events/:id', authenticateToken, eventController.getEventDetail);
router.post('/events', authenticateToken, eventController.createEvent);
router.put('/events/:id', authenticateToken, eventController.updateEvent);
router.delete('/events/:id', authenticateToken, eventController.deleteEvent);

// ==========================================
// Resource (Vendors & Staff) Routes
// ==========================================
router.get('/vendors', authenticateToken, resourceController.listVendors);
router.get('/vendors/:id', authenticateToken, resourceController.getVendorDetail);
router.post('/vendors', authenticateToken, resourceController.createVendor);
router.put('/vendors/:id', authenticateToken, resourceController.updateVendor);
router.delete('/vendors/:id', authenticateToken, resourceController.deleteVendor);

router.get('/staff', authenticateToken, resourceController.listStaff);
router.get('/staff/:id', authenticateToken, resourceController.getStaffDetail);
router.post('/staff', authenticateToken, resourceController.createStaff);
router.put('/staff/:id', authenticateToken, resourceController.updateStaff);
router.delete('/staff/:id', authenticateToken, resourceController.deleteStaff);

// ==========================================
// Assignment & Conflicts Routes
// ==========================================
router.get('/assignments', authenticateToken, assignmentController.listAssignments);
router.post('/assignments', authenticateToken, assignmentController.createAssignment);
router.post('/assignments/delete', authenticateToken, assignmentController.deleteAssignment);
router.get('/assignments/conflicts', authenticateToken, assignmentController.getConflicts);
router.get('/assignments/availability', authenticateToken, assignmentController.checkAvailability);
router.get('/assignments/recommendations/:eventId', authenticateToken, assignmentController.getRecommendations);
router.get('/assignments/event/:eventId', authenticateToken, assignmentController.getEventAssignment);
router.post('/assignments/event/:eventId', authenticateToken, assignmentController.saveEventAssignment);

// ==========================================
// Payments Routes
// ==========================================
router.get('/payments', authenticateToken, paymentController.listPayments);
router.post('/payments', authenticateToken, paymentController.createPayment);
router.put('/payments/:id', authenticateToken, paymentController.updatePayment);
router.delete('/payments/:id', authenticateToken, paymentController.deletePayment);

// ==========================================
// Inventory Routes
// ==========================================
router.get('/inventory', authenticateToken, inventoryController.listInventory);
router.post('/inventory', authenticateToken, inventoryController.createInventoryItem);
router.put('/inventory/:id', authenticateToken, inventoryController.updateInventoryItem);
router.delete('/inventory/:id', authenticateToken, inventoryController.deleteInventoryItem);

// ==========================================
// Notifications Routes
// ==========================================
router.get('/notifications', authenticateToken, notificationController.listNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/notifications/:id', authenticateToken, notificationController.deleteNotification);
router.delete('/notifications', authenticateToken, notificationController.deleteAllNotifications);

module.exports = router;
