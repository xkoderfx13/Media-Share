export function createLogger(level = 'info') {
  const levels = ['error', 'warn', 'info', 'debug'];
  const currentLevel = levels.indexOf(level.toLowerCase()) >= 0 ? level.toLowerCase() : 'info';
  const currentIndex = levels.indexOf(currentLevel);

  function shouldLog(targetLevel) {
    return levels.indexOf(targetLevel) <= currentIndex;
  }

  function log(levelName, message, details) {
    if (!shouldLog(levelName)) {
      return;
    }

    const prefix = `[${new Date().toISOString()}] [${levelName.toUpperCase()}]`;
    if (details !== undefined) {
      console.log(prefix, message, details);
      return;
    }

    console.log(prefix, message);
  }

  return {
    error(message, details) {
      log('error', message, details);
    },
    warn(message, details) {
      log('warn', message, details);
    },
    info(message, details) {
      log('info', message, details);
    },
    debug(message, details) {
      log('debug', message, details);
    },
  };
}
