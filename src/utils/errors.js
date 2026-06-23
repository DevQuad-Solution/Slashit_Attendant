// All errors from Axios interceptor come as Error with .message = backend message string
// and .status = HTTP status code

// Returns a clean user-facing string for toast display
export function getErrorMessage(err, fallback = 'Something went wrong. Try again.') {
  if (!err) return fallback;
  if (typeof err === 'string') return err;

  const msg = err.message || fallback;

  // Map specific backend messages to more user-friendly versions where needed
  const messageMap = {
    'Invalid Credentials': 'Wrong email or password. Check and try again.',
    'Email already exists!': 'This email already has an account. Sign in instead.',
    'Sign up data not found!': 'Verification session expired. Please sign up again.',
    'Token is invalid!': 'Verification token is invalid. Please start over.',
    'Emails do not match!': 'Email mismatch. Please restart the signup process.',
    'Account not Found!': 'No account found with that email address.',
    'Verification code is invalid or expired': 'Code is wrong or expired. Request a new one.',
    'Only verified user accounts can create a slash!': 'Complete KYC verification before creating a slash.',
    'Insufficient wallet balance!': 'Not enough balance in your wallet.',
    'You have already joined this slash!': 'You have already joined this slash.',
    'You have not joined this slash!': 'You have not joined this slash.',
    'Cannot delete a slash that has other members!': 'Cannot delete — other members have joined.',
    'You can only delete your own slash!': 'You can only delete slashes you created.',
    'You can only edit your own slash!': 'You can only edit slashes you created.',
    'Hub already has an attendant, please unassign first!': 'This hub already has an attendant assigned.',
    'Attendant is already assigned to a hub, please unassign first!': 'This attendant is already assigned to another hub.',
    'Only attendants can access this dashboard': 'Access denied. Attendants only.',
    'Attendant is not assigned to a hub': 'This attendant is not assigned to any hub.',
  };

  return messageMap[msg] || msg || fallback;
}

// Check if a 403 is a business rule block vs wrong credentials
export function isBusinessRuleError(err) {
  return err?.status === 403 && err.message !== 'Invalid Credentials';
}

// Extract field-level validation errors from backend 400 responses
// Backend format: '"fieldName" is required' or '"fieldName" must be ...'
export function parseFieldError(err) {
  if (!err?.message) return null;
  const match = err.message.match(/^"([^"]+)"/);
  if (match) return { field: match[1], message: err.message };
  return null;
}
