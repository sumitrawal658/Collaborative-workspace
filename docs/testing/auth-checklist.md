# Authentication Testing Checklist

## Setup Verification
- [ ] Environment variables are properly set
- [ ] Application starts without errors
- [ ] OAuth configuration is loaded

## Google OAuth
- [ ] Google login button is visible
- [ ] Clicking opens Google consent screen
- [ ] Successfully redirects back to application
- [ ] Access token is stored
- [ ] User profile is loaded

## GitHub OAuth
- [ ] GitHub login button is visible
- [ ] Clicking opens GitHub consent screen
- [ ] Successfully redirects back to application
- [ ] Access token is stored
- [ ] User profile is loaded

## Token Management
- [ ] Access token is included in API requests
- [ ] Token refresh works
- [ ] Token expiration is handled

## Error Handling
- [ ] Invalid credentials show error message
- [ ] Network errors are handled
- [ ] Canceling OAuth flow works properly

## Security
- [ ] No sensitive data in localStorage
- [ ] CSRF protection is active
- [ ] Secure cookie settings 