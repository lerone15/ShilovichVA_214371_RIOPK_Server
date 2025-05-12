const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

let connection;

async function connectDB() {
    try {
        connection = await mysql.createPool(dbConfig);
        console.log('Connected to MySQL');
    } catch (error) {
        console.error('MySQL connection error:', error);
    }
}

connectDB();



app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    console.log(username,password);
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );
  
      if (rows.length === 0) {
        console.log("Invalid credentials 1");
        return res.status(401).json({ message: "Invalid credentials 1" });
      }
  
      const user = rows[0];
  
      // Compare passwords
      if (user.password!==password) {
        
        console.log("Invalid credentials 2",password,user.password);
        return res.status(401).json({ message: "Invalid credentials 2" });
      }
  
      // Generate JWT Token
      
      res.json({ message: "Login successful", user:username, role: user.role });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

// Create an employee
app.post('/employees', async (req, res) => {
    try {
        const { first_name, last_name, email, position, department, date_hired, manager_id } = req.body;
        const sql = `INSERT INTO employees (first_name, last_name, email, position, department, date_hired, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await connection.execute(sql, [first_name, last_name, email, position, department, date_hired, manager_id]);
        res.status(201).json({ id: result.insertId, message: 'Employee added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all employees
app.get('/employees', async (req, res) => {
    try {
        const [rows] = await connection.execute('SELECT * FROM employees');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a performance review
app.post('/performance_reviews', async (req, res) => {
    try {
        const { employee_id, reviewer_id, review_date, overall_rating, comments } = req.body;
        const sql = `INSERT INTO performance_reviews (employee_id, reviewer_id, review_date, overall_rating, comments) VALUES (?, ?, ?, ?, ?)`;
        const [result] = await connection.execute(sql, [employee_id, reviewer_id, review_date, overall_rating, comments]);
        res.status(201).json({ id: result.insertId, message: 'Performance review added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a goal
app.post('/goals', async (req, res) => {
    try {
        const { username, goal_description, due_date } = req.body; // Get user ID from request
        
        console.log(username,goal_description,due_date);
        // Step 1: Find the employee_id using username from employees table
        const findEmployeeSQL = `SELECT id FROM users WHERE username = ?`;
        const [employeeResult] = await connection.execute(findEmployeeSQL, [username]);
        
        if (employeeResult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given user ID" });
        }

        const employee_id = employeeResult[0].id;
        console.log(employee_id,goal_description,due_date);
        // Step 2: Insert the goal into the goals table (Fix: Correct number of values)
        const insertGoalSQL = `INSERT INTO goals (employee_id, goal_description, due_date) VALUES (?, ?, ?)`;
        const [result] = await connection.execute(insertGoalSQL, [employee_id, goal_description, due_date]);

        res.status(201).json({ id: result.insertId, message: "Goal added successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/goals', async (req, res) => {
    try {
        const sql = `SELECT * FROM goals`;
        const [result] = await connection.execute(sql);
        
        const sql2 = `SELECT username FROM users WHERE role = ?`; // Use a placeholder
        const [result2] = await connection.execute(sql2, ["USER"]); // Pass "USER" as a parameter

        res.status(201).json({
            message: 'Goals retrieved successfully',
            goals: result,
            employees: result2
        });
    } catch (error) {
        console.error("Database error:", error); // Log the actual error
        res.status(500).json({ error: error.message });
    }
});


app.get('/user/goals/:userId', async (req, res) => {
    try {
        const username = req.params.userId;

        const findEmployeeSQL = `SELECT id FROM users WHERE username = ?`;
        const [employeeResult] = await connection.execute(findEmployeeSQL, [username]);
        
        if (employeeResult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given user ID" });
        }

        const userId = employeeResult[0].id;
        const sql = `SELECT * FROM goals WHERE employee_id = ?`;
        const [goals] = await connection.execute(sql, [userId]);
        console.log(userId,goals);
        res.status(200).json({ message: 'Goals retrieved successfully', goals });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/user/goals/:goalId', async (req, res) => {
    try {
        const { goalId } = req.params;
        const { status, timeField } = req.body; // Expecting 'status' and time field ('start' or 'finish')

        let timeColumn = "";
        if (timeField === "start") {
            timeColumn = "start_time";
        } else if (timeField === "finish") {
            timeColumn = "finish_time";
        } else {
            return res.status(400).json({ error: "Invalid timeField value" });
        }
        console.log(status,timeField);
        // Update the goal's status and time field
        const sql = `UPDATE goals SET status = ?, ${timeColumn} = NOW() WHERE id = ?`;
        const [result] = await connection.execute(sql, [status, goalId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Goal not found" });
        }

        res.status(200).json({ message: "Goal updated successfully" });

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/reviews', async (req, res) => {
    try {
        const { username, reviewer_username, comments, rating } = req.body;

        console.log(username, reviewer_username, comments, rating);

        // Step 1: Find the employee_id using username
        const findEmployeeSQL = `SELECT id FROM users WHERE username = ?`;
        const [employeeResult] = await connection.execute(findEmployeeSQL, [username]);
        console.log(employeeResult);
        if (employeeResult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given username" });
        }
        const employee_id = employeeResult[0].id;

        // Step 2: Find the reviewer_id using reviewer_username
        const [reviewerResult] = await connection.execute(findEmployeeSQL, [reviewer_username]);
        console.log(reviewerResult)
        if (reviewerResult.length === 0) {
            return res.status(404).json({ error: "Reviewer not found for the given username" });
        }
        const reviewer_id = reviewerResult[0].id;

        console.log(employee_id, reviewer_id, comments, rating);

        // Step 3: Insert into performance_reviews
        const insertReviewSQL = `INSERT INTO performance_reviews (employee_id, reviewer_id, comments, overall_rating, review_date) VALUES (?, ?, ?, ?, NOW())`;
        const [result] = await connection.execute(insertReviewSQL, [employee_id, reviewer_id, comments, rating]);

        res.status(201).json({ id: result.insertId, message: "Review added successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/reviews', async (req, res) => {
    try {
        // Fetch all reviews with employee and reviewer names
        const sql = `
            SELECT pr.id, u1.username AS employee, u2.username AS reviewer, pr.comments, pr.overall_rating, pr.review_date
            FROM performance_reviews pr
            JOIN users u1 ON pr.employee_id = u1.id
            JOIN users u2 ON pr.reviewer_id = u2.id
        `;
        const [reviews] = await connection.execute(sql);

        const sql2 = `SELECT username FROM users WHERE role = ?`;
        const [employees] = await connection.execute(sql2, ["USER"]);
        res.status(200).json({
            message: 'Performance reviews retrieved successfully',
            reviews,employees
        });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/user/kpi/:userId', async (req, res) => {
    try {
        const username = req.params.userId;
        const connection = await mysql.createConnection(dbConfig);
        const findEmployeeSQL = `SELECT id FROM users WHERE username = ?`;
        const [employeeResult] = await connection.execute(findEmployeeSQL, [username]);
        console.log(employeeResult);
        if (employeeResult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given username" });
        }
        const userId = employeeResult[0].id;

        const sql = `SELECT * FROM performance_metrics WHERE employee_id = ?`;
        const [result] = await connection.execute(sql, [userId]);
        console.log(userId,result);
        await connection.end();

        if (result.length === 0) {
            return res.status(404).json({ message: "No KPI data found for this user." });
        }

        res.status(200).json({ kpi: result[0] });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});
// Get employee KPIs
app.get('/kpis/:employee_id', async (req, res) => {
    try {
        const { employee_id } = req.params;
        const sql = `SELECT * FROM kpis WHERE employee_id = ?`;
        const [rows] = await connection.execute(sql, [employee_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/hr/kpi', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const sql = `
            SELECT pm.*, u.username
            FROM performance_metrics pm
            JOIN users u ON pm.employee_id = u.id
        `;
        const [kpis] = await connection.execute(sql);

        await connection.end();

        res.status(200).json({ kpis });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});




app.get("/feedback/:userId", async (req, res) => {
    try {
        const username = req.params.userId;
        const findEmployeeSQL = `SELECT id FROM users WHERE username = ?`;
        const [employeeResult] = await connection.execute(findEmployeeSQL, [username]);
        console.log(employeeResult);
        if (employeeResult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given username" });
        }
        const userId = employeeResult[0].id;
        const sql = `
            SELECT f.id, f.employee_id, f.provider_id, f.feedback_text, f.feedback_type, f.feedback_date,
                   u1.username AS employee_name, u2.username AS provider_name
            FROM feedback f
            JOIN users u1 ON f.employee_id = u1.id
            JOIN users u2 ON f.provider_id = u2.id
            WHERE f.employee_id = ? OR f.provider_id = ?`;
        const [feedbacks] = await connection.execute(sql, [userId, userId]);
        res.status(200).json({ feedbacks });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Submit new feedback
app.post("/feedback", async (req, res) => {
    try {
        const { username, prid, feedback_text, feedback_type } = req.body;
        if (!username || !prid || !feedback_text || !feedback_type) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (username === prid) {
            return res.status(400).json({ error: "You cannot give feedback to yourself" });
        }

        const employee_id=username;

        const findp = `SELECT id, role FROM users WHERE username = ?`;
        const [presult] = await connection.execute(findp, [prid]);
        console.log(presult)

        if (presult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given username 2" });
        }
        
        const provider_id = presult[0].id;
        
        
        console.log(employee_id, provider_id, feedback_text, feedback_type);

        const sql = `INSERT INTO feedback (employee_id, provider_id, feedback_text, feedback_type) VALUES (?, ?, ?, ?)`;
        const [result] = await connection.execute(sql, [employee_id, provider_id, feedback_text, feedback_type]);
        console.log(username, provider_id, feedback_text, feedback_type);
        res.status(201).json({ message: "Feedback submitted successfully", id: result.insertId });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get users excluding current user for feedback selection
app.get("/users/exclude/:userId", async (req, res) => {
    try {
        const username = req.params.userId;
        
        // Get user ID and role from the username
        const findEmployeeSQL = `SELECT id, role FROM users WHERE username = ?`;
        const [employeeResult] = await connection.execute(findEmployeeSQL, [username]);

        if (employeeResult.length === 0) {
            return res.status(404).json({ error: "Employee not found for the given username" });
        }

        const userId = employeeResult[0].id;
        const userRole = employeeResult[0].role;

        let sql = `SELECT id, username FROM users WHERE role = 'USER'`;
        let params = [];

        if (userRole === "USER") {
            // Exclude themselves if they are also a USER
            sql += ` AND id != ?`;
            params.push(userId);
        }

        const [users] = await connection.execute(sql, params);

        res.status(200).json({ users });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: error.message });
    }
});



const PORT = process.env.PORT || 3000;

module.exports = app;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



