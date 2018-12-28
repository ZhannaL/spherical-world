// @flow strict
import { combineReducers } from 'redux';
import { reduceReducers } from '../util/reducerUtils';

import { routerReducer } from '../hud/utils/StateRouter';
import hudReducer from '../hud/hudReducer';
import keyBindingsReducer from '../hud/components/KeyBindings/keyBindingsReducer';
import mainPanelReducer from '../hud/components/MainPanel/mainPanelReducer';

const reducers = {
  hudData: hudReducer,
  keyBindings: keyBindingsReducer,
  uiStates: routerReducer,
  mainPanel: mainPanelReducer,
};

type $ExtractFunctionReturn = <V, Args>(v: (...args: Args) => V) => V;

const combinedReducer = combineReducers(reducers);

const rootReducer = reduceReducers(combinedReducer);

// export type State = $ObjMap<typeof reducers, $ExtractFunctionReturn>;

export type State = {
  hudData: $Call<$ExtractFunctionReturn, typeof hudReducer>,
  keyBindings: $Call<$ExtractFunctionReturn, typeof keyBindingsReducer>,
  uiStates: $Call<$ExtractFunctionReturn, typeof routerReducer>,
  mainPanel: $Call<$ExtractFunctionReturn, typeof mainPanelReducer>,
};

export default rootReducer;
