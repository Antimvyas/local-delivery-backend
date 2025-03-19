
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db=require("./dbs.js");
const path = require('path');
const multer = require('multer');  // ✅ Add this line to import multer
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const ioClient = require('socket.io-client'); // ✅ Import socket.io client
const { log } = require('console');



const app = express();
app.use(express.json());
app.use(cors({ }));
const server = http.createServer(app);
const io     = socketIo(server, {
  cors: {
    origin: "*", // Adjust for production
  }
});

const vendorSockets = new Map(); // Store vendor WebSocket connections

io.on("connection", (socket) => {
  console.log(`🔌 New vendor connected: ${socket.id}`);

  // ✅ Register vendor connection
  socket.on("registerVendor", (vendor_id) => {
    vendorSockets.set(vendor_id, socket);
    console.log(`✅ Vendor Registered: ${vendor_id}`);
  });

  // ✅ When a new order is placed
  socket.on("placeOrder", async (data) => {
    console.log("📦 New Order Received:", data);

    // Notify vendor in real-time (if online)
    const vendorSocket = vendorSockets.get(data.vendor_id);
    if (vendorSocket) {
      vendorSocket.emit("newOrderNotification", data);
    }

    // 📌 Auto-Reject Order After 5 Minutes
    setTimeout(async () => {
      db.query(
        "SELECT order_status FROM orders WHERE order_id = ?",
        [data.order_id],
        async (err, result) => {
          if (err || result.length === 0) return;

          if (result[0].order_status === "pending") {
            // If still pending, reject order
            db.query(
              "UPDATE orders SET order_status = 'rejected' WHERE order_id = ?",
              [data.order_id]
            );

            console.log("🚫 Order Auto-Rejected:", data.order_id);

            // Notify customer & vendor about auto-rejection
            io.emit(`customer-${data.customer_id}-order-updated`, {
              order_id: data.order_id,
              status: "rejected",
            });

            const vendorSocket = vendorSockets.get(data.vendor_id);
            if (vendorSocket) {
              vendorSocket.emit("orderAutoRejected", {
                order_id: data.order_id,
                status: "Rejected",
              });
            }
          }
        }
      );
    }, 300000); // 5 minutes (300,000 ms)
  });

  // ✅ Vendor Accepts Order
  socket.on("acceptOrder", (data) => {
    console.log("✅ Order Accepted:", data);

    db.query("UPDATE orders SET order_status = 'accepted' WHERE order_id = ?", [
      data.order_id
    ]);

    io.emit(`customer-${data.customer_id}-order-updated`, {
      order_id: data.order_id,
      status: "Accepted",
    });
  });

  // ✅ Vendor Rejects Order
  socket.on("rejectOrder", (data) => {
    console.log("❌ Order Rejected:", data);

    db.query("UPDATE orders SET order_status = 'Rejected' WHERE order_id = ?", [
      data.order_id
    ]);

    io.emit(`customer-${data.customer_id}-order-updated`, {
      order_id: data.order_id,
      status: "Rejected",
    });
  });

  // ✅ Handle vendor disconnection
  socket.on("disconnect", () => {
    console.log(`❌ Vendor disconnected: ${socket.id}`);
    vendorSockets.forEach((value, key) => {
      if (value === socket) vendorSockets.delete(key);
    });
  });
});



// for IMAGE STORE
app.use(express.urlencoded({ extended: true })); 
app.use('/image', express.static(path.join(__dirname, 'image')));
const uploadDir = path.join(__dirname, 'image');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'image/'); // Save images in "uploads" folder
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName); // Unique filename
  },
});
const upload = multer({ storage });



// API GET FOOD ITEM
app.get('/api/v1/food', (req, res) => {
  const vendor_id = req.query.vendor_id; // ✅ FIXED: Extract vendor_id safely

  if (!vendor_id) {
    return res.status(400).json({ error: 'Missing vendor_id parameter' });
  }
   const sql = `SELECT food_id,food_name,cost,food_img ,food_type,food_description from food where vendor_id=?`;
  db.query(sql, [vendor_id], (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'No food items found' });
    }
    res.json(results);
  });
});





