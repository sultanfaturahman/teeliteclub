import { toast } from 'sonner';
import { logger } from './logger';

// Generic error handler for application errors
export class AppError extends Error {
  constructor(
    message: string,
    public userMessage: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Handle authentication errors with user-friendly messages
export const handleAuthError = (error: Error | { message?: string; code?: string }): string => {
  logger.error('Authentication error', error);
  
  if (error?.message?.includes('Invalid login credentials')) {
    return 'Email atau password salah';
  }
  
  if (error?.message?.includes('already registered')) {
    return 'Email sudah terdaftar';
  }
  
  if (error?.message?.includes('Email not confirmed')) {
    return 'Silakan periksa email untuk konfirmasi akun';
  }
  
  if (error?.message?.includes('Invalid email')) {
    return 'Format email tidak valid';
  }
  
  // Generic fallback
  return 'Terjadi kesalahan pada sistem autentikasi';
};

// Handle database errors with user-friendly messages
export const handleDatabaseError = (error: Error | { code?: string; message?: string }, operation: string): string => {
  logger.error(`Database error during ${operation}`, error);
  
  if (error?.code === '23505') { // Unique constraint violation
    return 'Data sudah ada dalam sistem';
  }
  
  if (error?.code === '23503') { // Foreign key constraint violation
    return 'Data tidak dapat dihapus karena masih digunakan';
  }
  
  if (error?.code === 'PGRST116') { // No rows found
    return 'Data tidak ditemukan';
  }
  
  // Generic fallback
  return `Gagal ${operation}`;
};

// Safe error handler that doesn't expose sensitive information
export const handleError = (error: Error | AppError | unknown, userMessage?: string): void => {
  if (error instanceof AppError) {
    toast.error(error.userMessage);
    logger.error(error.message, { statusCode: error.statusCode });
  } else {
    const message = userMessage || 'Terjadi kesalahan yang tidak terduga';
    toast.error(message);
    logger.error('Unexpected error', error);
  }
};