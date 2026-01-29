# EmailJS Setup Guide

## Error: "The public key is required"

This error occurs when EmailJS is not properly configured with your public key.

## Steps to Fix

### 1. Get Your EmailJS Credentials

Visit [EmailJS Dashboard](https://dashboard.emailjs.com/admin/account) and get:

- **Public Key** (also called API Key)
- **Service ID**
- **Template IDs**

### 2. Create `.env` File

Create a `.env` file in the project root (same directory as `package.json`):

```bash
# Copy the example file
cp .env.example .env
```

### 3. Add Your Credentials

Edit the `.env` file and replace the placeholder values:

```env
# EmailJS Configuration
EXPO_PUBLIC_API_KEY=your_actual_public_key
EXPO_PUBLIC_SERVICE_ID=your_actual_service_id
EXPO_PUBLIC_TEMPLATE_ID=your_actual_template_id
EXPO_PUBLIC_CONTRACT_REQUEST_TEMPLATE_ID=your_actual_contract_template_id
```

### 4. Restart Your Development Server

After creating/updating the `.env` file, restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm start
# or
npx expo start
```

## Where EmailJS is Used

EmailJS is currently used in the following features:

- **Inspire Cards** - Card request submissions
- **Deposit** - Deposit notifications
- **Withdraw** - Withdrawal requests
- **Transfer** - Transfer notifications
- **Travel** - Travel application submissions
- **Maya** - Maya application submissions
- **BDO** - BDO application submissions
- **Help Center** - Support ticket submissions
- **Inspire Auto** - Contract requests

## Security Notes

⚠️ **Important**: 
- Never commit the `.env` file to version control
- The `.env` file is already in `.gitignore`
- Only share credentials through secure channels
- Use environment variables for production deployments

## Troubleshooting

### Still getting the error after adding credentials?

1. **Verify the file name**: Must be exactly `.env` (not `.env.txt`)
2. **Check file location**: Must be in project root directory
3. **Restart server**: Environment variables are loaded at startup
4. **Verify credentials**: Double-check your EmailJS dashboard for correct values
5. **Check variable names**: Must start with `EXPO_PUBLIC_` for Expo apps

### How to verify your setup?

Add this temporary debug code to see if environment variables are loaded:

```javascript
console.log('EmailJS Config:', {
  hasPublicKey: !!process.env.EXPO_PUBLIC_API_KEY,
  hasServiceId: !!process.env.EXPO_PUBLIC_SERVICE_ID,
  hasTemplateId: !!process.env.EXPO_PUBLIC_TEMPLATE_ID
});
```

## Additional Resources

- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