// vendor & customers registration
app.post('/api/v1/set-data', (req, res) => {
  const { username, Name, Phone, password, selectedOption, customer_address } = req.body;

  const table = selectedOption === 'customer' ? 'customers' : 'vendor';

  // ✅ 1️⃣ Check if username or phone already exists
  const checkQuery = `SELECT * FROM ${table} WHERE username = ? OR Phone = ?`;

  db.query(checkQuery, [username, Phone], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length > 0) {
      // ✅ 2️⃣ If username/phone exists, send a clear error message
      if (results.some(user => user.username === username)) {
        return res.status(400).json({ message: "Username already exists!" });
      }
      if (results.some(user => user.Phone === Phone)) {
        return res.status(400).json({ message: "Phone number already exists!" });
      }
    }

    // ✅ 3️⃣ If username & phone are unique, insert user
    let query;
    let queryParams = [username, Name, Phone, password, selectedOption];

    if (selectedOption === 'customer') {
      query = `INSERT INTO ${table} (username, Name, Phone, password, selectedOption, customer_address) VALUES (?, ?, ?, ?, ?, ?)`;
      queryParams.push(customer_address);
    } else {
      query = `INSERT INTO ${table} (username, Name, Phone, password, selectedOption) VALUES (?, ?, ?, ?, ?)`;
    }

    db.query(query, queryParams, (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      res.json({
        message: "User added successfully",
        username: username,
        customer_id: result.insertId  
      });
    });
  });
});





// Login ----------->>>>>

app.post('/api/v1/login', (req, res) => {
  const { username, password, role } = req.body;
  console.log(username, password, role);

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const allowedRoles = { vendor: 'vendor', customer: 'customers' };
  const table = allowedRoles[role.toLowerCase()];

  if (!table) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  // Check if the username or phone number exists
  const sql = `SELECT * FROM ${table} WHERE username = ? OR phone = ? LIMIT 1`;

  db.query(sql, [username, username], (err, result) => {
    if (err) {
      console.error('Database Error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (!result || result.length === 0) {
      return res.status(401).json({ success: false, message: 'Username or phone number not found' });
    }

    const dbUser = result[0];

    if (dbUser.password !== password) {
      console.log('Password mismatch:', dbUser.password, password);
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const customer_id = dbUser.customer_id;
    const vendor_id = dbUser.vendor_id;

    res.json({ success: true, message: 'Login successful', vendor_id, customer_id });
  });
});



// update vendor
app.post('/api/v1/add-vendor', (req, res) => {
  const { Shop_name, shop_address, username } = req.body;
  const updateQuery = `UPDATE vendor SET Shop_name=?, shop_address=? WHERE username=?`;

  db.query(updateQuery, [Shop_name, shop_address, username], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const fetchVendorIdQuery = `SELECT vendor_id FROM vendor WHERE username=?`;
    
    db.query(fetchVendorIdQuery, [username], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (rows.length > 0) {
        const vendor_id = rows[0].vendor_id;
        res.status(201).json({ message: 'Vendor updated successfully!', vendor_id });
      } else {
        res.status(404).json({ error: 'Vendor not found' });
      }
    });
  });
});



// add-food
app.post('/api/v1/food-set', upload.single('food_img'), (req, res) => {
  const { food_name, cost ,food_type,food_description,vendor_id} = req.body;
  const food_img = req.file ? `${req.file.filename}` : null; // ✅ Store image path
  if (!food_name || !cost || !food_img) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  const sql = `INSERT INTO food (food_name, cost, food_img, food_type,food_description,vendor_id) VALUES ('${food_name}', ${cost},'${food_img}','${food_type}','${food_description}',${vendor_id})`;
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    
   res.json({ message: 'Food item added successfully!', food_id: result.insertId });
  });
});

// EDIT FOOD---->>>>>
app.post('/api/v1/food-update',upload.single('food_img'),(req,res)=>{
  const { food_id, food_name, cost,food_type,food_description, } = req.body;
  const food_img = req.file ? `${req.file.filename}` : null;
   if (!food_id || !food_name || !cost ||!food_img) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const sql = "UPDATE food SET food_name = ?, cost = ?, food_img = ? food_type=?,food_description=?, WHERE food_id = ?";
    const values = [food_name, cost, food_img, food_id,food_type,food_description,];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Update Error:", err);
            return res.status(500).json({ message: "Database update failed" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Food item not found" });
        }

        res.json({ message: "Food item updated successfully!" });
    });
})



