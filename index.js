const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ SBKCH Backend is Running!");
});

app.post("/send", async (req, res) => {
  const { name, email, phone, issue } = req.body;
  const complaintId = uuidv4().split("-")[0].toUpperCase();

  const message = `
    <h2>New Support Request</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Issue:</strong> ${issue}</p>
    <p><strong>Complaint ID:</strong> ${complaintId}</p>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Email to support team
    await transporter.sendMail({
      from: `"SBKCH Bot" <${process.env.SMTP_USER}>`,
      to: "support@sbkch.com",
      subject: `New Complaint - ${complaintId}`,
      html: message
    });

    // Email to customer
    await transporter.sendMail({
      from: `"SBKCH Team" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your Complaint (${complaintId}) Received`,
      html: `
        <p>Hi ${name},</p>
        <p>We’ve received your issue. Our team will contact you within 24–48 hours via email or phone.</p>
        <p><strong>Complaint ID:</strong> ${complaintId}</p>
        <p>Thanks,<br>Team SBKCH.COM</p>
      `
    });

    res.status(200).json({ success: true, complaintId });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
