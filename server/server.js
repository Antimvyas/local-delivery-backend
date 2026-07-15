require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require("./config/db.js");
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const ioClient = require('socket.io-client');
const { log } = require('console');
const { close } = require('inspector/promises');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('./utils/logger');
const { saveFcmToken, deleteFcmToken, sendPushNotification } = require('./utils/notifications.js');

// ✅ Cloudinary setup
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



const {
  verifyToken,
  requireRole,
  requireCustomerOwnership,
  requireVendorOwnership
} = require('./middleware/authMiddleware');


const app = require('./app');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Adjust for production
  }
});
global.io = io;
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    logger.warn("Socket connection rejected: No token provided");
    return next(new Error("Authentication error"));
  }
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = verified;
    next();
  } catch (err) {
    logger.warn("Socket connection rejected: Invalid token");
    return next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  logger.info(`A user connected: ${socket.id}`);

  socket.on("join", (data) => {
    if (!data || !data.role || !data.user_id) return;
    const expectedRoom = `${data.role}_${data.user_id}`;
    if (data.room === expectedRoom) socket.join(data.room);
  });

  socket.on("acceptOrder", (data) => {
    if (!data.order_id || !data.vendor_id) return;
    db.query("UPDATE orders SET order_status = 'accepted' WHERE order_id = ?", [data.order_id], (err) => {
      if (err) return;
      io.to(`vendor_${data.vendor_id}`).emit('order-updated', { order_id: data.order_id, status: "accepted" });
      io.to(`customer_${data.customer_id}`).emit('order-updated', { order_id: data.order_id, status: "accepted" });
      sendPushNotification(data.customer_id, 'customer', 'Order Accepted', `Your order #${data.order_id} has been accepted by the vendor.`, 'Order Accepted', 'MyOrdersScreen').catch(e => console.error('FCM error:', e));
    });
  });

  socket.on("rejectOrder", (data) => {
    if (!data.order_id || !data.vendor_id) return;
    db.query("UPDATE orders SET order_status = 'Rejected' WHERE order_id = ?", [data.order_id], (err) => {
      if (err) return;
      io.to(`vendor_${data.vendor_id}`).emit('order-updated', { order_id: data.order_id, status: "rejected" });
      io.to(`customer_${data.customer_id}`).emit('order-updated', { order_id: data.order_id, status: "rejected" });
      sendPushNotification(data.customer_id, 'customer', 'Order Rejected', `Your order #${data.order_id} has been rejected by the vendor.`, 'Order Rejected', 'MyOrdersScreen').catch(e => console.error('FCM error:', e));
    });
  });
  socket.on("disconnect", () => { });
});

// for IMAGE STORE (Cloudinary)
app.use(express.urlencoded({ extended: true }));

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'food-app/food-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.json({ data: "Data Goes Here." })
})










// update vendor
app.post('/api/v1/add-vendor', verifyToken, requireRole('vendor'), (req, res) => {
  const {
    Shop_name,
    shop_address,
    open_close_timings,
    shop_number,
    landmark,
    pocket,
    sector,
    city,
    state,
    structured_address,
    latitude,
    longitude
  } = req.body;
  const vendor_id = req.user.user_id;

  let timingsJSON;
  try {
    timingsJSON = typeof open_close_timings === 'string' ? open_close_timings : JSON.stringify(open_close_timings);
  } catch (error) {
    return res.status(400).json({ error: "Invalid JSON format for open_close_timings" });
  }

  // ✅ Update vendor details and store timings using authenticated vendor_id
  const updateQuery = `
    UPDATE vendor 
    SET Shop_name=?, 
        shop_address=?, 
        open_close_timings=?,
        shop_number=?,
        landmark=?,
        pocket=?,
        sector=?,
        city=?,
        state=?,
        structured_address=?,
        latitude=?,
        longitude=?
    WHERE vendor_id=?
  `;

  const params = [
    Shop_name,
    shop_address,
    timingsJSON,
    shop_number || null,
    landmark || null,
    pocket || null,
    sector || null,
    city || null,
    state || null,
    structured_address ? (typeof structured_address === 'string' ? structured_address : JSON.stringify(structured_address)) : null,
    latitude || null,
    longitude || null,
    vendor_id
  ];

  db.query(updateQuery, params, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({ message: 'Vendor updated successfully!', vendor_id });
  });
});









// ------->>>>>>>>fetch all vendors
app.get('/api/v1/vendors', (req, res) => {
  const query = `
    SELECT 
      v.vendor_id, 
      v.Shop_name, 
      v.shop_address, 
      v.is_online,
      GROUP_CONCAT(DISTINCT f.food_name ORDER BY f.food_name SEPARATOR ', ') AS food_names,
      GROUP_CONCAT(DISTINCT f.food_description ORDER BY f.food_description SEPARATOR ' | ') AS food_descriptions,
      GROUP_CONCAT(DISTINCT f.food_type ORDER BY f.food_type SEPARATOR ', ') AS food_types, 
      GROUP_CONCAT(DISTINCT f.food_img ORDER BY f.food_img SEPARATOR ', ') AS food_images
    FROM vendor v
    LEFT JOIN food f ON v.vendor_id = f.vendor_id
    GROUP BY v.vendor_id;
  `;

  db.query(query, (err, results) => {
    if (err) res.status(500).send(err);
    else res.json(results);
    console.log(results);
  });
});


// ====>>>> orders table
// Place an order
app.post('/api/v1/orders', verifyToken, requireRole('customer'), (req, res) => {
  const { vendor_id, total_cost, customers_location, customers_contact, payment_methods, items, receiver_name, receiver_phone } = req.body;
  const customer_id = req.user.user_id;

  if (!customer_id || !vendor_id || !total_cost || !customers_location || !customers_contact || !payment_methods || !items || items.length === 0) {
    return res.status(400).json({ error: 'All fields are required, and items cannot be empty' });
  }

  // Check if Udar is Allowed (Udar Check) if payment method is credit
  if (payment_methods === 'credit') {
    const checkUdarQuery = "SELECT * FROM account WHERE customer_id = ? AND vendor_id = ?";
    db.query(checkUdarQuery, [customer_id, vendor_id], (udarErr, udarResult) => {
      if (udarErr) {
        console.error('Error checking Udar:', udarErr);
        return res.status(500).json({ error: 'Failed to verify account' });
      }

      // We still proceed even if not approved (as per original logic where it warning logs)
      if (udarResult.length === 0) {
        console.warn('Udar is not approved, but adding credit order.');
      }
      executeOrderTransaction();
    });
  } else {
    executeOrderTransaction();
  }

  function executeOrderTransaction() {
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error('Error getting connection from pool:', connErr);
        return res.status(500).json({ error: 'Failed to establish database connection for order' });
      }

      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          console.error('Transaction Error:', transactionError);
          connection.release();
          return res.status(500).json({ error: 'Failed to start transaction' });
        }

        // ✅ Step 1: Get Customer Name FROM customer Table
        const customerQuery = `SELECT Name FROM customer WHERE customer_id = ?`;

        connection.query(customerQuery, [customer_id], (customerErr, customerResult) => {
          if (customerErr) {
            console.error('Error fetching customer name:', customerErr);
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ error: 'Failed to fetch customer name' });
            });
          }

          if (customerResult.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({ error: 'Customer not found' });
            });
          }

          const customerName = customerResult[0].Name; // ✅ Store the customer name

          // ✅ Step 2: Insert Order into `orders` Table
          const orderQuery = `
            INSERT INTO orders 
              (customer_id, vendor_id, total_cost, customers_location, customers_contact, payment_methods, receiver_name, receiver_phone) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `;

          connection.query(orderQuery, [
            customer_id, vendor_id, total_cost, customers_location, customers_contact, payment_methods,
            receiver_name || null, receiver_phone || null
          ], (orderErr, orderResult) => {
            if (orderErr) {
              console.error('Error inserting into orders:', orderErr);
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ error: 'Failed to place order' });
              });
            }

            const order_id = orderResult.insertId;
            const orderDateTime = new Date(); // Capture current timestamp

            // ✅ Step 3: Insert Order Items into `order_items` Table
            const orderItemsQuery = `
              INSERT INTO order_items (order_id, food_id, food_name, quantity, item_total)
              VALUES ?
            `;

            const orderItemsData = items.map(item => [
              order_id,
              item.food_id,
              item.food_name,
              Number(item.quantity) || 0,
              (Number(item.quantity) || 0) * (Number(item.cost) || 0) // Ensure valid number calculations
            ]);

            connection.query(orderItemsQuery, [orderItemsData], (itemsErr) => {
              if (itemsErr) {
                console.error('Error inserting into order_items:', itemsErr);
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ error: 'Failed to add order items' });
                });
              }

              // ✅ Step 4: Handle Payment Method
              if (payment_methods === 'credit') {
                insertIntoAccount(order_id, orderDateTime, customerName);
              } else {
                finalizeOrder(order_id);
              }
            });

            // ✅ Step 5: Insert into Account Table if Payment is Credit
            function insertIntoAccount(order_id, orderDateTime, customerName) {
              const insertAccountQuery = `
                INSERT INTO account 
                  (vendor_id, customer_id, order_id, customer_name, food_name, quantity, cost, 
                  order_date_time, debit_value_vendor, credit_value_vendor, debit_customer, credit_customer, 
                  balance_due, payment_method, payment_status, payment_date_time, created_at)
                VALUES ?
              `;

              const paymentStatus = 'pending'; // Default status for credit orders
              const paymentDateTime = null; // No payment yet

              const accountValues = items.map(item => {
                const quantity = Number(item.quantity) || 0;
                const cost = Number(item.cost) || 0;
                const itemTotal = quantity * cost;

                return [
                  vendor_id,
                  customer_id,
                  order_id,
                  customerName,
                  item.food_name,
                  quantity,
                  cost,
                  orderDateTime, // order_date_time
                  itemTotal, // debit_value_vendor
                  0, // credit_value_vendor
                  0, // debit_customer
                  itemTotal, // credit_customer
                  itemTotal, // balance_due
                  payment_methods,
                  paymentStatus,
                  paymentDateTime,
                  new Date() // created_at
                ];
              });

              connection.query(insertAccountQuery, [accountValues], (accountErr) => {
                if (accountErr) {
                  console.error('Error inserting into account:', accountErr);
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ error: 'Failed to update account table' });
                  });
                }
                finalizeOrder(order_id);
              });
            }

            // ✅ Step 6: Commit the Transaction
            function finalizeOrder(order_id) {
              connection.commit((commitErr) => {
                if (commitErr) {
                  console.error("Transaction Commit Error:", commitErr);
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ error: 'Failed to finalize order' });
                  });
                }

                connection.release();
                console.log("✅ Order committed to DB, now emitting WebSocket event...");

                // ✅ Emit FCM and Socket events for real-time order update AFTER commit
                sendPushNotification(vendor_id, 'vendor', 'New Order Received', `You have received a new order of ₹${total_cost}.`, 'New Order', 'PendingOrder').catch(e => console.error('FCM error:', e));
                io.to(`vendor_${vendor_id}`).emit('new-order', {
                  order_id,
                  vendor_id,
                  total_cost,
                  customer_id,
                  customers_location,
                  customers_contact,
                  payment_methods
                });

                res.json({ message: 'Order placed successfully', order_id });
              });
            }
          });
        });
      });
    });
  }
});




