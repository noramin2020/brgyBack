const fs = require("fs");
const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");

const multer = require("multer");

// Use memory storage to store images in buffer before inserting into DB


const app = express();
const PORT = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());
app.use(express.static('public')); 

const db = mysql.createConnection({
  host: "bv0eriprexjmkp6i5rgc-mysql.services.clever-cloud.com",
  port: 3306,
  user: "uxmygvad7ejy3zwd",
  password: "LazRYKwQGsu2DjzvAoU5",
  database: "bv0eriprexjmkp6i5rgc"
});

app.use(express.json()); // Parse JSON requests

app.get("/", (req, res) => {
  res.send("sdibababababe");
});


const dir = 'public/images';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
app.post('/upload', upload.single('image'), (req, res) => {
  const { account_id, isUpdate } = req.body;
  const filename = req.file.filename;

  if (isUpdate === 'true') {
    // 1. Get old image
    const selectQuery = 'SELECT filename FROM images WHERE account_id = ? LIMIT 1';
    db.query(selectQuery, [account_id], (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error' });

      if (result.length > 0) {
        const oldFilename = result[0].filename;

        // 2. Delete file from uploads folder
        const fs = require('fs');
        fs.unlink(`uploads/${oldFilename}`, (fsErr) => {
          if (fsErr) console.error("Failed to delete old image:", fsErr);
        });

        // 3. Delete old DB record
        db.query('DELETE FROM images WHERE account_id = ?', [account_id]);
      }

      // 4. Insert new image
      insertNewImage();
    });
  } else {
    insertNewImage();
  }

  function insertNewImage() {
    const query = 'INSERT INTO images (filename, account_id) VALUES (?, ?)';
    db.query(query, [filename, account_id], (err, result) => {
      if (err) return res.status(500).json({ message: 'Upload failed.' });
      res.json({ message: 'Image uploaded successfully.' });
    });
  }
});


app.get('/images/:accountId', (req, res) => {
  const accountId = req.params.accountId;

  const sql = "SELECT * FROM images WHERE account_id = ?";
  db.query(sql, [accountId], (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Failed to retrieve images" });
    }

    res.json(results);
  });
});

app.post("/login", (req, res) => {
  console.log("Login request received:", req.body);
  const { IDNumber, UserType, Password } = req.body;
  const sql = "SELECT * FROM account WHERE IDNumber = ? AND UserType = ? AND Password = ?";
  db.query(sql, [IDNumber, UserType, Password], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }
    if (results.length > 0) {
      res.status(200).json({ message: "Login successful", user: results[0] });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });
});

app.get("/name", (req, res) => {
  const sql = "SELECT * FROM user";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching names" });
    }
    res.status(200).json(results);
  });
});

app.get("/loginview", (req, res) => {
  const sql = "SELECT * FROM account";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching login data" });
    }
    res.status(200).json(results);
  });
});

