# How to Deploy LectureSnap to Railway 🚂

Follow these simple steps to host your backend for free/cheap on Railway.

## 1. Prerequisites
- A [GitHub Account](https://github.com/)
- A [Railway Account](https://railway.app/) (Login with GitHub)
- Your project pushed to GitHub (I have already done this for you!)

## 2. Create the Project
1. Go to your **Railway Dashboard**.
2. Click **+ New Project** -> **Deploy from GitHub repo**.
3. Select your repository (`priyankarpadhy-eng/ytnote`).
4. Click **Deploy Now**.

## 3. Configure the "Server" Service
Railway might get confused because you have a frontend and backend in one repo. We need to tell it to focus on the `server/` folder.

1. Click on the card for your project (it might be building and failing, that's okay).
2. Go to **Settings** (for the service).
3. Scroll down to **Root Directory**.
4. Change it from `/` to `/server`.
5. Click **Save** (this will trigger a new deployment).

## 4. Environment Variables
Your server needs your Cloudflare R2 credentials to work.

1. Go to the **Variables** tab in Railway.
2. Click **New Variable** and add the following (copy active values from your local `.env` file):

| Variable Name | Value |
| :--- | :--- |
| `VITE_R2_ACCOUNT_ID` | *your_account_id* |
| `VITE_R2_ACCESS_KEY_ID` | *your_access_key* |
| `VITE_R2_SECRET_ACCESS_KEY` | *your_secret_key* |
| `VITE_R2_BUCKET_NAME` | *your_bucket_name* |
| `VITE_R2_PUBLIC_URL` | *your_public_url* |
| `PORT` | `3000` (Optional, Railway adds this automatically) |

## 5. Get the Live URL
1. Once deployments are green (Success), go to the **Settings** tab again.
2. Under "Networking", click **Generate Domain**.
3. It will give you a URL like: `https://ytnote-production.up.railway.app`.

## 6. Connect Frontend
Now tell your frontend where the server is.

1. If you are running the frontend locally, open your `.env` file.
2. Add/Update: 
   ```bash
   VITE_BACKEND_URL=https://ytnote-production.up.railway.app
   ```
3. Restart your frontend (`npm run dev`).

Done! Your scanner is now running in the cloud. ☁️🚀