// Delete Food---->>>>
app.use('/api/v1/food-delete',(req,res)=>{
  const { food_id, food_img } = req.body;

  if (!food_id || !food_img) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Delete food item from database
  const sql = "DELETE FROM food WHERE food_id = ?";
  
  db.query(sql, [food_id], (err, result) => {
    if (err) {
      console.error("Delete Error:", err);
      return res.status(500).json({ message: "Database delete failed" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Food item not found" });
    }

    // Delete image from server
    const imagePath = path.join(__dirname, '../image/', food_img);
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error("Image Delete Error:", err);
      }
    });

    res.json({ message: "Food item deleted successfully!" });
  });
})


// ------->>>>>>>>fetch all vendors
app.get('/api/v1/vendors', (req, res) => {
  const query = `
    SELECT 
      v.vendor_id, 
      v.Shop_name, 
      v.shop_address, 
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
app.post('/api/v1/orders', (req, res) => {
  const { customer_id, vendor_id, total_cost, customers_location, customers_contact, payment_methods, items } = req.body;

  if (!customer_id || !vendor_id || !total_cost || !customers_location || !customers_contact || !payment_methods || !items || items.length === 0 ) {
    return res.status(400).json({ error: 'All fields are required, and items cannot be empty' });
  }

  db.beginTransaction((transactionError) => {
    if (transactionError) {
      console.error('Transaction Error:', transactionError);
      return res.status(500).json({ error: 'Failed to start transaction' });
    }

    // ✅ Step 1: Get Customer Name from Customers Table
    const customerQuery = `SELECT Name FROM customers WHERE customer_id = ?`;
    
    db.query(customerQuery, [customer_id], (customerErr, customerResult) => {
      if (customerErr) {
        console.error('Error fetching customer name:', customerErr);
        return db.rollback(() => res.status(500).json({ error: 'Failed to fetch customer name' }));
      }

      if (customerResult.length === 0) {
        return db.rollback(() => res.status(404).json({ error: 'Customer not found' }));
      }

      const customerName = customerResult[0].Name; // ✅ Store the customer name

      // ✅ Step 2: Insert Order into `orders` Table
      function insertOrder() {
        const orderQuery = `
          INSERT INTO orders 
            (customer_id, vendor_id, total_cost, customers_location, customers_contact, payment_methods) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(orderQuery, [customer_id, vendor_id, total_cost, customers_location, customers_contact, payment_methods], (orderErr, orderResult) => {
          if (orderErr) {
            console.error('Error inserting into orders:', orderErr);
            return db.rollback(() => res.status(500).json({ error: 'Failed to place order' }));
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

          db.query(orderItemsQuery, [orderItemsData], (itemsErr) => {
            if (itemsErr) {
              console.error('Error inserting into order_items:', itemsErr);
              return db.rollback(() => res.status(500).json({ error: 'Failed to add order items' }));
            }

            // ✅ Step 4: Handle Payment Method
            if (payment_methods === 'credit') {
              insertIntoAccount(order_id, orderDateTime, customerName); // ✅ Pass customerName
            } else {
              finalizeOrder(order_id);
            }
          });
        });
      }

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
            customerName, // ✅ Pass fetched customer name here
            item.food_name,
            quantity,
            cost,
            orderDateTime, // order_date_time
            itemTotal, // debit_value_vendor (not applicable here)
            0, // credit_value_vendor (vendor is credited)
            0, // debit_customer (not applicable here)
            itemTotal, // credit_customer (customer is taking credit)
            itemTotal, // balance_due (full amount remains due)
            payment_methods,
            paymentStatus,
            paymentDateTime, // No payment done yet
            new Date() // created_at timestamp
          ];
        });

        db.query(insertAccountQuery, [accountValues], (accountErr) => {
          if (accountErr) {
            console.error('Error inserting into account:', accountErr);
            return db.rollback(() => res.status(500).json({ error: 'Failed to update account table' }));
          }
          finalizeOrder(order_id);
        });
      }

      // ✅ Step 6: Commit the Transaction
      function finalizeOrder(order_id) {
        db.commit((commitErr) => {
          if (commitErr) {
            console.error('Transaction Commit Error:', commitErr);
            return db.rollback(() => res.status(500).json({ error: 'Failed to finalize order' }));
          }

          // Notify vendor via WebSocket
          io.emit(`vendor-${vendor_id}-new-order`, { order_id });

          res.json({ message: 'Order placed successfully', order_id });
        });
      }

      // ✅ Step 7: Check if Credit is Allowed (Udar Check)
      if (payment_methods === 'credit') {
        const checkUdarQuery = "SELECT * FROM account WHERE customer_id = ? AND vendor_id = ?";

        db.query(checkUdarQuery, [customer_id, vendor_id], (udarErr, udarResult) => {
          if (udarErr) {
            console.error('Error checking Udar:', udarErr);
            return db.rollback(() => res.status(500).json({ error: 'Failed to verify account' }));
          }

          if (udarResult.length === 0) {
            console.warn('Udar is not approved, but adding credit order.');
          }

          // ✅ Insert order after Udar check
          insertOrder();
        });
      } else {
        insertOrder();
      }
    });
  });
});




