# Environment Configuration

## Required Environment Variables

Add these variables to your `.env` file in the `frontend/inspirewallet` directory:

```env
# MongoDB Backend API
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000

# Email JS (existing)
EXPO_PUBLIC_API_KEY=your_emailjs_api_key
EXPO_PUBLIC_SERVICE_ID=your_service_id
EXPO_PUBLIC_TEMPLATE_ID=your_template_id

# Agent API (existing)
EXPO_PUBLIC_INSPIRE_AGENT_API_KEY=your_agent_api_key

# Translation API (existing)
EXPO_PUBLIC_INSPIREWALLET_TRANSLATE_API_KEY=your_translate_key
```

## Development Setup

1. Copy your existing `.env` file
2. Add the `EXPO_PUBLIC_API_BASE_URL` variable
3. Set it to your backend API URL:
   - Local development: `http://localhost:4000`
   - Production: `https://your-backend-domain.com`

## Testing

To test with the backend:
1. Start the backend server: `cd backend && npm run dev`
2. Start the mobile app: `cd frontend/inspirewallet && npm start`
3. Ensure the backend is running on port 4000

## Notes

- All Expo environment variables must start with `EXPO_PUBLIC_`
- Changes to `.env` require restarting the Expo dev server
- The `.env` file is gitignored for security
