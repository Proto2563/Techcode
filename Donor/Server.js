const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');  // ✅ only once
const mysql = require('mysql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// DB connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Charity'  // Change to match your DB
});

db.connect((err) => {
  if (err) {
    console.error("DB error:", err);
  } else {
    console.log("✅ Connected to MySQL database.");
  }
});

// Donor Login API
app.post('/DonorLogin', (req, res) => {
  const { email, pass } = req.body;

  const query = 'SELECT * FROM donorLogin WHERE `Email` = ? AND `Password` = ?';
  db.query(query, [email, pass], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (results.length > 0) {
      const DID = results[0].DID;
      return res.json({ success: true, DID: DID });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

// Admin Login API
app.post('/AdminLogin', (req, res) => {
  const { UserName, pass } = req.body;

  const query = 'SELECT * FROM adminLogin WHERE `UserName` = ? AND `Password` = ?';
  db.query(query, [UserName, pass], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (results.length > 0) {
      const AID = results[0].AID;
      return res.json({ success: true, AID: AID });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

// Ngo Login API
app.post('/NgoLogin', (req, res) => {
  const { email, pass } = req.body;

  const query = 'SELECT NID FROM ngoLogin WHERE `NName` = ? AND `NPass` = ?';
  db.query(query, [email, pass], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (results.length > 0) {
      const NID = results[0].NID;
      return res.json({ success: true, NID: NID });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  });
});


//to upload photo
// Ensure Photo/ directory exists
const uploadDir = path.join(__dirname, '..', 'Photo');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'Photo'));
  },
  filename: function (req, file, cb) {
    const customName = req.query.fileName;
    const ext = path.extname(file.originalname);  // Add this to fix "ext is not defined"

    if (customName) {
      cb(null, customName);
    } else {
      console.log("❌ No custom name received, fallback used");
      const fallback = `fallback_${Date.now()}${ext}`;
      cb(null, fallback);
    }
  } // <-- this closing brace was missing
});


const upload = multer({ storage });

// ✅ Route to handle photo upload
app.post('/uploadPhoto', upload.single('Photograph'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  res.json({
    success: true,
    fileName: req.file.filename,
    filePath: `/Photo/${req.file.filename}`
  });
});

// Static file serving (optional for access via URL)
app.use('/Photo', express.static(path.join(__dirname, '..', 'Photo')));
// ✅ Your other routes go here
// app.post('/MakeDonation', ...)

// Make Donation API
app.post('/MakeDonation', (req, res) => {
  const { IName, ICategory, IDropLoc, DID, IPhoto } = req.body;

  const IStatus = "Pending";

  const query = 'INSERT INTO Item (`IName`, `ICategory`, `IDropLoc`, `DID`,`IPhoto`, `IStatus`, `DelCode`, `DelStatus`, `NID`, `NgoDelCode`, `NgoDelStatus`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
;
  db.query(query, [IName, ICategory, IDropLoc, DID,  IPhoto, IStatus, "", "", "", "", ""], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (results.affectedRows > 0) {
      return res.json({ success: true, DID });
    } else {
      return res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

//Donor views status of his donations
app.get('/DonorDonationsStatus', (req, res) => {
  const DID = req.query.DID;

  const query = 'SELECT IName, ICategory, IDropLoc, IPhoto, IStatus FROM Item WHERE DID = ?';

  db.query(query, [DID], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "DB error" });
    }

    res.json({ success: true, donations: results });
  });
});

//Admin views status of all donations
app.get('/AdminDonationsStatus', (req, res) => {

  const query = 'SELECT `IID`, `DID`, `IName`, `ICategory`, `IDropLoc`, `IPhoto`, `IStatus` FROM Item';

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "DB error" });
    }

    res.json({ success: true, donations: results });
  });
});

// Approve donation by IID
app.post('/AdminApproveDonation', (req, res) => {
  const IID = req.query.IID;

  if (!IID) {
    return res.status(400).json({ success: false, message: "Missing IID" });
  }

  const delCode = Math.floor(100000 + Math.random() * 900000); // Generates a random number between 100000–999999
  //console.log(delCode);


  const query = 'UPDATE Item SET IStatus = ?, `DelCode`=?, `DelStatus`=? WHERE IID = ?';

  db.query(query, ["Approved", delCode, "Not Delivered", IID], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows > 0) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "No such item or already approved" });
    }
  });
});

// Reject donation by IID
app.post('/AdminRejectDonation', (req, res) => {
  const IID = req.query.IID;

  if (!IID) {
    return res.status(400).json({ success: false, message: "Missing IID" });
  }

  const query = 'UPDATE Item SET IStatus = "Rejected" WHERE IID = ?';

  db.query(query, [IID], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows > 0) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "No such item or already rejected" });
    }
  });
});

