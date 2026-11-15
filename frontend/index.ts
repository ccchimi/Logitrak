import { registerRootComponent } from 'expo';

import App from './App';
import { envolverApp, iniciarMonitoreo } from './src/services/monitoreo';

iniciarMonitoreo();

registerRootComponent(envolverApp(App));
