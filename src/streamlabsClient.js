import { io } from 'socket.io-client';

export function createStreamlabsClient({ logger, socketToken, onDonation }) {
  let socket = null;

  function connect() {
    logger.info('Connecting to Streamlabs Socket API...');

    socket = io('https://sockets.streamlabs.com', {
      transports: ['websocket'],
      auth: {
        token: socketToken,
      },
      query: {
        token: socketToken,
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      logger.info(`Connected to Streamlabs Socket API. Socket ID: ${socket.id}`);
    });

    socket.on('disconnect', (reason) => {
      logger.warn(`Disconnected from Streamlabs Socket API. Reason: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      logger.error('Streamlabs connection error.', error);
    });

    socket.on('event', (eventData) => {
      logger.debug('Received Streamlabs event payload.', eventData);

      if (!eventData || typeof eventData !== 'object') {
        return;
      }

      const type = eventData.type || eventData.message_type || null;
      if (type !== 'donation') {
        return;
      }

      const donation = eventData.message || eventData.data || eventData;
      if (typeof onDonation === 'function') {
        Promise.resolve(onDonation(donation)).catch((error) => {
          logger.error('Donation processing failed.', error);
        });
      }
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      logger.info('Disconnected from Streamlabs Socket API.');
    }
  }

  return {
    connect,
    disconnect,
  };
}
