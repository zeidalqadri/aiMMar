# aiMMar - AI-Powered Note-Taking Application

A sophisticated note-taking application built with Next.js, React, and TypeScript, featuring AI integration, session management, version control, and export functionality.

## 🚀 Features

- **AI-Powered Writing**: Integration with OpenRouter API for AI assistance
- **Session Management**: Create, save, and manage multiple writing sessions
- **Version Control**: Track and manage different versions of your notes
- **Export Options**: Export to PDF, Markdown, or copy to clipboard
- **Google Docs Integration**: Seamless integration with Google Docs
- **Real-time Autosave**: Automatic saving with localStorage fallback
- **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Frontend
- **Next.js 15.2.4** with React 18 and TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **jsPDF** for PDF generation
- **html2canvas** for screenshot functionality

### Backend
- **FastAPI** with Python
- **PostgreSQL** database powered by NeonDB
- **SQLAlchemy** with async support
- **CORS** middleware for frontend integration

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.11+
- NeonDB account (free tier available)

### Frontend Setup

1. **Clone the repository**
```bash
git clone https://github.com/zeidalqadri/aimmar.git
cd aimmar
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Optional: Backend URL (if using backend)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional: OpenRouter API (for AI features)
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
```

4. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Backend Setup (Optional)

The application works with localStorage by default. Set up the backend for enhanced features:

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure NeonDB**
```bash
python setup_neondb.py
```

Follow the instructions to:
- Create a NeonDB account at [neon.tech](https://neon.tech)
- Create a new project
- Update the `DATABASE_URL` in `backend/.env`

4. **Start the backend server**
```bash
python -m uvicorn server:app --reload
```

The backend will be available at `http://localhost:8000`

## 🔧 Configuration

### Environment Variables

#### Frontend (`.env.local`)
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL (optional)
- `NEXT_PUBLIC_OPENROUTER_API_KEY` - OpenRouter API key for AI features (optional)

#### Backend (`backend/.env`)
- `DATABASE_URL` - PostgreSQL connection string (required for backend)
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `ALLOWED_ORIGINS` - CORS allowed origins

### API Keys

#### OpenRouter API
1. Visit [OpenRouter](https://openrouter.ai/)
2. Create an account and get an API key
3. Add it to your `.env.local` file

## 📱 Usage

### Basic Features
- **Create Sessions**: Start new writing sessions
- **AI Assistance**: Use AI to help with writing (requires OpenRouter API key)
- **Save & Load**: Sessions are automatically saved
- **Export**: Export your work as PDF, Markdown, or copy to clipboard

### Advanced Features
- **Version Control**: Track changes and revert to previous versions
- **Google Docs**: Import/export to Google Docs
- **Session Management**: Organize multiple writing projects

## 🛠️ Development

### Project Structure
```
aimmar/
├── components/          # React components
├── pages/              # Next.js pages
├── services/           # API and storage services
├── styles/             # CSS and styling
├── backend/            # FastAPI backend
│   ├── server.py       # Main server file
│   ├── requirements.txt # Python dependencies
│   └── setup_neondb.py # Setup script
└── public/             # Static assets
```

### Key Components
- [`components/SessionManager.tsx`](components/SessionManager.tsx) - Main session management
- [`services/storageService.ts`](services/storageService.ts) - Data persistence
- [`services/versioningService.ts`](services/versioningService.ts) - Version control
- [`backend/server.py`](backend/server.py) - Backend API

### Scripts
```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Backend
python -m uvicorn server:app --reload  # Start backend server
python setup_neondb.py                 # Setup NeonDB configuration
```

## 🚀 Deployment

### Frontend Deployment
The frontend can be deployed to any platform that supports Next.js:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Self-hosted

### Backend Deployment
The backend can be deployed to:
- Railway
- Heroku
- AWS EC2
- DigitalOcean
- Self-hosted

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend `ALLOWED_ORIGINS` includes your frontend URL
   - Check that backend is running and accessible

2. **AI Features Not Working**
   - Verify OpenRouter API key is set correctly
   - Check API key has sufficient credits

3. **Sessions Not Saving**
   - Check browser localStorage permissions
   - Verify backend connection if using backend storage

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

### Logs and Debugging
- Frontend: Check browser console for errors
- Backend: Check server logs in terminal
- Network: Use browser dev tools to inspect API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenRouter for AI API services
- NeonDB for PostgreSQL hosting
- Next.js team for the excellent framework
- All contributors and users of aiMMar

## 📞 Support

For support, please open an issue on GitHub or contact the maintainers.

---

**Happy Writing! ✍️**
