# TravelDesk (NaviDesk)

A comprehensive travel management platform built with the MERN stack.

## 🚀 Features

- **Multi-role Authentication**: Admin, Manager, Sales, Operations, and User roles
- **Lead Management**: Track and manage travel leads
- **Quote Generation**: Create and manage travel quotes
- **Invoice System**: Generate and manage invoices
- **Supplier Management**: Manage hotels, transfers, and sightseeing
- **PDF Generation**: Generate professional PDFs for quotes and invoices
- **Dashboard**: Role-based dashboards for different user types

## 🛠️ Tech Stack

- **Frontend**: React, React Bootstrap, React Router
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **File Storage**: Cloudinary
- **PDF Generation**: Puppeteer

## 📦 Installation

### Backend Setup

1. Clone the repository
2. Navigate to backend directory
3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
4. Create `.env` file from `.env.example`
5. Update environment variables with your actual values
6. Start the server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Navigate to frontend directory
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Create `.env` file from `.env.example`
4. Start the development server:
   ```bash
   npm start
   ```

## 🌐 Deployment

### Backend (Render)

1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Your JWT secret key
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret
3. Deploy using the `render.yaml` configuration

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variable:
   - `REACT_APP_API_URL`: Your deployed backend URL
3. Deploy using the `vercel.json` configuration

## 📝 Environment Variables

### Backend (.env)
```
MONGODB_URI=
JWT_SECRET=your-super-secret-jwt-key-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
PORT=5000
NODE_ENV=production
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_API_URL_PROD=https://your-backend-url.onrender.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.
