export function validateAttendantSignin({ identifier, password }) {
  const errors = {};
  if (!identifier || !identifier.trim()) errors.identifier = '"identifier" is required';
  if (!password) errors.password = '"password" is required';
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
