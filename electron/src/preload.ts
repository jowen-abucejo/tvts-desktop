require('./rt/electron-rt');
//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

import { ipcRenderer, contextBridge } from 'electron';
contextBridge.exposeInMainWorld('configure', {
  setApiDomain: (apiUrl: string, apiVersion: string) =>
    ipcRenderer.invoke('api:domain', apiUrl, apiVersion),
});
