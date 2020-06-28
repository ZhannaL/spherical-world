import react from 'react';
import reactDom from 'react-dom';
import * as reactRedux from 'react-redux';
import type { Store } from '../store/store';

export const initHudAPI = (store: Store): void => {
  window.gameExternals = {
    react,
    'react-dom': reactDom,
    store,
    'react-redux': reactRedux,
  };
};
