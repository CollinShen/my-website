// ================================================================
// server.js — your Express backend
//
// WHAT THIS FILE DOES:
//   1. Serves all your HTML/CSS/JS/image files to visitors
//   2. Handles the contact form (POST /contact) and emails you
//
// HOW TO RUN LOCALLY:
//   1. Make sure you've created a ".env" file (copy .env.example)
//   2. Run:  npm install
//   3. Run:  npm run dev     ← auto-restarts when you save changes
//   4. Open: http://localhost:3000
//
// HOW TO RUN IN PRODUCTION:
//   Run:  npm start
// ================================================================

// ----------------------------------------------------------------
// IMPORTS
// "require" is Node's way of loading libraries (like import in Python)
// ----------------------------------------------------------------
const express    = require('express');   // web server framework
const nodemailer = require('nodemailer'); // sends emails
const path       = require('path');      // handles file paths safely
require('dotenv').config();              // loads your .env file into process.env

// ----------------------------------------------------------------
// APP SETUP
// ----------------------------------------------------------------
const app  = express();
const PORT = process.env.PORT || 3000;   // use .env PORT, or 3000 as fallback

// Tell Express to parse JSON bodies (needed to read contact form data)
app.use(express.json());

// Tell Express to parse URL-encoded form bodies (traditional HTML forms)
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------------
// SERVE STATIC FILES
//
// This one line makes Express serve everything in the "public/" folder.
// When someone visits your site:
//   /           → serves public/index.html
//   /style.css  → serves public/style.css
//   /script.js  → serves public/script.js
//   /images/x.jpg → serves public/images/x.jpg
//
// TO ADD MORE PAGES:
//   Just create public/about.html, public/work.html, etc.
//   They'll be accessible at /about.html, /work.html automatically.
// ----------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));


// ================================================================
// ROUTES
//
// A "route" is a URL path that triggers a specific function.
// Format: app.METHOD('/path', (req, res) => { ... })
//   req = the incoming request (has headers, body, params, etc.)
//   res = what you send back to the browser
//
// COMMON METHODS:
//   app.get()    → browser is loading a page or fetching data
//   app.post()   → browser is submitting a form or sending data
// ================================================================


// ----------------------------------------------------------------
// ROUTE: GET /
// Serves the homepage.
//
// You don't actually need this because express.static above handles it,
// but it's here so you can see how explicit page routing works.
//
// TO ADD MORE PAGES:
//   app.get('/about', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'about.html'));
//   });
// ----------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// ----------------------------------------------------------------
// ROUTE: POST /contact
// This is called when someone submits the contact form.
//
// Flow:
//   1. Frontend sends a POST request to /contact with { name, email, message }
//   2. This function validates the data
//   3. Sends you an email via Nodemailer
//   4. Responds with success or error JSON
//
// TO CHANGE WHERE EMAILS ARE SENT: edit EMAIL_TO in your .env file
// TO CHANGE THE EMAIL SUBJECT/BODY: edit the "mailOptions" object below
// ----------------------------------------------------------------
app.post('/contact', async (req, res) => {
  // Pull the form fields out of the request body
  const { name, email, message } = req.body;

  // Basic server-side validation
  // (the frontend also validates, but never trust only the frontend)
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // ----------------------------------------------------------------
  // EMAIL SETUP (Nodemailer)
  //
  // "transporter" is the email-sending client.
  // It reads your credentials from .env
  //
  // TO USE A DIFFERENT EMAIL PROVIDER:
  //   Gmail:     service: 'gmail'  (as below)
  //   Outlook:   service: 'hotmail'
  //   Yahoo:     service: 'yahoo'
  //   Custom:    replace service with:
  //              host: 'smtp.yourprovider.com', port: 587, secure: false
  // ----------------------------------------------------------------
  const transporter = nodemailer.createTransport({
    service: 'gmail',                       // ← change if not using Gmail
    auth: {
      user: process.env.EMAIL_USER,         // from your .env file
      pass: process.env.EMAIL_PASS,         // from your .env file (App Password)
    },
  });

  // ----------------------------------------------------------------
  // EMAIL CONTENT
  // Change the subject, text, or html fields to customize what you receive
  // ----------------------------------------------------------------
  const mailOptions = {
    from:    `"${name}" <${process.env.EMAIL_USER}>`,  // sender display name
    to:      process.env.EMAIL_TO,                      // your inbox
    replyTo: email,                                     // reply goes to the visitor
    subject: `New message from ${name} — Portfolio Contact Form`,

    // Plain text version (for email clients that don't render HTML)
    text: `
Name:    ${name}
Email:   ${email}
Message: ${message}
    `,

    // HTML version (nicer formatting in most email clients)
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2 style="color: #c9a86c;">New Portfolio Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <hr />
        <p><strong>Message:</strong></p>
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
    `,
  };

  // ----------------------------------------------------------------
  // SEND THE EMAIL
  // "try/catch" means: try to send, and if anything goes wrong,
  // catch the error so the server doesn't crash.
  // ----------------------------------------------------------------
  try {
    await transporter.sendMail(mailOptions);
    console.log(`📬 Contact form submission from ${name} <${email}>`);

    // Tell the frontend everything worked
    res.status(200).json({ success: true, message: 'Message sent!' });

  } catch (error) {
    // Log the full error on the server for debugging
    console.error('Email send error:', error);

    // Tell the frontend something went wrong (don't expose error details to visitors)
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});


// ----------------------------------------------------------------
// 404 HANDLER
// If someone visits a URL that doesn't exist, send a simple message.
//
// TO MAKE A CUSTOM 404 PAGE:
//   Create public/404.html and replace the res.send() below with:
//   res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
// ----------------------------------------------------------------
app.use((req, res) => {
  res.status(404).send('Page not found.');
});


// ----------------------------------------------------------------
// START THE SERVER
// This is the last thing in the file — starts listening for visitors.
// ----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`   Press Ctrl+C to stop`);
});