// POST - Add a new name
app.post("/name/add", (req, res) => {
  const {
    id = "",
    IDNumber = "",
    first_name = "",
    middle_name = "",
    last_name =" ",
    extension = "",
    Position = "",
    ResidentType = "",
    HouseNo = "",
    ZoneNo = ""
  } = req.body;

  // requiring the form to fill
  if (!first_name || !last_name || !IDNumber) {
    return res.status(400).json({ message: "First name, Last name, and IDNumber are required." });
  }

  //Check if the IDNumber is in table database
  const checkSql = "SELECT * FROM account WHERE IDNumber = ?";
  db.query(checkSql, [IDNumber], (err, results) => {
    if (err) {
      console.error("Check IDNumber error:", err);
      return res.status(500).json({ message: "Error checking IDNumber." });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Account with this IDNumber does not exist." });
    }

    // Proceed to insert into username using IDNumber as account_id
    const insertSql = `
      INSERT INTO user (
        id, account_id, first_name, middle_name, last_name, extension, Position, ResidentType, HouseNo, ZoneNo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      id,
      IDNumber,
      first_name,
      middle_name,
      last_name,
      extension,
      Position,
      ResidentType,
      HouseNo,
      ZoneNo
    ];

    db.query(insertSql, values, (err, result) => {
      if (err) {
        console.error("Insert error:", err);
        return res.status(500).json({ message: "Error adding name with account_id." });
      }
      res.status(201).json({ message: "Name added successfully!", id: result.insertId });
    });
  });
});


// POST - Add a new account
app.post("/login/add", (req, res) => {
  const {
    IDNumber = "",
    Password = "",
    UserType = ""
  } = req.body;

  if (!IDNumber || !Password || !UserType) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = "INSERT INTO account (IDNumber, UserType, Password) VALUES (?, ?, ?)";
  const values = [IDNumber, UserType, Password];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Insert error:", err);
      return res.status(500).json({ message: "Error adding name Login." });
    }
    res.status(201).json({ message: "Login created!", id: result.insertId });
  });
});

// For name update
app.put("/name/update/:id", (req, res) => {
  const data = req.body;
  const id = req.params.id;
  const sql = "UPDATE user SET ? WHERE id = ?";
  db.query(sql, [data, id], (err) => {
    if (err) return res.status(500).json({ message: "Update failed" });
    res.json({ message: "Name updated successfully" });
  });
});

// For login update
app.put("/login/update/:id", (req, res) => {
  const { IDNumber, UserType, Password } = req.body;  // Destructure the necessary fields from the request body
  const id = req.params.id;

  // Prepare data for update
  const updateData = {
    IDNumber,
    UserType,
    Password, // Use hashedPassword if you are hashing the password
  };

  const sql = "UPDATE account SET ? WHERE id = ?";

  db.query(sql, [updateData, id], (err, result) => {
    if (err) {
      console.error("Error updating account:", err); // For debugging
      return res.status(500).json({ message: "Update failed", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ message: "Account updated successfully" });
  });
});

app.get("/userpinfo/:account_id", (req, res) => {
  const account_id = req.params.account_id;
  const sql = "SELECT * FROM p_infos WHERE account_id = ?";
  
  db.query(sql, [account_id], (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching personal info." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No personal info found." });
    }
    res.status(200).json(results[0]); // Assuming you want to return a single record
  });
});

app.post("/userpinfo/add", (req, res) => {
  const {
    id = "",
    account_id = "",
    gender = "",
    c_status = "",
  } = req.body;

  if (!gender || !c_status) {
    return res.status(400).json({ message: "gender and civil status are required" });
  }

  // Check if personal info already exists for this account_id
  const checkSql = "SELECT * FROM p_infos WHERE account_id = ?";
  db.query(checkSql, [account_id], (err, result) => {
    if (err) {
      console.error("Select error:", err);
      return res.status(500).json({ message: "Error checking existing info." });
    }

    if (result.length > 0) {
      // If exists, perform update
      const updateSql = `
        UPDATE p_infos 
        SET gender = ?, c_status = ?
        WHERE account_id = ?`;
      db.query(updateSql, [gender, c_status, account_id], (err, updateResult) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ message: "Error updating personal info." });
        }
        return res.status(200).json({ message: "Personal info updated." });
      });
    } else {
      // If not exists, insert new
      const insertSql = `
        INSERT INTO p_infos (id, account_id, gender, c_status)
        VALUES (?, ?, ?, ?)`;
      const values = [id, account_id, gender, c_status];

      db.query(insertSql, values, (err, insertResult) => {
        if (err) {
          console.error("Insert error:", err);
          return res.status(500).json({ message: "Error adding personal info." });
        }
        return res.status(201).json({ message: "Personal info added.", id: insertResult.insertId });
      });
    }
  });
});

app.get("/i_info/:account_id", (req, res) => {
  const account_id = req.params.account_id;
  const sql = "SELECT * FROM i_infos WHERE account_id = ?";
  
  db.query(sql, [account_id], (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching occupation info." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No occupation info found." });
    }
    res.status(200).json(results); // Return all records for the account_id
  });
});


app.post("/i_info/add", (req, res) => {
  const {
    id = "",
    account_id = "",
    occupation = "",
    fmi = "",
  } = req.body;

  if (!occupation || !fmi) {
    return res.status(400).json({ message: "Occupation and FMI are required" });
  }

  // Check if occupation info already exists for this account_id
  const checkSql = "SELECT * FROM i_infos WHERE account_id = ?";
  db.query(checkSql, [account_id], (err, result) => {
    if (err) {
      console.error("Select error:", err);
      return res.status(500).json({ message: "Error checking existing info." });
    }

    if (result.length > 0) {
      // If exists, perform update
      const updateSql = `
        UPDATE i_infos 
        SET occupation = ?, fmi = ?
        WHERE account_id = ?`;
      db.query(updateSql, [occupation, fmi, account_id], (err, updateResult) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ message: "Error updating occupation info." });
        }
        return res.status(200).json({ message: "Occupation info updated." });
      });
    } else {
      // If not exists, insert new
      const insertSql = `
        INSERT INTO i_infos (id, account_id, occupation, fmi)
        VALUES (?, ?, ?, ?)`;
      const values = [id, account_id, occupation, fmi];

      db.query(insertSql, values, (err, insertResult) => {
        if (err) {
          console.error("Insert error:", err);
          return res.status(500).json({ message: "Error adding occupation info." });
        }
        return res.status(201).json({ message: "Occupation info added.", id: insertResult.insertId });
      });
    }
  });
});

app.get("/usercinfo/:account_id", (req, res) => {
  const account_id = req.params.account_id;
  const sql = "SELECT * FROM c_infos WHERE account_id = ?";
  
  db.query(sql, [account_id], (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching personal info." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No personal info found." });
    }
    res.status(200).json(results[0]); // Assuming you want to return a single record
  });
});

app.post("/usercinfo/add", (req, res) => {
  const {
    id = "",
    account_id = "",
    gmail = "",
    c_no = "",
  } = req.body;

  if (!gmail || !c_no) {
    return res.status(400).json({ message: "gmail and number status are required" });
  }

  // Check if personal info already exists for this account_id
  const checkSql = "SELECT * FROM c_infos WHERE account_id = ?";
  db.query(checkSql, [account_id], (err, result) => {
    if (err) {
      console.error("Select error:", err);
      return res.status(500).json({ message: "Error checking existing info." });
    }

    if (result.length > 0) {
      // If exists, perform update
      const updateSql = `
        UPDATE c_infos 
        SET gmail = ?, c_no = ?
        WHERE account_id = ?`;
      db.query(updateSql, [gmail, c_no, account_id], (err, updateResult) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ message: "Error updating contact info." });
        }
        return res.status(200).json({ message: "contact o updated." });
      });
    } else {
      // If not exists, insert new
      const insertSql = `
        INSERT INTO c_infos (id, account_id, gmail, c_no)
        VALUES (?, ?, ?, ?)`;
      const values = [id, account_id, gmail, c_no];

      db.query(insertSql, values, (err, insertResult) => {
        if (err) {
          console.error("Insert error:", err);
          return res.status(500).json({ message: "Error adding personal info." });
        }
        return res.status(201).json({ message: "Personal info added.", id: insertResult.insertId });
      });
    }
  });
});

app.get("/name/:account_id", (req, res) => {
  const account_id = req.params.account_id;
  const sql = "SELECT * FROM user WHERE account_id = ?";
  
  db.query(sql, [account_id], (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching occupation info." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No occupation info found." });
    }
    res.status(200).json(results); // Return all records for the account_id
  });
});


app.get("/cert/:account_id", (req, res) => {
  const account_id = req.params.account_id;
  const sql = "SELECT id, account_id, first_name, middle_name, last_name, extension, Position, ResidentType, HouseNo, ZoneNo FROM user WHERE account_id = ?";
  
  db.query(sql, [account_id], (err, results) => {
    if (err) {
      console.error("Fetch error:", err);
      return res.status(500).json({ message: "Error fetching user info." });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "No user found." });
    }
    res.status(200).json(results);
  });
});

app.get('/user/:account_id', (req, res) => {
  const accountId = req.params.account_id;
  const query = 'SELECT first_name, last_name, position FROM user WHERE account_id = ?';
  db.query(query, [accountId], (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching data' });
    } else {
      res.json(results);
    }
  });
});



app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});

