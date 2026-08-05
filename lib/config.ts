export const config = {
  dbUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/apex_migration',
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  uploadDir: process.env.UPLOAD_DIR || 'tmp/uploads',
};

export function validateEnv() {
  const errors = [];
  if (config.env === 'production' && !process.env.GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY is required in production');
  }
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }
}
validateEnv();
