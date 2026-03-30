# Deployment Instructions

This project is a React application using Vite, Tailwind CSS, and Firebase.

## Netlify Deployment

1.  **Connect to GitHub:** Connect your repository to Netlify.
2.  **Build Settings:**
    *   **Build Command:** `npm run build`
    *   **Publish Directory:** `dist`
3.  **Environment Variables:**
    *   Go to **Site settings > Environment variables**.
    *   Add all keys from `firebase-applet-config.json` as environment variables if you are not using the file directly.
    *   Alternatively, ensure `firebase-applet-config.json` is committed (be careful with secrets).
    *   Add `GEMINI_API_KEY` if used.

## GitHub Pages Deployment

This project includes a GitHub Action for automatic deployment to GitHub Pages.

1.  **Enable GitHub Pages:**
    *   Go to **Settings > Pages**.
    *   Under **Build and deployment > Source**, select **GitHub Actions**.
2.  **Environment Variables:**
    *   Go to **Settings > Secrets and variables > Actions**.
    *   Add any required secrets (like `GEMINI_API_KEY`).
3.  **Vite Configuration:**
    *   If you are deploying to a sub-path (e.g., `https://username.github.io/repo-name/`), update `vite.config.ts` to include `base: '/repo-name/'`.

## Firebase Configuration

Ensure your Firebase project is configured to allow the domain where you deploy (e.g., `*.netlify.app`, `*.github.io`) in the **Firebase Console > Authentication > Settings > Authorized domains**.
