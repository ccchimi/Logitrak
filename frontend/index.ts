import { registerRootComponent } from 'expo';

import App from './App';
import { envolverApp, iniciarMonitoreo } from './src/services/monitoreo';
// Registra la tarea del GPS en segundo plano antes de montar la app.
import './src/services/gpsSegundoPlano';

iniciarMonitoreo();

registerRootComponent(envolverApp(App));