//  fetch all orders
app.get('/api/v1/vendor/orders', verifyToken, requireRole('vendor'), (req, res) => {
  const vendor_id = req.user.user_id;

  const query = `
    SELECT o.order_id, o.customers_location, o.customers_contact, o.total_cost, 
           o.payment_methods, o.order_status, c.Name AS customer_name,
           COALESCE(
             JSON_ARRAYAGG(
               JSON_OBJECT('food_name', oi.food_name, 'quantity', oi.quantity, 'item_total', oi.item_total)
             ), '[]'
           ) AS food_items
    FROM orders o
    JOIN customer c ON o.customer_id = c.customer_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id  -- Use LEFT JOIN to include orders without items
    WHERE o.vendor_id = ? AND o.order_status = 'pending'
    GROUP BY o.order_id;
  `;

  db.query(query, [vendor_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Ensure food_items is always an array
    results = results.map(order => ({
      ...order,
      food_items: JSON.parse(order.food_items || "[]") // Convert JSON string to an array
    }));

    res.json(results);
  });
});




// for fetch orders for customer
// for fetch orders for customer
app.get('/api/v1/customer/orders/new', verifyToken, requireRole('customer'), async (req, res) => {
  try {
    const customer_id = req.user.user_id;

    // ✅ Fetch ALL orders, no matter their status
    const query = `
      SELECT 
          o.order_id, o.customer_id, o.vendor_id, 
          oi.food_name, oi.quantity, 
          o.total_cost, o.order_status, 
          v.shop_name, o.customers_location, o.customers_contact,
          (r.review_id IS NOT NULL) AS has_review
      FROM orders o
      JOIN vendor v ON o.vendor_id = v.vendor_id
      JOIN customer c ON o.customer_id = c.customer_id
      JOIN order_items oi ON o.order_id = oi.order_id
      LEFT JOIN order_reviews r ON o.order_id = r.order_id
      WHERE o.customer_id = ?;
    `;

    db.query(query, [customer_id], (err, results) => {
      if (err) {
        console.error("Error fetching orders:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      res.json(results); // ✅ Return all orders
    });

  } catch (error) {
    console.error("Error in order fetching:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Save Order Review
app.post('/api/v1/reviews', verifyToken, requireRole('customer'), (req, res) => {

  const customer_id = req.user.user_id;
  const {
    order_id,
    rating,
    review_text,
    delivered_successfully
  } = req.body;

  if (!order_id || rating === undefined) {
    return res.status(400).json({
      success: false,
      message: "Order ID and rating are required"
    });
  }

  const rat = parseInt(rating);

  if (isNaN(rat) || rat < 1 || rat > 5) {
    return res.status(400).json({
      success: false,
      message: "Rating must be between 1 and 5"
    });
  }

  const delSuccess = delivered_successfully ? 1 : 0;

  // Get vendor_id from the order
  const vendorQuery = `
    SELECT vendor_id
    FROM orders
    WHERE order_id = ?
    LIMIT 1
  `;

  db.query(vendorQuery, [order_id], (err, orderResult) => {

    if (err) {
      console.error("Vendor lookup error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    if (orderResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const vendor_id = orderResult[0].vendor_id;

    const insertQuery = `
      INSERT INTO order_reviews
      (
        order_id,
        customer_id,
        vendor_id,
        rating,
        review_text,
        delivered_successfully
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [
        order_id,
        customer_id,
        vendor_id,
        rat,
        review_text || null,
        delSuccess
      ],
      (err, result) => {

        if (err) {
          console.error("Error saving review:", err);

          return res.status(500).json({
            success: false,
            message: err.sqlMessage || err.message
          });
        }

        return res.json({
          success: true,
          message: "Review saved successfully",
          review_id: result.insertId
        });

      }
    );

  });

});



// 📌 Fetch All Accepted Orders for a Vendor
app.get('/api/v1/vendor/accepted-orders', verifyToken, requireRole('vendor'), (req, res) => {
  const vendor_id = req.user.user_id;
  const { status } = req.query;

  let statusFilter = "o.order_status IN ('accepted', 'preparing', 'ready', 'out for delivery')";
  if (status === 'delivered') {
    statusFilter = "o.order_status IN ('delivered', 'Rejected', 'rejected', 'cancelled')";
  } else if (status === 'pending') {
    statusFilter = "o.order_status = 'pending'";
  } else if (status === 'all') {
    statusFilter = "o.order_status IN ('pending', 'accepted', 'preparing', 'ready', 'out for delivery', 'delivered', 'Rejected', 'rejected', 'cancelled')";
  }

  const query = `
    SELECT o.order_id, o.customers_location, o.customers_contact, o.total_cost, 
           o.payment_methods, o.order_status, c.Name AS customer_name,
           COALESCE(
             JSON_ARRAYAGG(
               JSON_OBJECT('food_name', oi.food_name, 'quantity', oi.quantity, 'item_total', oi.item_total)
             ), '[]'
           ) AS food_items
    FROM orders o
    JOIN customer c ON o.customer_id = c.customer_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.vendor_id = ? AND ${statusFilter}
    GROUP BY o.order_id;
  `;

  db.query(query, [vendor_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    results = results.map(order => ({
      ...order,
      food_items: JSON.parse(order.food_items || "[]")
    }));

    res.json(results);
  });
});

// 📌 Update Order Status (Preparing → Ready → Out for Delivery)
app.put('/api/v1/vendor/orders/update-status', verifyToken, requireRole('vendor'), (req, res) => {
  const { order_id, customer_id, new_status } = req.body;
  const vendor_id = req.user.user_id;

  // Verify that the order belongs to the logged-in vendor
  db.query("SELECT vendor_id, order_status, customer_id FROM orders WHERE order_id = ?", [order_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Order not found" });
    if (parseInt(results[0].vendor_id) !== parseInt(vendor_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this order." });
    }

    const currentStatus = results[0].order_status || 'pending';
    const targetCustId = results[0].customer_id;

    // Enforce sequence: accepted -> preparing -> ready -> delivered
    if (new_status === 'Rejected' || new_status === 'rejected') {
      if (currentStatus === 'delivered') {
        return res.status(400).json({ error: "Cannot reject a delivered order" });
      }
    } else {
      if (new_status === 'accepted') {
        if (currentStatus !== 'placed' && currentStatus !== 'pending') {
          return res.status(400).json({ error: "Order is already accepted or processed" });
        }
      } else if (new_status === 'preparing') {
        if (currentStatus !== 'accepted') {
          return res.status(400).json({ error: "Order must be accepted before preparing" });
        }
      } else if (new_status === 'ready') {
        if (currentStatus !== 'preparing') {
          return res.status(400).json({ error: "Order must be preparing before marking as ready/out for delivery" });
        }
      } else if (new_status === 'delivered') {
        if (currentStatus !== 'ready') {
          return res.status(400).json({ error: "Order must be ready/out for delivery before marking as delivered" });
        }
      } else {
        return res.status(400).json({ error: "Invalid status transition" });
      }
    }

    // Update the order status in the database
    db.query("UPDATE orders SET order_status = ? WHERE order_id = ?", [new_status, order_id], (err, result) => {
      if (err) {
        console.error("Error updating order status:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Create an update payload
      const updateData = {
        order_id,
        customer_id,
        vendor_id,
        status: new_status,
      };

      // Emit the update event to the customer and vendor rooms using Socket.io
      io.to(`customer_${customer_id}`).emit('order-updated', updateData);
      io.to(`vendor_${vendor_id}`).emit('order-updated', updateData);
      if (new_status === 'accepted') {
        sendPushNotification(customer_id, 'customer', 'Order Accepted', `Your order #${order_id} has been accepted.`, 'Order Accepted', 'MyOrdersScreen').catch(e => console.error('FCM error:', e));
      } else if (new_status === 'Rejected' || new_status === 'rejected') {
        sendPushNotification(customer_id, 'customer', 'Order Rejected', `Your order #${order_id} has been rejected.`, 'Order Rejected', 'MyOrdersScreen').catch(e => console.error('FCM error:', e));
      } else if (new_status === 'delivered') {
        sendPushNotification(customer_id, 'customer', 'Order Delivered', `Your order #${order_id} has been delivered!`, 'Order Delivered', 'MyOrdersScreen').catch(e => console.error('FCM error:', e));
      } else if (new_status === 'cancelled') {
        sendPushNotification(vendor_id, 'vendor', 'Order Cancelled', `Order #${order_id} has been cancelled.`, 'Order Cancelled', 'Orders').catch(e => console.error('FCM error:', e));
      }

      res.json({ message: "Order status updated", update: updateData });
    });
  });
});




// ✅ Customer Requests Udar Account
app.post('/api/v1/request-udar', verifyToken, requireRole('customer'), (req, res) => {
  const { vendor_id } = req.body;
  const customer_id = req.user.user_id;

  if (!customer_id || !vendor_id) {
    return res.status(400).json({ message: "customer_id and vendor_id are required" });
  }

  console.log(`🔹 Request received for Udar: Customer ID: ${customer_id}, Vendor ID: ${vendor_id}`);

  // ✅ Step 1: Check if an existing request exists
  const checkRequestQuery = "SELECT status FROM udar_requests WHERE customer_id = ? AND vendor_id = ?";

  db.query(checkRequestQuery, [customer_id, vendor_id], (err, results) => {
    if (err) {
      console.error("❌ Error checking existing request:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length > 0) {
      const existingStatus = results[0].status;

      if (existingStatus === "pending") {
        return res.status(400).json({ message: "You have already sent a request. Waiting for approval." });
      }

      if (existingStatus === "accepted") {
        return res.status(400).json({ message: "Udar already approved. You cannot send another request." });
      }
    }

    // ✅ Step 2: Fetch Customer Name
    const queryCustomer = "SELECT Name FROM customer WHERE customer_id = ?";

    db.query(queryCustomer, [customer_id], (err, result) => {
      if (err) {
        console.error("❌ Error fetching customer name:", err);
        return res.status(500).json({ message: "Failed to fetch customer name" });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const customer_name = result[0].Name;
      console.log("✅ Customer Name:", customer_name);

      // ✅ Step 3: Insert Udar Request (Now with `pending` status)
      const queryInsert = "INSERT INTO udar_requests (customer_id, vendor_id, customer_name, status) VALUES (?, ?, ?, 'pending')";

      db.query(queryInsert, [customer_id, vendor_id, customer_name], (err, result) => {
        if (err) {
          console.error("❌ Error inserting Udar request:", err);
          return res.status(500).json({ message: "Udar request failed" });
        }

        console.log("✅ Udar request successfully inserted");
        sendPushNotification(vendor_id, 'vendor', 'Credit Request Received', `${customer_name} has requested an Udar (credit) account.`, 'Credit Request Received', 'UdarRequestsScreen').catch(e => console.error('FCM error:', e));
        res.json({ message: "Udar request sent successfully" });
      });
    });
  });
});




// ✅ Vendor Accepts Udar Request
app.post('/api/v1/accept-udar', verifyToken, requireRole('vendor'), (req, res) => {
  const { request_id } = req.body;

  if (!request_id) {
    return res.status(400).json({ message: "request_id is required" });
  }

  // Verify that the request belongs to the logged-in vendor
  db.query("SELECT vendor_id FROM udar_requests WHERE request_id = ?", [request_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Request not found" });
    if (parseInt(results[0].vendor_id) !== parseInt(req.user.user_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this credit request." });
    }

    console.log("Received request_id:", request_id);

    // Update status to 'accepted' in udar_requests table
    const updateQuery = `UPDATE udar_requests SET status = 'accepted' WHERE request_id = ?`;

    db.query(updateQuery, [request_id], (err, result) => {
      if (err) {
        console.error("Database UPDATE error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Request not found or already accepted" });
      }

      console.log("Udar request accepted:", result);
      db.query('SELECT customer_id, vendor_id FROM udar_requests WHERE request_id = ?', [request_id], (sErr, sRes) => {
        if (!sErr && sRes && sRes.length > 0) {
          const { customer_id, vendor_id } = sRes[0];
          db.query('SELECT Shop_name FROM vendor WHERE vendor_id = ?', [vendor_id], (vErr, vRes) => {
            const sName = (!vErr && vRes && vRes.length > 0) ? vRes[0].Shop_name : 'Vendor';
            sendPushNotification(customer_id, 'customer', 'Credit Request Approved', `Your Udar (credit) request has been approved by ${sName}.`, 'Credit Request Approved', 'MyUdarScreen').catch(e => console.error('FCM error:', e));
          });
        }
      });
      res.json({ status: "accepted", message: "Udar request has been accepted" });
    });
  });
});




// ✅ Add Purchase on Udar (Credit)
app.get('/api/v1/customer-transactions/:customer_id', verifyToken, (req, res) => {
  const { customer_id } = req.params;

  // ✅ Check if customer_id is valid
  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  const caller_id = req.user.user_id;
  const caller_role = req.user.role;

  if (caller_role === 'customer') {
    if (parseInt(customer_id) !== parseInt(caller_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this resource." });
    }
  } else if (caller_role === 'vendor') {
    // Vendor is allowed, but we'll restrict query to their own vendor_id transactions
  } else {
    return res.status(403).json({ error: "Forbidden. Invalid role." });
  }

  let query;
  let params;
  if (caller_role === 'vendor') {
    query = `
      SELECT 
          a.order_id, a.food_name, a.quantity, a.cost, a.total_cost, 
          a.debit_value_vendor, a.credit_value_vendor, a.balance_due, 
          a.order_date_time, c.Name AS customer_name, a.credit_customer, a.debit_customer
      FROM account a
      JOIN customer c ON a.customer_id = c.customer_id
      WHERE a.customer_id = ? AND a.vendor_id = ?
      ORDER BY a.order_date_time DESC;
    `;
    params = [customer_id, caller_id];
  } else {
    query = `
      SELECT 
          a.order_id, a.food_name, a.quantity, a.cost, a.total_cost, 
          a.debit_value_vendor, a.credit_value_vendor, a.balance_due, 
          a.order_date_time, c.Name AS customer_name, a.credit_customer, a.debit_customer
      FROM account a
      JOIN customer c ON a.customer_id = c.customer_id
      WHERE a.customer_id = ?
      ORDER BY a.order_date_time DESC;
    `;
    params = [customer_id];
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const validTransactions = results || [];

    if (validTransactions.length === 0) {
      return res.status(200).json({
        customer_name: "",
        transactions: [],
        totalSummary: { total_cost: 0, total_credit: 0, total_debit: 0, total_balance_due: 0 }
      });
    }

    // ✅ Calculate total amounts safely
    const totalSummary = validTransactions.reduce(
      (acc, item) => {

        acc.total_cost += parseFloat(item.total_cost) || 0;

        acc.total_credit += parseFloat(item.debit_customer) || 0;

        acc.total_debit += parseFloat(item.credit_customer) || 0;

        acc.total_balance_due += parseFloat(item.balance_due) || 0;

        return acc;

      },
      {
        total_cost: 0,
        total_credit: 0,
        total_debit: 0,
        total_balance_due: 0
      }
    );

    totalSummary.total_cost = Number(totalSummary.total_cost.toFixed(2));
    totalSummary.total_credit = Number(totalSummary.total_credit.toFixed(2));
    totalSummary.total_debit = Number(totalSummary.total_debit.toFixed(2));
    totalSummary.total_balance_due = Number(totalSummary.total_balance_due.toFixed(2));

    res.json({
      customer_name: validTransactions[0]?.customer_name || "",
      transactions: validTransactions,
      totalSummary
    });
  });
});



//check udar


app.get('/api/v1/check-udar', verifyToken, (req, res) => {
  const { customer_id, vendor_id } = req.query; // Get query params

  if (!customer_id || !vendor_id) {
    return res.status(400).json({ message: "Missing customer_id or vendor_id" });
  }

  const caller_id = req.user.user_id;
  const caller_role = req.user.role;

  if (caller_role === 'customer') {
    if (parseInt(customer_id) !== parseInt(caller_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this resource." });
    }
  } else if (caller_role === 'vendor') {
    if (parseInt(vendor_id) !== parseInt(caller_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this resource." });
    }
  } else {
    return res.status(403).json({ error: "Forbidden. Invalid role." });
  }

  console.log("Checking Udar approval for:", { customer_id, vendor_id });

  // Check in `udar_requests` if the status is 'accepted'
  const query = `
    SELECT COUNT(*) AS count FROM udar_requests 
    WHERE customer_id = ? AND vendor_id = ? AND status = 'accepted';
  `;

  db.query(query, [customer_id, vendor_id], (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }

    // Check if a record exists with status 'accepted'
    const isApproved = result[0].count > 0;

    console.log("Udar approval status:", isApproved);

    res.json({ isApproved });
  });
});



app.get(
  '/api/v1/customer-udar-accounts/:customer_id',
  verifyToken,
  requireRole('customer'),
  requireCustomerOwnership,
  (req, res) => {

    const { customer_id } = req.params;

    const query = `
      SELECT vendor_id, status
      FROM udar_requests
      WHERE customer_id = ?
    `;

    db.query(query, [customer_id], (err, results) => {

      if (err) {
        console.error(err);
        return res.status(500).json({
          success: false,
          message: "Database Error"
        });
      }

      return res.json({
        success: true,
        accounts: results
      });

    });

  });



// ✅ Fetch Udar Requests for Vendor
app.get('/api/v1/udar-requests/:vendor_id', verifyToken, requireRole('vendor'), requireVendorOwnership, (req, res) => {
  const { vendor_id } = req.params;
  const query = `
SELECT
    ur.request_id,
    ur.customer_id,
    ur.vendor_id,
    ur.credit_limit,
    ur.request_date,
    ur.status,

    c.Name AS customer_name,
    c.Phone AS phone

FROM udar_requests ur

INNER JOIN customer c
ON c.customer_id = ur.customer_id

WHERE ur.vendor_id = ?
AND ur.status='pending'

ORDER BY ur.request_date DESC
`;
  db.query(query, [vendor_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);  // Logs the error for debugging
      return res.status(500).json({ error: "Internal Server Error" }); // Sends error response
    }

    if (results.length === 0) {
      return res.json({
        success: true,
        requests: []
      });
    }

    return res.json({
      success: true,
      requests: results
    }); // Sends the customer names and request IDs to frontend
  });
});


// ✅ Fetch Udar Accounts for a Vendor
app.get('/api/v1/vendor-dashboard/:vendor_id', verifyToken, requireRole('vendor'), requireVendorOwnership, (req, res) => {
  const { vendor_id } = req.params;
  console.log(vendor_id);

  const query = `
SELECT
    c.customer_id,
    c.Name,
    c.Phone,
    c.customer_address,
    ur.credit_limit,

    COALESCE(SUM(a.balance_due),0) AS total_pending_amount

FROM udar_requests ur

JOIN customer c
ON ur.customer_id = c.customer_id

LEFT JOIN account a
ON a.customer_id = ur.customer_id
AND a.vendor_id = ur.vendor_id

WHERE ur.vendor_id = ?
AND ur.status='accepted'

GROUP BY
c.customer_id,
c.Name,
c.Phone,
c.customer_address,
ur.credit_limit

ORDER BY c.Name;
`;

  db.query(query, [vendor_id], (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);  // ✅ Log full SQL error
      return res.status(500).json({ error: "Internal Server Error", details: err.message });
    }

    if (results.length === 0) {
      return res.status(200).json([]);
    }

    res.json(results);
  });
});



// ✅ Fetch Customer Udar Accounts (All Vendors)
app.get('/api/v1/customer/udar/:customer_id', verifyToken, requireRole('customer'), requireCustomerOwnership, (req, res) => {
  const { customer_id } = req.params;

  // ✅ Check if customer_id is valid
  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  const query = `
    SELECT 
        a.order_id, a.food_name, a.quantity, a.cost, a.total_cost, 
        a.debit_value_vendor, a.credit_value_vendor, a.balance_due, 
        a.order_date_time, v.Shop_name, a.credit_customer, a.debit_customer,a.vendor_id
    FROM account a
    JOIN customer c ON a.customer_id = c.customer_id
    JOIN vendor v ON a.vendor_id = v.vendor_id  -- Add this join for the 'vendors' table
    WHERE a.customer_id = ?
    ORDER BY a.order_date_time DESC;
`;


  db.query(query, [customer_id], (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    const validTransactions = results || [];

    if (validTransactions.length === 0) {
      return res.status(200).json({
        vendor_id: null,
        Shop_name: "",
        transactions: [],
        totalSummary: { total_cost: 0, total_credit: 0, total_debit: 0, total_balance_due: 0 }
      });
    }

    // ✅ Calculate total amounts safely
    const totalSummary = validTransactions.reduce(
      (acc, item) => {

        acc.total_cost += parseFloat(item.total_cost || 0);

        acc.total_credit += parseFloat(item.debit_value_vendor || 0);

        acc.total_debit += parseFloat(item.credit_value_vendor || 0);

        acc.total_balance_due += parseFloat(item.balance_due || 0);

        return acc;

      },
      {
        total_cost: 0,
        total_credit: 0,
        total_debit: 0,
        total_balance_due: 0
      }
    );

    totalSummary.total_cost = Number(totalSummary.total_cost.toFixed(2));
    totalSummary.total_credit = Number(totalSummary.total_credit.toFixed(2));
    totalSummary.total_debit = Number(totalSummary.total_debit.toFixed(2));
    totalSummary.total_balance_due = Number(totalSummary.total_balance_due.toFixed(2));
    res.json({
      vendor_id: validTransactions[0]?.vendor_id || null,
      Shop_name: validTransactions[0]?.Shop_name || "",
      transactions: validTransactions,
      totalSummary
    });
  });
});

app.post('/api/v1/request-payment', verifyToken, requireRole('customer'), (req, res) => {
  const { vendor_id, amount } = req.body;
  const customer_id = req.user.user_id;

  if (!vendor_id || !amount) {
    return res.status(400).json({ error: "vendor_id and amount are required" });
  }

  // Verify that an accepted credit request exists between this customer and vendor
  db.query("SELECT COUNT(*) AS count FROM udar_requests WHERE customer_id = ? AND vendor_id = ? AND status = 'accepted'", [customer_id, vendor_id], (err, relationshipResult) => {
    if (err || relationshipResult[0].count === 0) {
      return res.status(403).json({ error: "Forbidden. No credit relationship exists with this vendor." });
    }

    // Insert request into a payment requests table (for the popup)
    const insertQuery = `
      INSERT INTO payment_requests (customer_id, vendor_id, amount, status, request_time) 
      VALUES (?, ?, ?, 'pending', NOW());
    `;

    db.query(insertQuery, [customer_id, vendor_id, amount], (err, result) => {
      if (err) return res.status(500).send({ error: err.message });
      const request_id = result.insertId;

      db.query('SELECT Name FROM customer WHERE customer_id = ?', [customer_id], (cErr, cRes) => {
        const cName = (!cErr && cRes && cRes.length > 0) ? cRes[0].Name : 'Customer';

        // Emit Socket event to vendor
        io.to(`vendor_${vendor_id}`).emit('payment-request', {
          request_id,
          customer_id,
          customer_name: cName,
          amount,
          request_time: new Date()
        });

        sendPushNotification(vendor_id, 'vendor', 'Payment Received', `Payment request of ₹${amount} received from ${cName}.`, 'Payment Received', 'VendorCustomerDetails').catch(e => console.error('FCM error:', e));
      });
      res.json({ success: true, message: "Payment request sent to the vendor." });
    });
  });
});


// ✅ Monthly Reminder to Customers
app.get('/api/v1/send-reminder', verifyToken, requireRole('vendor'), (req, res) => {
  const vendor_id = req.user.user_id;
  const query = `
    SELECT DISTINCT c.Name AS customer_name, c.Phone, v.Shop_name, a.balance_due
    FROM account a
    JOIN customer c ON a.customer_id = c.customer_id
    JOIN vendor v ON a.vendor_id = v.vendor_id
    WHERE a.payment_status = 'pending' AND a.balance_due > 0 AND a.vendor_id = ?;
  `;
  db.query(query, [vendor_id], (err, result) => {
    if (err) return res.status(500).send(err);
    result.forEach(customer => {
      console.log(`Reminder sent to ${customer.customer_name} for ₹${customer.balance_due} at ${customer.Shop_name}`);
    });
    res.json({ message: "Reminders sent" });
  });
});

// ==========================================
// LOCATION & GEOCODING SERVICES
// ==========================================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const https = require('https');

// Reverse Geocoding via Nominatim with local mock fallback
app.post('/api/v1/location/reverse-geocode', verifyToken, (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  const sendMockFallback = () => {
    let mockAddress = "";
    if (Math.abs(lat - 29.1492) < 0.5 && Math.abs(lon - 75.7217) < 0.5) {
      if (lat > 29.15) mockAddress = "Model Town, Hisar, Haryana";
      else if (lat < 29.14) mockAddress = "Sector 13, Hisar, Haryana";
      else mockAddress = "Sector 15, Hisar, Haryana";
    } else if (Math.abs(lat - 28.4595) < 0.5 && Math.abs(lon - 77.0266) < 0.5) {
      if (lat > 28.46) mockAddress = "Sector 15, Gurugram, Haryana";
      else if (lat < 28.45) mockAddress = "Sohna Road, Gurugram, Haryana";
      else mockAddress = "Sector 45, Gurugram, Haryana";
    } else {
      mockAddress = `Near Bus Stand, Hisar, Haryana`;
    }
    res.json({ formatted_address: mockAddress });
  };

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
  const requestOptions = {
    headers: {
      'User-Agent': 'LocalDeliveryApp/1.0'
    },
    timeout: 3000
  };

  https.get(url, requestOptions, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed && parsed.display_name) {
          return res.json({ formatted_address: parsed.display_name });
        }
        sendMockFallback();
      } catch (e) {
        sendMockFallback();
      }
    });
  }).on('error', (err) => {
    sendMockFallback();
  });
});