//  fetch all orders
app.get("/api/v1/vendor/orders", (req, res) => {
  const { vendor_id } = req.query;
  if (!vendor_id) return res.status(400).json({ error: "Vendor ID is required" });

  const query = `
    SELECT o.order_id, o.customers_location, o.customers_contact, o.total_cost, 
           o.payment_methods, o.order_status, c.Name AS customer_name,
           COALESCE(
             JSON_ARRAYAGG(
               JSON_OBJECT('food_name', oi.food_name, 'quantity', oi.quantity, 'item_total', oi.item_total)
             ), '[]'
           ) AS food_items
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
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


// 📌 Accept Order
// app.put("/api/v1/vendor/orders/accept", (req, res) => {
//   const { order_id, vendor_id } = req.body;
//   if (!order_id || !vendor_id) return res.status(400).json({ error: "Order ID and Vendor ID are required" });

//   const query = `UPDATE orders SET order_status = 'accepted' WHERE order_id = ? AND vendor_id = ?`;

//   db.query(query, [order_id, vendor_id], (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });

//     io.emit(`vendor-${vendor_id}-order-updated`, { order_id, order_status: "accepted" });
//     res.json({ message: "Order Accepted Successfully" });
//   });
// });

// 📌 Reject Order
// app.put("/api/v1/vendor/orders/reject", (req, res) => {
//   const { order_id, vendor_id } = req.body;
//   if (!order_id || !vendor_id) return res.status(400).json({ error: "Order ID and Vendor ID are required" });

//   const query = `UPDATE orders SET order_status = 'rejected' WHERE order_id = ? AND vendor_id = ?`;

//   db.query(query, [order_id, vendor_id], (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });

//     io.emit(`vendor-${vendor_id}-order-updated`, { order_id, order_status: "rejected" });
//     res.json({ message: "Order Rejected Successfully" });
//   });
// });

// for fetch orders for customer
app.get('/api/v1/customer/orders', async (req, res) => {
  try {
      const customer_id = req.query.customer_id;
      console.log("Received customer_id:", customer_id);

      if (!customer_id) {
          return res.status(400).json({ error: "Customer ID is required" });
      }

      // Corrected SQL Query
      const query = `
          SELECT 
              o.order_id, o.customer_id, o.vendor_id, 
              oi.food_name, oi.quantity, 
              o.total_cost, o.order_status, 
              v.shop_name, o.customers_location, o.customers_contact
          FROM orders o
          JOIN vendor v ON o.vendor_id = v.vendor_id
          JOIN customers c ON o.customer_id = c.customer_id
          JOIN order_items oi ON o.order_id = oi.order_id
          WHERE o.customer_id = ?;
      `;

      db.query(query, [customer_id], (err, results) => {
          if (err) {
              console.error("Error fetching orders:", err);
              return res.status(500).json({ error: "Internal Server Error" });
          }
          res.json(results);
      });

  } catch (error) {
      console.error("Error in order fetching:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// 📌 Fetch All Accepted Orders for a Vendor
app.get("/api/v1/vendor/accepted-orders", (req, res) => {
  const { vendor_id } = req.query;
  if (!vendor_id) return res.status(400).json({ error: "Vendor ID is required" });

  const query = `
    SELECT o.order_id, o.customers_location, o.customers_contact, o.total_cost, 
           o.payment_methods, o.order_status, c.Name AS customer_name,
           COALESCE(
             JSON_ARRAYAGG(
               JSON_OBJECT('food_name', oi.food_name, 'quantity', oi.quantity, 'item_total', oi.item_total)
             ), '[]'
           ) AS food_items
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.vendor_id = ? AND o.order_status IN ('accepted', 'preparing', 'ready', 'out for delivery')
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
app.put("/api/v1/vendor/orders/update-status", (req, res) => {
  const { order_id, vendor_id, new_status } = req.body;
  if (!order_id || !vendor_id || !new_status) {
    return res.status(400).json({ error: "Order ID, Vendor ID, and new status are required" });
  }

  const query = `UPDATE orders SET order_status = ? WHERE order_id = ? AND vendor_id = ?`;

  db.query(query, [new_status, order_id, vendor_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    io.emit(`vendor-${vendor_id}-order-updated`, { order_id, order_status: new_status });
    io.emit(`customer-order-updated`, { order_id, order_status: new_status }); // Notify customer
    res.json({ message: `Order status updated to ${new_status}` });
  });
});



// ✅ Customer Requests Udar Account
app.post("/api/v1/request-udar", (req, res) => {
  const { customer_id, vendor_id } = req.body;

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
    const queryCustomer = "SELECT Name FROM customers WHERE customer_id = ?";
    
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
        res.json({ message: "Udar request sent successfully" });
      });
    });
  });
});


 

