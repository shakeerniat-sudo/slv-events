const express = require('express');
const router = express.Router();

// Middleware
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

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
// Authentication & User Management Routes
// ==========================================
router.post('/auth/login', authController.login);
router.post('/auth/register', authenticateToken, authorizeRoles('Admin'), authController.register);
router.get('/auth/me', authenticateToken, authController.getMe);

// Public Client Booking Route
router.post('/public/bookings', eventController.createPublicBooking);

// Admin-only User CRUD
router.get('/users', authenticateToken, authorizeRoles('Admin'), authController.listUsers);
router.put('/users/:id', authenticateToken, authorizeRoles('Admin'), authController.updateUser);
router.delete('/users/:id', authenticateToken, authorizeRoles('Admin'), authController.deleteUser);

// ==========================================
// Dashboard Routes
// ==========================================
router.get('/dashboard/kpi', authenticateToken, dashboardController.getKpiStats);
router.get('/dashboard/charts', authenticateToken, dashboardController.getChartsData);
router.get('/dashboard/activities', authenticateToken, dashboardController.getRecentActivities);
router.delete('/dashboard/activities', authenticateToken, authorizeRoles('Admin'), dashboardController.clearActivities);

// ==========================================
// Events Routes
// ==========================================
router.get('/events', authenticateToken, authorizeRoles('Admin', 'Operations Lead', 'Vendor Coordinator', 'Finance Team'), eventController.listEvents);
router.get('/events/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead', 'Vendor Coordinator', 'Finance Team'), eventController.getEventDetail);
router.post('/events', authenticateToken, authorizeRoles('Admin'), eventController.createEvent);
router.put('/events/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead', 'Vendor Coordinator', 'Finance Team'), eventController.updateEvent);
router.delete('/events/:id', authenticateToken, authorizeRoles('Admin'), eventController.deleteEvent);

// ==========================================
// Resource (Vendors & Staff) Routes
// ==========================================
router.get('/vendors', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), resourceController.listVendors);
router.get('/vendors/:id', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), resourceController.getVendorDetail);
router.post('/vendors', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator'), resourceController.createVendor);
router.put('/vendors/:id', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator'), resourceController.updateVendor);
router.delete('/vendors/:id', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator'), resourceController.deleteVendor);

router.get('/staff', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), resourceController.listStaff);
router.get('/staff/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), resourceController.getStaffDetail);
router.post('/staff', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), resourceController.createStaff);
router.put('/staff/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), resourceController.updateStaff);
router.delete('/staff/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), resourceController.deleteStaff);

// ==========================================
// Assignment & Conflicts Routes
// ==========================================
router.get('/assignments', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.listAssignments);
router.post('/assignments', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.createAssignment);
router.post('/assignments/delete', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.deleteAssignment);
router.put('/assignments/:id/status', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.updateAssignmentStatus);
router.get('/assignments/conflicts', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator'), assignmentController.getConflicts);
router.get('/assignments/availability', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.checkAvailability);
router.get('/assignments/recommendations/:eventId', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.getRecommendations);
router.get('/assignments/event/:eventId', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.getEventAssignment);
router.post('/assignments/event/:eventId', authenticateToken, authorizeRoles('Admin', 'Vendor Coordinator', 'Operations Lead'), assignmentController.saveEventAssignment);

// ==========================================
// Payments Routes
// ==========================================
router.get('/payments', authenticateToken, authorizeRoles('Admin', 'Finance Team'), paymentController.listPayments);
router.post('/payments', authenticateToken, authorizeRoles('Admin', 'Finance Team'), paymentController.createPayment);
router.put('/payments/:id', authenticateToken, authorizeRoles('Admin', 'Finance Team'), paymentController.updatePayment);
router.delete('/payments/:id', authenticateToken, authorizeRoles('Admin', 'Finance Team'), paymentController.deletePayment);

// ==========================================
// Inventory Routes
// ==========================================
router.get('/inventory', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), inventoryController.listInventory);
router.post('/inventory', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), inventoryController.createInventoryItem);
router.put('/inventory/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), inventoryController.updateInventoryItem);
router.delete('/inventory/:id', authenticateToken, authorizeRoles('Admin', 'Operations Lead'), inventoryController.deleteInventoryItem);

// ==========================================
// Notifications Routes
// ==========================================
router.get('/notifications', authenticateToken, notificationController.listNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/notifications/:id', authenticateToken, notificationController.deleteNotification);
router.delete('/notifications', authenticateToken, notificationController.deleteAllNotifications);

module.exports = router;