// Search Address via Nominatim with mock fallback
app.post('/api/v1/location/search', verifyToken, (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  const sendMockFallback = () => {
    const mockResults = [
      {
        display_name: `${query}, Sector 15, Hisar, Haryana`,
        lat: "29.1492",
        lon: "75.7217"
      },
      {
        display_name: `${query}, Model Town, Hisar, Haryana`,
        lat: "29.1550",
        lon: "75.7250"
      },
      {
        display_name: `${query}, Sector 15, Gurugram, Haryana`,
        lat: "28.4595",
        lon: "77.0266"
      }
    ];
    res.json(mockResults);
  };

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
  const requestOptions = {
    headers: {
      'User-Agent': 'LocalDeliveryApp/1.0'
    },
    timeout: 3000
  };

  https.get(url, requestOptions, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.json(parsed);
        }
        sendMockFallback();
      } catch (e) {
        sendMockFallback();
      }
    });
  }).on('error', (err) => {
    sendMockFallback();
  });
});

// Fetch Customer Addresses
app.get('/api/v1/customer/addresses', verifyToken, requireRole('customer'), (req, res) => {
  const customer_id = req.user.user_id;
  db.query("SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC", [customer_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// Save Customer Address
app.post('/api/v1/customer/addresses', verifyToken, requireRole('customer'), (req, res) => {
  const customer_id = req.user.user_id;
  const {
    address_type,
    latitude,
    longitude,
    formatted_address,
    is_default,
    house_no,
    building_name,
    floor,
    landmark,
    area,
    city,
    state,
    structured_address
  } = req.body;

  if (!address_type || latitude === undefined || longitude === undefined || !formatted_address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const isDef = is_default ? 1 : 0;

  const saveAddress = () => {
    const insertQuery = `
      INSERT INTO customer_addresses (
        customer_id, address_type, latitude, longitude, formatted_address, is_default,
        house_no, building_name, floor, landmark, area, city, state, structured_address
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(insertQuery, [
      customer_id, address_type, lat, lon, formatted_address, isDef,
      house_no || null,
      building_name || null,
      floor || null,
      landmark || null,
      area || null,
      city || null,
      state || null,
      structured_address ? (typeof structured_address === 'string' ? structured_address : JSON.stringify(structured_address)) : null
    ], (err, result) => {
      if (err) {
        console.error("Database error saving customer address:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ success: true, message: "Address saved successfully", address_id: result.insertId });
    });
  };

  if (isDef) {
    db.query("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?", [customer_id], (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      saveAddress();
    });
  } else {
    saveAddress();
  }
});

// Edit Customer Address
app.put('/api/v1/customer/addresses/:address_id', verifyToken, requireRole('customer'), (req, res) => {
  const customer_id = req.user.user_id;
  const { address_id } = req.params;
  const {
    address_type,
    latitude,
    longitude,
    formatted_address,
    is_default,
    house_no,
    building_name,
    floor,
    landmark,
    area,
    city,
    state,
    structured_address
  } = req.body;

  if (!address_type || latitude === undefined || longitude === undefined || !formatted_address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const isDef = is_default ? 1 : 0;

  db.query("SELECT customer_id FROM customer_addresses WHERE address_id = ?", [address_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Address not found" });
    if (parseInt(results[0].customer_id) !== parseInt(customer_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this address." });
    }

    const updateAddress = () => {
      const updateQuery = `
        UPDATE customer_addresses 
        SET address_type = ?, latitude = ?, longitude = ?, formatted_address = ?, is_default = ?,
            house_no = ?, building_name = ?, floor = ?, landmark = ?, area = ?, city = ?, state = ?, structured_address = ?
        WHERE address_id = ?
      `;
      db.query(updateQuery, [
        address_type, lat, lon, formatted_address, isDef,
        house_no || null,
        building_name || null,
        floor || null,
        landmark || null,
        area || null,
        city || null,
        state || null,
        structured_address ? (typeof structured_address === 'string' ? structured_address : JSON.stringify(structured_address)) : null,
        address_id
      ], (err) => {
        if (err) {
          console.error("Database error updating customer address:", err);
          return res.status(500).json({ error: "Database error" });
        }
        res.json({ success: true, message: "Address updated successfully" });
      });
    };

    if (isDef) {
      db.query("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?", [customer_id], (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        updateAddress();
      });
    } else {
      updateAddress();
    }
  });
});

// Delete Customer Address
app.delete('/api/v1/customer/addresses/:address_id', verifyToken, requireRole('customer'), (req, res) => {
  const customer_id = req.user.user_id;
  const { address_id } = req.params;

  db.query("SELECT customer_id FROM customer_addresses WHERE address_id = ?", [address_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Address not found" });
    if (parseInt(results[0].customer_id) !== parseInt(customer_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this address." });
    }

    db.query("DELETE FROM customer_addresses WHERE address_id = ?", [address_id], (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json({ success: true, message: "Address deleted successfully" });
    });
  });
});

// Set Default Customer Address
app.put('/api/v1/customer/addresses/:address_id/default', verifyToken, requireRole('customer'), (req, res) => {
  const customer_id = req.user.user_id;
  const { address_id } = req.params;

  db.query("SELECT customer_id FROM customer_addresses WHERE address_id = ?", [address_id], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0) return res.status(404).json({ error: "Address not found" });
    if (parseInt(results[0].customer_id) !== parseInt(customer_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this address." });
    }

    db.query("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?", [customer_id], (err) => {
      if (err) return res.status(500).json({ error: "Database error" });
      db.query("UPDATE customer_addresses SET is_default = 1 WHERE address_id = ?", [address_id], (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ success: true, message: "Default address updated successfully" });
      });
    });
  });
});

// Fetch Nearby Sorted Vendors
app.get('/api/v1/customer/nearby-vendors', verifyToken, requireRole('customer'), (req, res) => {
  const customer_id = req.user.user_id;
  const latParam = req.query.latitude;
  const lonParam = req.query.longitude;

  const getVendors = (custLat, custLon) => {
    const query = `
      SELECT 
        v.vendor_id, 
        v.Shop_name, 
        v.shop_address, 
        v.latitude, 
        v.longitude, 
        v.formatted_address,
        v.service_radius,
        v.is_online,
        GROUP_CONCAT(DISTINCT f.food_type ORDER BY f.food_type SEPARATOR ', ') AS food_types, 
        GROUP_CONCAT(DISTINCT f.food_img ORDER BY f.food_img SEPARATOR ', ') AS food_images,
        GROUP_CONCAT(DISTINCT f.food_name ORDER BY f.food_name SEPARATOR ', ') AS food_names,
        GROUP_CONCAT(DISTINCT f.food_description ORDER BY f.food_description SEPARATOR ' | ') AS food_descriptions
      FROM vendor v
      LEFT JOIN food f ON v.vendor_id = f.vendor_id
      GROUP BY v.vendor_id;
    `;
    db.query(query, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      const vendorList = results.map((vendor) => {
        let distance = null;
        let isWithinRadius = false;
        if (custLat !== null && custLon !== null && vendor.latitude !== null && vendor.longitude !== null) {
          distance = calculateDistance(
            parseFloat(custLat),
            parseFloat(custLon),
            parseFloat(vendor.latitude),
            parseFloat(vendor.longitude)
          );
          const radiusVal = parseFloat(vendor.service_radius || 5.00);
          isWithinRadius = distance <= radiusVal;
        }
        return {
          ...vendor,
          distance: distance !== null ? parseFloat(distance.toFixed(2)) : null,
          is_within_service_radius: isWithinRadius
        };
      });

      vendorList.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      res.json(vendorList);
    });
  };

  if (latParam !== undefined && lonParam !== undefined) {
    getVendors(parseFloat(latParam), parseFloat(lonParam));
  } else {
    db.query("SELECT latitude, longitude FROM customer_addresses WHERE customer_id = ? AND is_default = 1 LIMIT 1", [customer_id], (err, results) => {
      if (err || results.length === 0) {
        return getVendors(null, null);
      }
      getVendors(parseFloat(results[0].latitude), parseFloat(results[0].longitude));
    });
  }
});

// Update Vendor Location & Service Radius
app.post('/api/v1/vendor/location', verifyToken, requireRole('vendor'), (req, res) => {
  const vendor_id = req.user.user_id;
  const {
    latitude,
    longitude,
    formatted_address,
    service_radius,
    Shop_name,
    shop_number,
    landmark,
    pocket,
    sector,
    city,
    state,
    structured_address
  } = req.body;

  if (latitude === undefined || longitude === undefined || !formatted_address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  const radius = service_radius !== undefined ? parseFloat(service_radius) : 5.00;

  const query = `
    UPDATE vendor 
    SET latitude = ?, longitude = ?, formatted_address = ?, service_radius = ?, 
        Shop_name = COALESCE(?, Shop_name),
        shop_number = ?,
        landmark = ?,
        pocket = ?,
        sector = ?,
        city = ?,
        state = ?,
        structured_address = ?
    WHERE vendor_id = ?
  `;
  const params = [
    lat, lon, formatted_address, radius,
    Shop_name || null,
    shop_number || null,
    landmark || null,
    pocket || null,
    sector || null,
    city || null,
    state || null,
    structured_address ? (typeof structured_address === 'string' ? structured_address : JSON.stringify(structured_address)) : null,
    vendor_id
  ];

  db.query(query, params, (err, result) => {
    if (err) {
      console.error("Database error updating vendor location:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ success: true, message: "Vendor location updated successfully" });
  });
});

app.get('/api/v1/customer/:customer_id', verifyToken, requireRole('customer'), requireCustomerOwnership, (req, res) => {
  const { customer_id } = req.params; // Get customer_id from URL params
  const query = `SELECT Phone,customer_address FROM customer WHERE customer_id = ?`;

  db.query(query, [customer_id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json({ message: "Data fetched successfully", result });
    console.log(result);
  });
});

app.get('/api/v1/get-customer-vendor', verifyToken, (req, res) => {
  const caller_id = req.user.user_id;
  const caller_role = req.user.role;

  if (caller_role === 'customer') {
    // Get a vendor this customer has a relationship with, or just the first vendor
    const getVendorQuery = `
      SELECT v.vendor_id FROM vendor v
      LEFT JOIN udar_requests ur ON v.vendor_id = ur.vendor_id AND ur.customer_id = ?
      ORDER BY ur.status = 'accepted' DESC, v.vendor_id ASC LIMIT 1
    `;
    db.query(getVendorQuery, [caller_id], (err, result) => {
      if (err || result.length === 0) return res.status(404).json({ error: "No vendor found" });
      res.json({ customer_id: caller_id, vendor_id: result[0].vendor_id });
    });
  } else if (caller_role === 'vendor') {
    // Get a customer this vendor has a relationship with, or the first customer
    const getCustomerQuery = `
      SELECT c.customer_id FROM customer c
      LEFT JOIN udar_requests ur ON c.customer_id = ur.customer_id AND ur.vendor_id = ?
      ORDER BY ur.status = 'accepted' DESC, c.customer_id ASC LIMIT 1
    `;
    db.query(getCustomerQuery, [caller_id], (err, result) => {
      if (err || result.length === 0) return res.status(404).json({ error: "No customer found" });
      res.json({ customer_id: result[0].customer_id, vendor_id: caller_id });
    });
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
});


app.get('/api/v1/udar/vendors/:customer_id', verifyToken, requireRole('customer'), requireCustomerOwnership, (req, res) => {
  const { customer_id } = req.params;
  console.log("Received customer_id:", customer_id); // Debugging

  if (!customer_id) {
    return res.status(400).json({ message: "customer_id is required" });
  }

  const query = `
    SELECT 
      v.vendor_id, 
      v.Shop_name, 
      v.Phone, 
      v.shop_address, 
      SUM(a.balance_due) AS balance_due
    FROM account a
    JOIN vendor v ON a.vendor_id = v.vendor_id
    WHERE a.customer_id = ?
    GROUP BY v.vendor_id;
  `;

  db.query(query, [customer_id], (err, result) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ message: "Database query error", error: err });
    }
    res.json(result);
  });
});



// <<<<<<<<fetch payment request
app.get('/api/v1/payment-requests/:customer_id', verifyToken, requireRole('customer'), requireCustomerOwnership, (req, res) => {
  const { customer_id } = req.params;
  console.log(customer_id);

  if (!customer_id) {
    console.error("❌ Missing customer_id in request");
    return res.status(400).json({ success: false, message: "Customer ID is required" });
  }

  console.log("Received customer_id:", customer_id);

  const sql = "SELECT * FROM payment_requests WHERE customer_id = ? AND status = 'pending' ORDER BY request_time DESC";

  db.query(sql, [customer_id], (err, result) => {
    if (err) {
      console.error("❌ Error fetching payment requests:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.json(result);
  });
});




// ✅ Receive Payment (Vendor Accepts Payment Request)
app.post('/api/v1/receive-payment', verifyToken, requireRole('vendor'), (req, res) => {
  console.log("Received Payment Request Approval:", req.body);
  const { customer_id, amount_received, request_id } = req.body;
  console.log("========== RECEIVE PAYMENT ==========");
  console.log("Request Body:", req.body);
  console.log("Vendor ID:", vendor_id);
  console.log("====================================");
  const vendor_id = req.user.user_id;

  if (!customer_id || !amount_received) {
    return res.status(400).json({ success: false, message: "Missing customer_id or amount_received" });
  }

  const paymentAmount = parseFloat(amount_received);

  // Verify credit relationship
  db.query("SELECT COUNT(*) AS count FROM udar_requests WHERE customer_id = ? AND vendor_id = ? AND status = 'accepted'", [customer_id, vendor_id], (err, relationshipResult) => {
    if (err || relationshipResult[0].count === 0) {
      return res.status(403).json({ error: "Forbidden. No credit relationship exists with this customer." });
    }

    db.query("SELECT Name FROM customer WHERE customer_id = ?", [customer_id], (cErr, customerData) => {
      if (cErr || customerData.length === 0) {
        return res.status(404).json({ success: false, message: "Customer not found" });
      }
      const customerName = customerData[0].Name;

      db.getConnection((connErr, connection) => {
        if (commitErr) {
          return connection.rollback(() => {
            connection.release();
            return res.status(500).json({
              success: false,
              message: "Failed to commit ledger entry"
            });
          });
        }
        connection.beginTransaction((tErr) => {

          if (tErr) {
            connection.release();
            return res.status(500).json({
              success: false,
              message: "Failed to start database transaction"
            });
          }
        })
        // Step 1: Insert ledger adjustment row
        const insertPaymentQuery = `
          INSERT INTO account 
            (vendor_id, customer_id, customer_name, order_date_time, credit_value_vendor, debit_customer, credit_customer, balance_due, payment_method, payment_status, created_at) 
          VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'cash', 'paid', NOW())
        `;
        connection.query(insertPaymentQuery, [vendor_id, customer_id, customerName, paymentAmount, paymentAmount, paymentAmount, -paymentAmount], (err) => {
          if (err) {
            console.error("❌ Ledger error:", err);
            console.error("SQL Code:", err.code);
            console.error("SQL Message:", err.sqlMessage);
            return connection.rollback(() => res.status(500).json({ success: false, message: "Ledger transaction failed" }));
          }

          // Step 2: Update the payment request status to 'complete'
          const updateRequestSQL = request_id ?
            `UPDATE payment_requests SET status = 'complete', completed_time = NOW() WHERE request_id = ? AND status = 'pending'` :
            `UPDATE payment_requests SET status = 'complete', completed_time = NOW() WHERE customer_id = ? AND amount = ? AND status = 'pending' LIMIT 1`;
          const requestParams = request_id ? [request_id] : [customer_id, paymentAmount];

          connection.query(updateRequestSQL, requestParams, (err, updateResult) => {
            if (err) {
              console.error("❌ Request update error:", err);
              console.error("SQL Code:", err.code);
              console.error("SQL Message:", err.sqlMessage);
              return connection.rollback(() => res.status(500).json({ success: false, message: "Failed to update payment request status" }));
            }

            // Step 3: Insert vendor_transaction record
            const insertVendorTransactionSQL = `
              INSERT INTO vendor_transaction (customer_id, vendor_id, amount, transaction_type)
              VALUES (?, ?, ?, 'credit')
            `;
            connection.query(insertVendorTransactionSQL, [customer_id, vendor_id, paymentAmount], (err) => {
              if (err) {
                console.error("❌ Transaction logging error:", err);
                console.error("SQL Code:", err.code);
                console.error("SQL Message:", err.sqlMessage);
                return db.rollback(() => res.status(500).json({ success: false, message: "Failed to log transaction" }));
              }

              connection.commit((commitErr) => {
                if (commitErr) {
                  return connection.rollback(() => res.status(500).json({ success: false, message: "Failed to commit ledger entry" }));
                }

                // Emit Socket.io real-time confirmations
                io.to(`vendor_${vendor_id}`).emit('payment-received', { customer_id, amount: paymentAmount, request_id });
                io.to(`customer_${customer_id}`).emit('payment-recorded', { vendor_id, amount: paymentAmount, request_id });

                // Send push notification
                db.query('SELECT Shop_name FROM vendor WHERE vendor_id = ?', [vendor_id], (vErr, vRes) => {
                  const sName = (!vErr && vRes && vRes.length > 0) ? vRes[0].Shop_name : 'Vendor';
                  sendPushNotification(customer_id, 'customer', 'Payment Approved', `Your payment of ₹${paymentAmount} has been approved by ${sName}.`, 'Payment Approved', 'MyUdarScreen').catch(e => console.error('FCM error:', e));
                });
                connection.release();
                res.json({ success: true, message: "Payment verified and ledger updated successfully" });
              });
            });
          });
        });
      });
    });
  });
});


// ✅ Reject Payment Request
app.post('/api/v1/reject-payment', verifyToken, requireRole('vendor'), (req, res) => {
  console.log("Received Payment Request Rejection:", req.body);
  const { customer_id, amount, request_id } = req.body;
  const vendor_id = req.user.user_id;

  if (!customer_id && !request_id) {
    return res.status(400).json({ success: false, message: "Missing request_id or customer_id" });
  }

  const updateRequestSQL = request_id ?
    `UPDATE payment_requests SET status = 'rejected', completed_time = NOW() WHERE request_id = ? AND status = 'pending'` :
    `UPDATE payment_requests SET status = 'rejected', completed_time = NOW() WHERE customer_id = ? AND amount = ? AND status = 'pending' LIMIT 1`;
  const requestParams = request_id ? [request_id] : [customer_id, amount];

  db.query(updateRequestSQL, requestParams, (err, result) => {
    if (err) {
      console.error("❌ Request rejection update error:", err);
      return res.status(500).json({ success: false, message: "Failed to reject payment request" });
    }

    const payAmt = parseFloat(amount || 0);

    // Emit Socket event to customer
    io.to(`customer_${customer_id}`).emit('payment-rejected', { vendor_id, amount: payAmt, request_id });

    // Send push notification
    db.query('SELECT Shop_name FROM vendor WHERE vendor_id = ?', [vendor_id], (vErr, vRes) => {
      const sName = (!vErr && vRes && vRes.length > 0) ? vRes[0].Shop_name : 'Vendor';
      sendPushNotification(customer_id, 'customer', 'Payment Rejected', `Your payment of ₹${payAmt} has been rejected by ${sName}.`, 'Payment Rejected', 'MyUdarScreen').catch(e => console.error('FCM error:', e));
    });

    res.json({ success: true, message: "Payment request rejected successfully" });
  });
});

// ✅ Get Vendor Payment Requests
app.get('/api/v1/vendor/payment-requests/:vendor_id', verifyToken, requireRole('vendor'), (req, res) => {
  const { vendor_id } = req.params;
  if (parseInt(vendor_id) !== parseInt(req.user.user_id)) {
    return res.status(403).json({ error: "Forbidden. You do not own this resource." });
  }

  const sql = `
    SELECT pr.*, c.Name AS customer_name, c.Phone AS customer_phone 
    FROM payment_requests pr
    JOIN customer c ON pr.customer_id = c.customer_id
    WHERE pr.vendor_id = ?
    ORDER BY pr.request_time DESC
  `;

  db.query(sql, [vendor_id], (err, results) => {
    if (err) {
      console.error("❌ Error fetching vendor payment requests:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json(results || []);
  });
});


//  to fetch the customer data
app.get('/api/v1/update/:customer_id', verifyToken, requireRole('customer'), requireCustomerOwnership, (req, res) => {
  const customer_id = req.params.customer_id;
  const sql = "SELECT * FROM customer WHERE customer_id = ?";

  db.query(sql, [customer_id], (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: err.message }); // 🔹 Responds once
      return; // 🔹 Ensures no further response
    }

    if (result.length === 0) {
      res.status(404).json({ message: "Customer not found" }); // 🔹 Responds once
      return;
    }

    console.log("Fetched data:", result[0]);
    res.json(result[0]); // 🔹 Responds only once
  });
});




// set update
app.put('/api/v1/customer/:id',  verifyToken,  requireRole('customer'),  requireCustomerOwnership,  (req, res) => {
  
    const customer_id = req.params.id;
    const { Name, Phone, username } = req.body;

    console.log("========== UPDATE CUSTOMER ==========");
    console.log("Customer ID:", customer_id);
    console.log("Body:", req.body);

    const sql =
      "UPDATE customer SET Name=?, Phone=?, username=? WHERE customer_id=?";

    db.query(
      sql,
      [Name, Phone, username, customer_id],
      (err, result) => {

        if (err) {
          console.error("UPDATE ERROR:", err);

          return res.status(500).json({
            success: false,
            message: err.sqlMessage || err.message
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: "Customer not found"
          });
        }

        console.log("Profile Updated Successfully");

        return res.json({
          success: true,
          message: "Customer updated successfully"
        });
      }
    );
  }
);

//  food

const verifyFoodOwnership = (foodId, vendorId, callback) => {
  db.query('SELECT vendor_id FROM food WHERE food_id = ?', [foodId], (err, results) => {
    if (err) return callback(err, false);
    if (results.length === 0) return callback(null, false);
    const belongs = parseInt(results[0].vendor_id) === parseInt(vendorId);
    callback(null, belongs);
  });
};

// Fetch all food items for a vendor
const handleToggleFood = (req, res) => {
  const { food_id } = req.params; // Get food_id from URL
  const { is_available } = req.body; // Get new status from request body
  console.log("j", food_id, is_available);

  verifyFoodOwnership(food_id, req.user.user_id, (err, owns) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!owns) {
      return res.status(403).json({ error: "Forbidden. You do not own this food item." });
    }

    const query = "UPDATE food SET is_available = ? WHERE food_id = ?";
    db.query(query, [is_available, food_id], (err, result) => {
      if (err) {
        console.error("Error updating food status:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Food item not found" });
      }

      res.json({ message: "Food availability updated successfully" });
    });
  });
};

app.post('/api/v1/toggle-food/:food_id', verifyToken, requireRole('vendor'), handleToggleFood);
app.patch('/api/v1/toggle-food/:food_id', verifyToken, requireRole('vendor'), handleToggleFood);



//fetch the opening timeings 
app.get('/api/v1/vendor-details', verifyToken, requireRole('vendor'), (req, res) => {
  const vendor_id = req.user.user_id;

  const query = `SELECT Shop_name, open_close_timings, is_online, latitude, longitude, formatted_address, service_radius FROM vendor WHERE vendor_id = ?`;

  db.query(query, [vendor_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ error: "Vendor not found" });
    }
  });
});


app.get('/api/v1/vendor/:vendor_id', verifyToken, (req, res) => {
  const { vendor_id } = req.params;

  const query = `
    SELECT Shop_name, open_close_timings, is_online, shop_address, Phone, username, 
           latitude, longitude, formatted_address, service_radius,
           shop_number, landmark, pocket, sector, city, state, structured_address
    FROM vendor 
    WHERE vendor_id = ?
  `;

  db.query(query, [vendor_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ error: "Vendor not found" });
    }
  });
});


//  get the shop timings

app.get('/api/v1/vendor-timings/:vendorId', verifyToken, (req, res) => {
  const { vendorId } = req.params;
  console.log(vendorId);

  const query = `SELECT open_close_timings, is_online FROM vendor WHERE vendor_id = ?`;

  db.query(query, [vendorId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length > 0) {
      res.json(result[0]);
      console.log("r", result);
    } else {
      res.status(404).json({ error: "Vendor not found" });
    }
  });
});

// update timings
const handleShopTimingsUpdate = (req, res) => {
  const { vendorId } = req.params;
  const { open_close_timings } = req.body;
  console.log("t", open_close_timings);

  let timeings;
  try {
    timeings = typeof open_close_timings === 'string' ? open_close_timings : JSON.stringify(open_close_timings);
  } catch (err) {
    console.log("error");
  }
  const query = `UPDATE vendor SET open_close_timings = ? WHERE vendor_id = ?`;
  console.log("T", timeings);

  db.query(query, [timeings, vendorId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: "Shop timings updated successfully!" });
  });
};

app.post('/api/v1/update-shop-timings/:vendorId', verifyToken, requireRole('vendor'), requireVendorOwnership, handleShopTimingsUpdate);
app.put('/api/v1/vendor/:vendorId/timings', verifyToken, requireRole('vendor'), requireVendorOwnership, handleShopTimingsUpdate);

// toggle shop
const handleShopOnlineStatusUpdate = (req, res) => {
  const { vendorId } = req.params;
  const isOnline = req.body.isOnline !== undefined ? req.body.isOnline : req.body.is_online;

  const query = `UPDATE vendor SET is_online = ? WHERE vendor_id = ?`;

  db.query(query, [isOnline ? 1 : 0, vendorId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      message: `Shop is now ${isOnline ? "Open" : "Closed"}`,
      isOnline
    });
  });
};

app.post('/api/v1/update-shop-online-status/:vendorId', verifyToken, requireRole('vendor'), requireVendorOwnership, handleShopOnlineStatusUpdate);
app.put('/api/v1/vendor/:vendorId/status', verifyToken, requireRole('vendor'), requireVendorOwnership, handleShopOnlineStatusUpdate);

// Location endpoints moved above customer wildcard route

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (listening on all interfaces)`);
});






app.post("/api/v1/vendor/receive-payment", verifyToken, requireRole('vendor'), async (req, res) => {
  try {
    const { customer_id, amount } = req.body;
    const vendor_id = req.user.user_id;
    if (!customer_id || !amount) return res.status(400).json({ success: false, message: "Missing required fields" });
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return res.status(400).json({ success: false, message: "Payment amount must be greater than 0" });

    // Verify credit relationship
    db.query("SELECT COUNT(*) AS count FROM udar_requests WHERE customer_id = ? AND vendor_id = ? AND status = 'accepted'", [customer_id, vendor_id], (err, relationshipResult) => {
      if (err || relationshipResult[0].count === 0) {
        return res.status(403).json({ error: "Forbidden. No credit relationship exists with this customer." });
      }

      db.query("SELECT Name FROM customer WHERE customer_id = ?", [customer_id], (err, customerData) => {
        if (err) {
          console.error("SQL ERROR:", err);
          console.error("Code:", err.code);
          console.error("Message:", err.sqlMessage);

          return db.query('ROLLBACK', () =>
            res.status(500).json({
              success: false,
              message: err.sqlMessage
            })
          );
        }
        if (customerData.length === 0) return res.status(404).json({ success: false, message: "Customer not found" });
        const customerName = customerData[0].Name;
        db.query('START TRANSACTION', (err) => {
          if (err) return res.status(500).json({ success: false, message: "Failed to start transaction" });
          const insertPaymentQuery = `INSERT INTO account (vendor_id, customer_id, customer_name, order_date_time, credit_value_vendor, debit_customer, credit_customer, balance_due, payment_method, payment_status, created_at) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'cash', 'paid', NOW())`;
          db.query(insertPaymentQuery, [vendor_id, customer_id, customerName, paymentAmount, paymentAmount, paymentAmount, -paymentAmount], (err) => {
            if (err) {
              return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: "Database error" }));
            }
            db.query("UPDATE payment_requests SET status = 'complete' WHERE customer_id = ? AND vendor_id = ? AND status = 'pending'", [customer_id, vendor_id], (err) => {
              if (err) {
                return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: "Database error" }));
              }
              db.query('COMMIT', (err) => {
                if (err) {
                  return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: "Database error" }));
                }
                io.to(`vendor_${vendor_id}`).emit('payment-received', { customer_id, amount: paymentAmount });
                io.to(`customer_${customer_id}`).emit('payment-recorded', { vendor_id, amount: paymentAmount });
                db.query('SELECT Shop_name FROM vendor WHERE vendor_id = ?', [vendor_id], (vErr, vRes) => {
                  const sName = (!vErr && vRes && vRes.length > 0) ? vRes[0].Shop_name : 'Vendor';
                  sendPushNotification(customer_id, 'customer', 'Payment Approved', `Your payment of ₹${paymentAmount} has been approved by ${sName}.`, 'Payment Approved', 'MyUdarScreen').catch(e => console.error('FCM error:', e));
                });
                res.json({ success: true, message: "Payment recorded successfully" });
              });
            });
          });
        });
      });
    });
  } catch (error) { res.status(500).json({ success: false, message: "Internal Server Error" }); }
});


