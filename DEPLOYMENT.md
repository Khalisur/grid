# Deployment Guide

This application combines a React frontend with a JSON Server backend. This guide explains how to deploy it to various platforms.

## Option 1: Deploy to Render.com (Recommended)

1. Sign up for an account at [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Environment Variables:
     - `PORT`: Set by Render automatically
5. Click "Create Web Service"

This will deploy both your React frontend and JSON Server API in one service.

## Option 2: Deploy to Heroku

1. Install the Heroku CLI and login
2. In your project directory, run:
   ```
   heroku create your-app-name
   git push heroku main
   ```
3. Heroku will automatically use the "start:prod" script in package.json

## Local Development

For local development, you can run:

```
npm run dev                  # Just the React frontend
npm run server               # Just the JSON server
npm start                    # Both frontend and JSON server
```

## Database Notes

This application uses JSON Server with a `db.json` file for data storage. In production:

1. The data will be reset whenever the server restarts
2. There is no data persistence between deployments

For a more permanent solution, consider:
- Using a real database like MongoDB or PostgreSQL
- Implementing regular backups of the db.json file
- Using a service like Firebase Firestore instead 