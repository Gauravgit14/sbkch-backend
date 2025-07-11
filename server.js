// 🧠 OpenAI setup
const OpenAI = require("openai");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Logging middleware to verify incoming requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ✅ Handle CORS + Preflight requests properly
app.use(cors({
  origin: "*", // or restrict to your frontend like "https://sbkch.com"
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.options("/chat", (req, res) => res.sendStatus(200)); // preflight support
app.options("/send", (req, res) => res.sendStatus(200)); // preflight support

app.use(bodyParser.json());

// ✅ PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ Email transporter (SendGrid)
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 465,
  secure: true,
  auth: {
    user: "apikey", // literal value
    pass: process.env.SENDGRID_API_KEY
  },
});

// ✅ Complaint submission endpoint
app.post("/send", async (req, res) => {
  const { name, email, phone, issue } = req.body;
  const complaintId = uuidv4().split("-")[0].toUpperCase();

  const adminMailOptions = {
    from: "gaurav@sbkch.com",
    to: "gaurav@sbkch.com",
    subject: `📩 New Complaint Received #${complaintId}`,
    text: `📬 New Complaint Received:

Complaint ID: ${complaintId}
Name: ${name}
Email: ${email}
Phone: ${phone}
Issue: ${issue}`
  };

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
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(clientMailOptions);

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
    res.status(500).json({ error: "Failed to send emails or save to database" });
  }
});

// ✅ AI chat endpoint
app.post("/chat", async (req, res) => {
  const { question } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Make sure this model is accessible under your key
      messages: [
        {
          role: "user",
          content: `You are an AI assistant helping users with website analytics questions. Reply clearly and briefly. Question: ${question}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;

    const chartData = [
      { time: "2:00 PM", traffic: 120 },
      { time: "2:30 PM", traffic: 180 },
      { time: "3:00 PM", traffic: 150 },
    ];

    res.json({ answer, chartData });
  } catch (error) {
    console.error("❌ ChatGPT Error:", error.response?.data || error.message);

    let fallbackMessage = "Oops! Something went wrong. Please try again later.";

    if (error.response?.status === 401) {
      fallbackMessage = "🔒 Invalid or missing API key. Contact admin.";
    } else if (error.response?.status === 429) {
      fallbackMessage = "⚠️ Too many requests. Please wait and try again.";
    } else if (
      error.response?.status === 400 &&
      error.response?.data?.error?.message.includes("maximum context length")
    ) {
      fallbackMessage = "⚠️ Your question is too long. Try shortening it.";
    }

    res.status(500).json({ answer: fallbackMessage });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
