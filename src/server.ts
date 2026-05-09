import * as Sentry from '@sentry/node';
import app from './app';
import { env } from './app/config/env';

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.12 : 0,
    sendDefaultPii: false,
  });
}

async function bootstrap() {
  try {
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const exitHandler = () => {
      if (server) {
        server.close(() => {
          console.log('Server closed');
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    };

    const unexpectedErrorHandler = (error: unknown) => {
      console.error(error);
      exitHandler();
    };

    process.on('uncaughtException', unexpectedErrorHandler);
    process.on('unhandledRejection', unexpectedErrorHandler);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
