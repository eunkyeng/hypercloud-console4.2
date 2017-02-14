import { analyticsSvc } from './module/analytics';

import './lib/ace/ace';
import './lib/ace/mode/mode-yaml';
import './lib/ace/theme/theme-clouds';

window._ = require('lodash');

window.onerror = function (message, source, lineno, colno) {
  try {
    var e = `${message} ${source} ${lineno} ${colno}`;
    analyticsSvc.error(e);
  }
  catch(err) {
    try {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    catch (ignored) {
      // ignore
    }
  }
};