// ✅ Vendor Accepts Udar Request
app.post("/api/v1/accept-udar", (req, res) => {
  const { request_id } = req.body;

  if (!request_id) {
    return res.status(400).json({ message: "request_id is required" });
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
    res.json({ status: "accepted", message: "Udar request has been accepted" });
  });
});




// ✅ Add Purchase on Udar (Credit)
app.get("/api/v1/customer-transactions/:customer_id", (req, res) => {
  const { customer_id } = req.params;

  // ✅ Check if customer_id is valid
  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  const query = `
      SELECT 
          a.order_id, a.food_name, a.quantity, a.cost, a.total_cost, 
          a.debit_value_vendor, a.credit_value_vendor, a.balance_due, 
          a.order_date_time, c.Name AS customer_name, a.credit_customer, a.debit_customer
      FROM account a
      JOIN customers c ON a.customer_id = c.customer_id
      WHERE a.customer_id = ?
      ORDER BY a.order_date_time DESC;
  `;

  db.query(query, [customer_id], (err, results) => {
      if (err) {
          console.error("❌ Database Error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "No transactions found for this customer" });
      }

      // ✅ Filter out transactions where order_id is NULL
      const validTransactions = results.filter(transaction => transaction.order_id !== null);

      if (validTransactions.length === 0) {
          return res.status(404).json({ message: "No valid transactions found for this customer" });
      }

      // ✅ Calculate total amounts safely
      const totalSummary = validTransactions.reduce(
          (acc, item) => {
              console.log("🔹 Processing item:", item); // ✅ Debugging log
              
              acc.total_cost += item.total_cost || 0;
              acc.total_credit += item.debit_customer || 0;
              acc.total_debit += item.credit_customer || 0;
              acc.total_balance_due += item.balance_due || 0;
              return acc;
          },
          { total_cost: 0, total_credit: 0, total_debit: 0, total_balance_due: 0 }
      );

      console.log('✅ Response Data:', { 
          customer_name: validTransactions[0].customer_name, 
          transactions: validTransactions, 
          totalSummary 
      });

      res.json({
          customer_name: validTransactions[0].customer_name,
          transactions: validTransactions,
          totalSummary
      });
  });
});



//check udar


app.get("/api/v1/check-udar", (req, res) => {
  const { customer_id, vendor_id } = req.query; // Get query params

  if (!customer_id || !vendor_id) {
    return res.status(400).json({ message: "Missing customer_id or vendor_id" });
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



app.get("/api/v1/customer-udar-accounts/:customer_id", (req, res) => {
  const { customer_id } = req.params;

  if (!customer_id) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  const query = `
   select status,vendor_id from udar_requests where customer_id=?
  `;

  db.query(query, [customer_id], (err, results) => {
    if (err) {
      console.error("❌ Database Error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  
    res.json(results); // ✅ Returns list of vendor_ids where customer already has an account
    console.log(results);
    
  });
});



// ✅ Fetch Udar Requests for Vendor
app.get("/api/v1/udar-requests/:vendor_id", (req, res) => {
  const { vendor_id } = req.params;
  
  const query = `
      SELECT ur.request_id, c.Name 
      FROM udar_requests ur 
      JOIN customers c ON ur.customer_id = c.customer_id 
      WHERE ur.vendor_id = ? 
      AND ur.status = 'pending'
  `;

  db.query(query, [vendor_id], (err, results) => {
      if (err) {
          console.error("Database error:", err);  // Logs the error for debugging
          return res.status(500).json({ error: "Internal Server Error" }); // Sends error response
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "No pending requests found" }); // Handle empty result set
      }

      res.json(results); // Sends the customer names and request IDs to frontend
  });
});


// ✅ Fetch Udar Accounts for a Vendor
app.get("/api/v1/vendor-dashboard/:vendor_id", (req, res) => {
  const { vendor_id } = req.params;

  const query = `
      SELECT 
          c.customer_id,
          c.Name,
          c.Phone,
          c.customer_address,
          SUM(a.balance_due) AS total_pending_amount
      FROM account a
      JOIN customers c ON a.customer_id = c.customer_id
      WHERE a.vendor_id = ?
      GROUP BY c.customer_id, c.Name, c.Phone, c.customer_address;
  `;

  db.query(query, [vendor_id], (err, results) => {
      if (err) {
          console.error("❌ Database Error:", err);  // ✅ Log full SQL error
          return res.status(500).json({ error: "Internal Server Error", details: err.message });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "No records found" });
      }

      res.json(results);
  });
});



// ✅ Fetch Customer Udar Accounts (All Vendors)
app.get("/api/v1/customer/udar/:customer_id", (req, res) => {
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
    JOIN customers c ON a.customer_id = c.customer_id
    JOIN vendor v ON a.vendor_id = v.vendor_id  -- Add this join for the 'vendors' table
    WHERE a.customer_id = ?
    ORDER BY a.order_date_time DESC;
`;


  db.query(query, [customer_id], (err, results) => {
      if (err) {
          console.error("❌ Database Error:", err);
          return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "No transactions found for this customer" });
      }

      // ✅ Filter out transactions where order_id is NULL
      const validTransactions = results.filter(transaction => transaction.order_id !== null);

      if (validTransactions.length === 0) {
          return res.status(404).json({ message: "No valid transactions found for this customer" });
      }
 console.log(results);
 
      // ✅ Calculate total amounts safely
      const totalSummary = validTransactions.reduce(
          (acc, item) => {
              console.log("🔹 Processing item:", item); // ✅ Debugging log
              
              acc.total_cost += item.total_cost || 0;
              acc.total_credit += item.debit_value_vendor || 0;
              acc.total_debit += item.credit_value_vendor || 0;
              acc.total_balance_due += item.balance_due || 0;
              return acc;
          },
          { total_cost: 0, total_credit: 0, total_debit: 0, total_balance_due: 0 }
      );

      console.log('✅ Response Data:', { 
        // vendor_id:validTransactions[0].vendor_id,
          Shop_name: validTransactions[0].Shop_name, 
          transactions: validTransactions, 
          totalSummary ,
         

      });

      res.json({
          vendor_id:validTransactions[0].vendor_id,
          Shop_name: validTransactions[0].Shop_name,
          transactions: validTransactions,
          totalSummary
      });
  });
});

// ✅ Clear Bill (Customer Pays)
app.post("/api/v1/request-payment", (req, res) => {
  const { customer_id, vendor_id, amount } = req.body;
console.log(customer_id, vendor_id, amount );

  // Insert request into a payment requests table (for the popup)
  const insertQuery = `
    INSERT INTO payment_requests (customer_id, vendor_id, amount, status, request_time) 
    VALUES (?, ?, ?, 'pending', NOW());
  `;

  db.query(insertQuery, [customer_id, vendor_id, amount], (err, result) => {
    if (err) return res.status(500).send({ error: err.message });

    res.json({ success: true, message: "Payment request sent to the vendor." });
  });
});


// ✅ Monthly Reminder to Customers
app.get("/api/v1/send-reminder", (req, res) => {
  const query = `
    SELECT DISTINCT c.customer_name, c.Phone, v.Shop_name, a.balance_due
    FROM account a
    JOIN customers c ON a.customer_id = c.customer_id
    JOIN vendor v ON a.vendor_id = v.vendor_id
    WHERE a.payment_status = 'pending' AND a.balance_due > 0;
  `;
  db.query(query, (err, result) => {
    if (err) return res.status(500).send(err);
    result.forEach(customer => {
      console.log(`Reminder sent to ${customer.customer_name} for ₹${customer.balance_due} at ${customer.shop_name}`);
    });
    res.json({ message: "Reminders sent" });
  });
});
app.get('/api/v1/customer/:customer_id', (req, res) => {
  const { customer_id } = req.params; // Get customer_id from URL params
  const query = `SELECT Phone,customer_address FROM customers WHERE customer_id = ?`;

  db.query(query, [customer_id], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json({ message: "Data fetched successfully", result });
    console.log(result);
  });
});

app.get("/api/v1/get-customer-vendor", (req, res) => {
  const getCustomerQuery = "SELECT customer_id FROM customers LIMIT 1"; // Modify as needed
  const getVendorQuery = "SELECT vendor_id FROM vendor LIMIT 1"; // Modify as needed

  db.query(getCustomerQuery, (err, customerResult) => {
    if (err) {
      console.error("Error fetching customer_id:", err);
      return res.status(500).json({ error: "Error fetching customer data" });
    }

    db.query(getVendorQuery, (err, vendorResult) => {
      if (err) {
        console.error("Error fetching vendor_id:", err);
        return res.status(500).json({ error: "Error fetching vendor data" });
      }

      // Ensure both exist
      if (customerResult.length === 0 || vendorResult.length === 0) {
        return res.status(404).json({ error: "No data found" });
      }

      res.json({
        customer_id: customerResult[0].customer_id,
        vendor_id: vendorResult[0].vendor_id,
      });
    });
  });
});


app.get("/api/v1/udar/vendors/:customer_id", (req, res) => {
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
app.get("/api/v1/payment-requests/:customer_id", (req, res) => {
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
app.post("/api/v1/receive-payment", (req, res) => {
  console.log("Received Payment Request:", req.body);
  const { customer_id, amount_received } = req.body;
 console.log("log id ",customer_id,amount_received);
 
  if (!customer_id || !amount_received) {
    return res.status(400).json({ success: false, message: "Missing customer_id or amount_received" });
  }

  // Step 1: Update the customer's account
  const updateAccountSQL = `
    UPDATE account
    SET 
      debit_customer = debit_customer + ?, 
      credit_value_vendor = credit_value_vendor + ?, 
      balance_due = balance_due - ?, 
      payment_method = 'cash', 
      payment_status = 'paid', 
      payment_date_time = NOW()
    WHERE customer_id = ?
  `;

  db.query(updateAccountSQL, [amount_received, amount_received, amount_received, customer_id], (err, result) => {
    if (err) {
      console.error("❌ Error updating account balance:", err);
      return res.status(500).json({ success: false, message: "Failed to update account balance" });
    }

    // Step 2: Update the payment request status to 'completed'
    const updateRequestSQL = `
      UPDATE payment_requests
      SET status = 'complete'
      WHERE customer_id = ? AND amount = ? AND status = 'pending'
      LIMIT 1
    `;

    db.query(updateRequestSQL, [customer_id, amount_received], (err, result) => {
      if (err) {
        console.error("❌ Error updating payment request status:", err);
        return res.status(500).json({ success: false, message: "Failed to update payment request" });
      }

    //   // Step 3: Insert a transaction record for the vendor
      const insertVendorTransactionSQL = `
        INSERT INTO vendor_transaction (customer_id, amount, transaction_type)
        VALUES (?, ?, 'credit')
      `;

      db.query(insertVendorTransactionSQL, [customer_id, amount_received], (err, result) => {
        if (err) {
          console.error("❌ Error inserting vendor transaction:", err);
          return res.status(500).json({ success: false, message: "Failed to record transaction" });
        }

        res.json({ success: true, message: "Payment received successfully" });
      });
    });
  });
});
//  to fetch the customer data
app.get("/api/v1/update/:customer_id", (req, res) => {
  const customer_id = req.params.customer_id;
  const sql = "SELECT * FROM customers WHERE customer_id = ?";

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

app.put("/api/v1/customer/:id", (req, res) => {
  const customer_id = req.params.id;
  const { Name, Phone, username } = req.body;
  const sql = "UPDATE customers SET Name = ?, Phone = ?, username = ? WHERE customer_id = ?";
  db.query(sql, [Name, Phone, username, customer_id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Customer updated successfully" });
  });
});





const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
});
