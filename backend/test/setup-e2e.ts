if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET =
    'e2e-test-jwt-secret-minimum-32-characters-long!!';
}
