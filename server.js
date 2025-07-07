const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Using SendGrid as SMTP with Nodemailer
// BLOCKER FIX: You had GoDaddy SMTP (which times out on Render free tier)
// SendGrid is more reliable
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 465,
  secure: true,
  auth: {
    user: "apikey", // This is literally "apikey"
    pass: process.env.SENDGRID_API_KEY // 🔒 Set in Render Dashboard
  },
});

app.post("/send", async (req, res) => {
  const { name, email, phone, issue } = req.body;
  const complaintId = uuidv4().split("-")[0].toUpperCase();

  // ✅ Email to YOU
  const adminMailOptions = {
    from: "gaurav@sbkch.com",
    to: "gaurav@sbkch.com", // You receive it
    subject: `📩 New Complaint Received #${complaintId}`,
    text: `📬 New Complaint Received:

Complaint ID: ${complaintId}
Name: ${name}
Email: ${email}
Phone: ${phone}
Issue: ${issue}`
  };

  // ✅ Email to the CLIENT (user)
  const clientMailOptions = {
    from: "gaurav@sbkch.com",
    to: email,
    subject: `✅ Complaint Submitted | ID: ${complaintId}`,
    text: `Hi ${name},

Thank you for submitting your issue. 🙏

📄 Complaint ID: ${complaintId}
📌 Issue: ${issue}

Our team will contact you within 24–48 hours.

Regards,  
Team sbkch.com`
  };

  try {
    // ✅ Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(clientMailOptions);

    // ✅ Save to DB
    await pool.query(
      `INSERT INTO chatbot_messages (name, email, phone, issue, complaint_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, phone, issue, complaintId]
    );

    res.status(200).json({
      message: "✅ Emails sent & complaint saved",
      complaintId
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({
      error: "Failed to send emails or save to database"
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
