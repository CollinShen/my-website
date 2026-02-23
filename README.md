# My Portfolio Website

A personal portfolio website with a Node.js/Express backend.

---

## Project Structure

```
my-website/
├── server.js             ← Express backend (handles contact form emails)
├── package.json          ← project config and dependencies list
├── .env                  ← YOUR SECRET CONFIG (you create this, never commit it)
├── .env.example          ← template showing what goes in .env
├── .gitignore            ← tells Git what NOT to upload
└── public/               ← everything in here is served to visitors
    ├── index.html        ← the main page (edit this for content)
    ├── style.css         ← all visual styling (edit this for design)
    ├── script.js         ← frontend JavaScript
    └── images/           ← put your photos here
```

---

## First-Time Setup

### 1. Install Node.js
Download from https://nodejs.org — get the LTS version.

### 2. Install dependencies
Open a terminal in this folder and run:
```bash
npm install
```
This reads package.json and downloads Express, Nodemailer, etc. into node_modules/.

### 3. Create your .env file
Copy the example file:
```bash
cp .env.example .env
```
Then open `.env` and fill in your real email credentials.
See `.env.example` for detailed instructions on getting a Gmail App Password.

### 4. Run the dev server
```bash
npm run dev
```
Open http://localhost:3000 in your browser.
The server auto-restarts when you save changes (powered by nodemon).

---

## Making Changes

### Change your name, bio, links
→ Edit `public/index.html`
→ Search for `← change this` comments throughout the file

### Change colors or fonts
→ Edit the `:root` block at the top of `public/style.css`
→ `--accent` controls the gold color throughout the entire site

### Change the YouTube video
→ In `public/index.html`, find the `<iframe>` in the `#work` section
→ Replace the `src="..."` value with your YouTube embed URL
→ Get this from YouTube → Share → Embed → copy the src value

### Add photos to the gallery
1. Put your image files in `public/images/`
2. In `public/index.html`, find the `#gallery` section
3. Replace each `<div class="gallery-placeholder">` with:
   `<img src="images/yourphoto.jpg" alt="Describe the photo" />`

### Add your profile photo
1. Put your photo in `public/images/`
2. In `public/index.html`, find `<div class="about-photo">`
3. Replace the `.photo-placeholder` div with:
   `<img src="images/your-photo.jpg" alt="Your Name" />`

### Add/remove social links
→ In `public/index.html`, find the `<div class="social-links">` in `#contact`
→ Change the `href` values to your real profile URLs
→ Find icons at https://fontawesome.com/icons

### Add a resume PDF
1. Put your PDF in `public/files/resume.pdf`
2. The download button in the About section will work automatically

---

## Adding More Pages

1. Create `public/about.html` (or any name)
2. It's automatically available at http://localhost:3000/about.html
3. To add a new route explicitly, in `server.js`:
   ```js
   app.get('/about', (req, res) => {
     res.sendFile(path.join(__dirname, 'public', 'about.html'));
   });
   ```

---

## Deploying

### Option A — Render (recommended, free)
1. Push this folder to GitHub
2. Go to render.com, create a new Web Service
3. Connect your GitHub repo
4. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add your .env variables in Render's "Environment" tab
6. Deploy — it gives you a live URL

### Option B — Railway
Similar to Render. Go to railway.app, connect GitHub repo, add env vars.

### Option C — Netlify (frontend only)
If you ever want to remove the backend entirely (use Formspree for contact),
you can drag the `public/` folder to netlify.com/drop and it's live instantly.

---

## Troubleshooting

**"Cannot find module" error when running npm run dev**
→ Run `npm install` first

**Contact form says "Could not reach the server"**
→ Make sure `npm run dev` is running
→ Check your .env file has valid email credentials

**Emails not arriving after filling out the form**
→ Check your .env EMAIL_USER and EMAIL_PASS
→ Make sure you're using a Gmail App Password (not your regular password)
→ Check your spam folder

**Changes to HTML/CSS not showing**
→ Hard refresh the browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
