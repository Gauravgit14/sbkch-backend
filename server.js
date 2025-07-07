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

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Replace GoDaddy SMTP with SendGrid
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey", // required literal 'apikey'
    pass: process.env.SENDGRID_API_KEY // your real API key from .env
  },
});

// POST route to handle complaint and save to DB
app.post("/send", async (req, res) => {
  const { name, email, phone, issue } = req.body;
  const complaintId = uuidv4().split("-")[0].toUpperCase();

  // Email to support team
  const supportMailOptions = {
    from: "gaurav@sbkch.com",
    to: "gaurav@sbkch.com",
    subject: `New Complaint #${complaintId}`,
    text: `Complaint ID: ${complaintId}
Name: ${name}
Email: ${email}
Phone: ${phone}
Issue: ${issue}`,
  };

  // Email to customer
  const customerMailOptions = {
    from: "gaurav@sbkch.com",
    to: email,
    subject: `Your Complaint #${complaintId} Received`,
    text: `Hi ${name},\n\nYour complaint has been received.\n\nComplaint ID: ${complaintId}\n\nOur team will reach out to you within 24–48 hours.\n\nThank you!\nTeam sbkch.com`,
  };

  try {
    // Send both emails
    await transporter.sendMail(supportMailOptions);
    await transporter.sendMail(customerMailOptions);

    // Save complaint to PostgreSQL
    await pool.query(
      `INSERT INTO chatbot_messages (name, email, phone, issue, complaint_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [name, email, phone, issue, complaintId]
    );

    res.status(200).json({ message: "Emails sent & data saved", complaintId });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Failed to send emails or save to database" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