// ✅ Update/Register FCM Token


// ✅ Reject Udar (Credit) Request
app.post('/api/v1/reject-udar', verifyToken, requireRole('vendor'), (req, res) => {
  const { request_id } = req.body;
  if (!request_id) {
    return res.status(400).json({ message: 'request_id is required' });
  }

  // Verify that the request belongs to the logged-in vendor
  db.query("SELECT vendor_id FROM udar_requests WHERE request_id = ?", [request_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Request not found" });
    if (parseInt(results[0].vendor_id) !== parseInt(req.user.user_id)) {
      return res.status(403).json({ error: "Forbidden. You do not own this credit request." });
    }

    console.log("Rejecting request_id:", request_id);

    // Update status to 'rejected' in udar_requests table
    const updateQuery = `UPDATE udar_requests SET status = 'rejected' WHERE request_id = ?`;

    db.query(updateQuery, [request_id], (err, result) => {
      if (err) {
        console.error("Database UPDATE error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Request not found or already processed" });
      }

      // Find customer_id and vendor_id for this request to trigger notification
      db.query('SELECT customer_id, vendor_id FROM udar_requests WHERE request_id = ?', [request_id], (sErr, sRes) => {
        if (!sErr && sRes && sRes.length > 0) {
          const { customer_id, vendor_id } = sRes[0];
          db.query('SELECT Shop_name FROM vendor WHERE vendor_id = ?', [vendor_id], (vErr, vRes) => {
            const shopName = (!vErr && vRes && vRes.length > 0) ? vRes[0].Shop_name : 'Vendor';
            sendPushNotification(
              customer_id,
              'customer',
              'Credit Request Rejected',
              `Your Udar (credit) request has been rejected by ${shopName}.`,
              'Credit Request Rejected',
              'MyUdarScreen'
            ).catch(e => console.error('FCM error:', e));
          });
        }
      });

      res.json({ status: "rejected", message: "Udar request has been rejected" });
    });
  });
});

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);