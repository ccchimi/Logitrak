import { registerRootComponent } from 'expo';

import App from './App';
import { envolverApp, iniciarMonitoreo } from './src/services/monitoreo';

// Antes de montar la app, para capturar también los errores del arranque.
iniciarMonitoreo();

registerRootComponent(envolverApp(App));