//Donor view Deliery Status
app.get('/DonorViewDeliveryStatus', (req, res) => {

  const DID = req.query.DID;
  const query = 'SELECT `IID`, `DID`, `IName`, `ICategory`, `IDropLoc`, `IPhoto`, `DelStatus` FROM Item WHERE `IStatus` = "Approved" AND `DID` = ?';

  db.query(query, [DID], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "DB error" });
    }

    res.json({ success: true, donations: results });
  });
});

//Check if DelCode is correct
app.post('/DonorConfirmDelivery', (req, res) => {
  const { IID, code } = req.query;

  if (!IID || !code) {
    return res.status(400).json({ success: false, message: "Missing IID or code" });
  }

  const checkQuery = 'SELECT DelCode FROM Item WHERE IID = ?';

  db.query(checkQuery, [IID], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const dbCode = results[0].DelCode;

    if (dbCode.toString() !== code.toString()) {
      return res.json({ success: false, message: "Invalid code" });
    }

    // Code matched, update delivery status
    const updateQuery = 'UPDATE Item SET DelStatus = "Delivered" WHERE IID = ?';

    db.query(updateQuery, [IID], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Update error:", updateErr);
        return res.status(500).json({ success: false, message: "Update failed" });
      }

      return res.json({ success: true });
    });
  });
});

//Admin view Deliery Status
app.get('/AdminViewDeliveryStatus', (req, res) => {

  const query = 'SELECT `IID`, `DID`, `IName`, `ICategory`, `IDropLoc`, `IPhoto`, `DelStatus`, `DelCode`, `NgoDelStatus`, `NgoDelCode` FROM Item WHERE `IStatus` = "Approved"';

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "DB error" });
    }

    res.json({ success: true, donations: results });
  });
});

//Ngo views all approved donations
app.get('/NgoChooseDonation', (req, res) => {

  const query = 'SELECT `IID`, `IName`, `ICategory`, `IDropLoc`, `IPhoto`, `NID` FROM `Item` WHERE `IStatus` = "Approved" AND `NID`=""';

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "DB error" });
    }

    res.json({ success: true, donations: results });
  });
});

// Ngo confirm donation
app.post('/NgoConfirmDonation', (req, res) => {
  const { IID, NID } = req.body;  // <-- read from body, not query

  // Validate both
  if (!IID || !NID) {
    return res.status(400).json({ success: false, message: "Missing IID or NID" });
  }

  const delCode = Math.floor(100000 + Math.random() * 900000); // Generates a random number between 100000–999999
  //console.log(delCode);


  const query = 'UPDATE Item SET NID = ?, NgoDelStatus = "Not Delivered", NgoDelCode = ? WHERE IID = ? AND IStatus = "Approved" AND NID=""';

  db.query(query, [NID, delCode, IID], (err, result) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows > 0) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: "No such item or already approved" });
    }
  });
});

//Ngo view Deliery Status
app.get('/NgoViewDeliveryStatus', (req, res) => {

  const NID = req.query.NID;
  const query = 'SELECT `IID`, `IName`, `ICategory`, `IDropLoc`, `IPhoto`, `NgoDelStatus` FROM Item WHERE `IStatus` = "Approved" AND `NID` = ?';

  db.query(query, [NID], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: "DB error" });
    }

    res.json({ success: true, donations: results });
  });
});


//Check if NgoDelCode is correct
app.post('/NgoConfirmDelivered', (req, res) => {
  const { IID, code, NID } = req.query;

  if (!IID || !code || !NID) {
    return res.status(400).json({ success: false, message: "Missing IID or code" });
  }

  const checkQuery = 'SELECT NgoDelCode FROM Item WHERE IID = ?';

  db.query(checkQuery, [IID], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    const dbCode = results[0].NgoDelCode;

    if (dbCode.toString() !== code.toString()) {
      return res.json({ success: false, message: "Invalid code" });
    }

    // Code matched, update delivery status
    const updateQuery = 'UPDATE Item SET NgoDelStatus = "Delivered" WHERE IID = ?';

    db.query(updateQuery, [IID], (updateErr, updateResult) => {
      if (updateErr) {
        console.error("Update error:", updateErr);
        return res.status(500).json({ success: false, message: "Update failed" });
      }

      return res.json({ success: true });
    });
  });
});

// Test route
app.get('/', (req, res) => {
  res.json({ status: "Backend is working!" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
