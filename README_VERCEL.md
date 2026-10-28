# Deploying to Vercel

This guide will help you deploy the H&F Autohaus website to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your Resend API key and email configuration

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Confirm project settings
   - Deploy

5. **Set Environment Variables**:
   After deployment, go to your Vercel project dashboard:
   - Navigate to Settings → Environment Variables
   - Add the following variables:
     - `RESEND_API_KEY` - Your Resend API key
     - `RESEND_FROM_EMAIL` - Your sender email (e.g., `onboarding@resend.dev`)
     - `RESEND_TO_EMAIL` - Your business email (e.g., `hfautohaus@gmail.com`)

6. **Redeploy** after adding environment variables:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import project in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Project**:
   - Framework Preset: Other
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

4. **Add Environment Variables**:
   - In the project settings, go to Environment Variables
   - Add:
     - `RESEND_API_KEY`
     - `RESEND_FROM_EMAIL`
     - `RESEND_TO_EMAIL`

5. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

## Environment Variables

Make sure to set these in your Vercel project settings:

- `RESEND_API_KEY` - Your Resend API key
- `RESEND_FROM_EMAIL` - Email address to send from
- `RESEND_TO_EMAIL` - Email address to receive contact form submissions

## Post-Deployment

1. **Test the contact form** to ensure emails are working
2. **Check the website** at your Vercel URL
3. **Set up a custom domain** (optional) in Vercel project settings

## Troubleshooting

- If the contact form doesn't work, verify environment variables are set correctly
- Check Vercel function logs in the dashboard for errors
- Ensure your Resend API key is valid and has proper permissions

## Notes

- The website will automatically deploy on every push to your main branch (if using GitHub integration)
- Vercel provides free SSL certificates
- The serverless functions have a 10-second timeout limit for free tier

