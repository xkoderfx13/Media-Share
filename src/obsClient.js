import OBSWebSocket from 'obs-websocket-js';

export function createOBSClient({ logger, url, password, browserSourceName, sceneName }) {
  const client = new OBSWebSocket();
  let connected = false;

  async function connect() {
    if (!url || !browserSourceName) {
      logger.info('OBS WebSocket is not configured. Skipping OBS connection.');
      return;
    }

    try {
      logger.info(`Connecting to OBS WebSocket at ${url}...`);
      await client.connect(url, password);
      connected = true;
      logger.info('Connected to OBS WebSocket.');
    } catch (error) {
      logger.error('Failed to connect to OBS WebSocket.', error);
      throw error;
    }
  }

  async function updateBrowserSourceUrl(urlValue) {
    if (!connected) {
      logger.warn('OBS WebSocket is not connected. Cannot update browser source URL.');
      return;
    }

    try {
      logger.info(`Updating OBS browser source '${browserSourceName}' to ${urlValue}`);
      await client.call('SetInputSettings', {
        inputName: browserSourceName,
        inputSettings: {
          url: urlValue,
        },
        overlay: false,
      });

      if (sceneName) {
        logger.info(`Switching OBS scene to '${sceneName}'.`);
        await client.call('SetCurrentProgramScene', { sceneName });
      }
    } catch (error) {
      logger.error('Failed to update OBS browser source.', error);
      throw error;
    }
  }

  async function disconnect() {
    if (!connected) {
      return;
    }

    try {
      await client.disconnect();
      connected = false;
      logger.info('Disconnected from OBS WebSocket.');
    } catch (error) {
      logger.warn('Error disconnecting from OBS WebSocket.', error);
    }
  }

  return {
    connect,
    updateBrowserSourceUrl,
    disconnect,
  };
}
