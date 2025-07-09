# aiMMar Backend

A FastAPI-based backend for the aiMMar note-taking application, powered by NeonDB (PostgreSQL).

## Features

- **Session Management**: Create, update, and manage note-taking sessions
- **Version Control**: Track and manage different versions of sessions
- **PostgreSQL Database**: Powered by NeonDB for reliable data storage
- **CORS Support**: Configured for frontend integration
- **Async Operations**: Built with async/await for optimal performance

## Quick Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure NeonDB

Run the setup script to create your environment configuration:

```bash
python setup_neondb.py
```

This will create a `.env` file template. You need to:

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your connection string from the project dashboard
4. Update the `DATABASE_URL` in the `.env` file

Your connection string should look like:
```
postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### 3. Start the Server

```bash
python -m uvicorn server:app --reload
```

The server will be available at `http://localhost:8000`

### 4. Update Frontend Configuration

Update your frontend `.env.local` file:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## API Endpoints

### Sessions

- `GET /sessions` - List all sessions
- `POST /sessions` - Create a new session
- `GET /sessions/{session_id}` - Get a specific session
- `PUT /sessions/{session_id}` - Update a session
- `DELETE /sessions/{session_id}` - Delete a session

### Versions

- `GET /sessions/{session_id}/versions` - List all versions for a session
- `POST /sessions/{session_id}/versions` - Create a new version
- `GET /sessions/{session_id}/versions/{version_id}` - Get a specific version
- `PUT /sessions/{session_id}/versions/{version_id}` - Update a version
- `DELETE /sessions/{session_id}/versions/{version_id}` - Delete a version

### Health Check

- `GET /health` - Check server status

## Database Schema

### Sessions Table
- `id` (UUID, Primary Key)
- `title` (String)
- `content` (Text)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Versions Table
- `id` (UUID, Primary Key)
- `session_id` (UUID, Foreign Key)
- `content` (Text)
- `created_at` (DateTime)
- `version_number` (Integer)

## Development

### Database Migrations

The application automatically creates tables on startup. For production deployments, consider using Alembic for proper database migrations.

### Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests (when test files are created)
pytest
```

## Deployment

### Local Development
```bash
uvicorn server:app --reload --port 8000
```

### Production
```bash
uvicorn server:app --host 0.0.0.0 --port 8000
```

### Docker (Optional)
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

### Common Issues

1. **Connection Error**: Ensure your NeonDB connection string is correct and the database is accessible
2. **CORS Issues**: Update `ALLOWED_ORIGINS` in your `.env` file to include your frontend URL
3. **Port Conflicts**: Change the `PORT` in your `.env` file if 8000 is already in use

### Logs

The server provides detailed logging. Check the console output for any errors or warnings.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the aiMMar application suite.