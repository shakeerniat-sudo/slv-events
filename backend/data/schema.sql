-- SLV Events Vendor & Staff Assignment System Database Schema

CREATE DATABASE IF NOT EXISTS `slv_events_db`;
USE `slv_events_db`;

-- 1. Users Table (Admin, Vendor Coordinator, Operations Lead, Finance Team)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'Vendor Coordinator', 'Operations Lead', 'Finance Team') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `company_name` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Events Table
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `client_id` INT NOT NULL,
  `event_type` VARCHAR(50) NOT NULL, -- Wedding, Corporate, Birthday, etc.
  `event_date` DATE NOT NULL,
  `venue` VARCHAR(255) NOT NULL,
  `budget` DECIMAL(12, 2) NOT NULL,
  `guest_count` INT NOT NULL,
  `theme_preference` VARCHAR(150) NULL,
  `status` VARCHAR(50) DEFAULT 'Pending',
  `notes` TEXT NULL,
  `tasks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  INDEX `idx_event_date` (`event_date`),
  INDEX `idx_event_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Vendors Table
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category` ENUM('Decorator', 'Caterer', 'Photographer', 'Anchor', 'Sound Team') NOT NULL,
  `contact_person` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `service_type` VARCHAR(100) NULL, -- Standard, Premium, Luxury, etc.
  `price_range` VARCHAR(50) NULL, -- Low, Medium, High
  `rating` DECIMAL(2, 1) DEFAULT 5.0,
  `availability_status` ENUM('Available', 'Busy', 'Limited Availability') DEFAULT 'Available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_vendor_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Staff Table
CREATE TABLE IF NOT EXISTS `staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `role` ENUM('Helper', 'Coordinator', 'Technician', 'Supervisor') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `experience_years` INT DEFAULT 0,
  `availability_status` ENUM('Available', 'Busy', 'Limited Availability') DEFAULT 'Available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_staff_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Assignments Table
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `resource_type` ENUM('vendor', 'staff') NOT NULL,
  `resource_id` INT NOT NULL,
  `status` ENUM('Pending', 'Confirmed', 'Declined') DEFAULT 'Pending',
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_assignment` (`event_id`, `resource_type`, `resource_id`),
  INDEX `idx_assignment_resource` (`resource_type`, `resource_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Vendor Availability Exception/Calendar Table
CREATE TABLE IF NOT EXISTS `vendor_availability` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vendor_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('Available', 'Busy', 'Limited Availability') NOT NULL,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_vendor_date` (`vendor_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Staff Availability Exception/Calendar Table
CREATE TABLE IF NOT EXISTS `staff_availability` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `staff_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('Available', 'Busy', 'Limited Availability') NOT NULL,
  FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_staff_date` (`staff_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Inventory Table
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `item_name` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL,
  `available_quantity` INT NOT NULL,
  `status` ENUM('In Stock', 'Out of Stock', 'Maintenance', 'Assigned') DEFAULT 'In Stock',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `type` ENUM('client', 'vendor') NOT NULL,
  `vendor_id` INT NULL, -- NULL for client payments
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `advance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00, -- Amount specific to this payment row
  `due_date` DATE NOT NULL,
  `status` ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Pending',
  `paid_at` TIMESTAMP NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Quotations Table
CREATE TABLE IF NOT EXISTS `quotations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_id` INT NOT NULL,
  `vendor_id` INT NOT NULL,
  `item_details` TEXT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('Draft', 'Sent', 'Approved', 'Rejected') DEFAULT 'Draft',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('Assignment Confirmation', 'Payment Reminder', 'Upcoming Event', 'Conflict Alert') NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Reports Table
CREATE TABLE IF NOT EXISTS `reports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `report_name` VARCHAR(100) NOT NULL,
  `report_type` ENUM('Event', 'Vendor', 'Staff', 'Assignment', 'Payment') NOT NULL,
  `format` ENUM('PDF', 'CSV', 'Excel') NOT NULL,
  `created_by` VARCHAR(100) NOT NULL,
  `filepath` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Activity Logs Table
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `user_name` VARCHAR(100) NOT NULL, -- Denormalized for cases where user is deleted
  `action` VARCHAR(150) NOT NULL,
  `details` TEXT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
