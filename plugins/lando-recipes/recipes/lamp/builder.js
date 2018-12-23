'use strict';

// Modules
const _ = require('lodash');

// Tooling defaults
const toolingDefaults = {
  'composer': {
    service: 'appserver',
    description: 'Run composer commands',
    cmd: 'composer --ansi',
  },
  'db-import [file]': {
    service: ':host',
    description: 'Import <file> into database service',
    cmd: '/helpers/sql-import.sh',
    options: {
      'host': {
        description: 'The database service to use',
        default: 'database',
        alias: ['h'],
      },
      'no-wipe': {
        description: 'Do not destroy the existing database before an import',
        boolean: true,
      },
    },
  },
  'db-export [file]': {
    service: ':host',
    description: 'Export database from a service',
    cmd: '/helpers/sql-export.sh',
    options: {
      host: {
        description: 'The database service to use',
        default: 'database',
        alias: ['h'],
      },
      stdout: {
        description: 'Dump database to stdout',
      },
    },
  },
  'php': {
    service: 'appserver',
    description: 'Run php commands',
    cmd: 'php',
  },
};

/*
 * Helper to get services
 */
const getServices = options => {
  const services = {
    appserver: {
      config: {},
      type: `php:${options.php}`,
      via: options.via,
      ssl: true,
      xdebug: options.xdebug,
      webroot: options.webroot,
    },
    database: {
      config: {},
      type: options.database,
      portforward: true,
      creds: {
        user: options.recipe,
        password: options.recipe,
        database: options.recipe,
      },
    },
  };
  // Set custom vhosts conf
  if (_.has(options, 'config.vhosts')) {
    services.appserver.config.server = options.config.vhosts;
  }
  // Set custom php conf
  if (_.has(options, 'config.php')) {
    services.appserver.config.php = options.config.php;
  }
  // Set custom DB conf
  if (_.has(options, 'config.database')) {
    services.database.config.config = options.config.database;
  }
  // Return
  return services;
};

/*
 * Helper to get tooling
 */
const getTooling = options => {
  const tooling = toolingDefaults;
  if (_.includes(['mysql', 'mariadb'], options.database)) {
    tooling.mysql = {
      service: ':host',
      description: 'Drop into a MySQL shell on a database service',
      cmd: 'mysql -uroot',
      options: {
        host: {
          description: 'The database service to use',
          default: 'database',
          alias: ['h'],
        },
      },
    };
  } else if (options.database === 'postgres') {
    tooling.psql = {
      service: ':host',
      description: 'Drop into a psql shell on a database service',
      cmd: 'psql -Upostgres',
      user: 'root',
      options: {
        host: {
          description: 'The database service to use',
          default: 'database',
          alias: ['h'],
        },
      },
    };
  }
  // Return
  return tooling;
};

/*
 * Build CA service
 */
module.exports = {
  name: 'lamp',
  parent: '_recipe',
  config: {
    database: 'mysql',
    confSrc: __dirname,
    config: {},
    php: '7.2',
    proxy: 'appserver',
    via: 'apache',
    webroot: '.',
    xdebug: false,
  },
  builder: (parent, config) => class LandoLamp extends parent {
    constructor(id, options = {}) {
      options = _.merge({}, config, options);
      const app = {
        proxy: _.set({}, options.proxy, [`${options.app}.${options._app._config.domain}`]),
        services: getServices(options),
        tooling: getTooling(options),
      };
      super(id, _.merge({}, options, app));
    };
  },
};
