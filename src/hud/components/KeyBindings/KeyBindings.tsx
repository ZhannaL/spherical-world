import React, { useCallback } from 'react';
import type { KeyPosition } from './keyBindingsTypes';
import type { EVENT_CATEGORY } from '../../../Input/eventTypes';
import type { State } from '../../../reducers/rootReducer';
import { getEventInfo } from '../../../../common/constants/input/rawEventInfo';
import { KEY_BINDINGS } from './keyBindingsConstants';
import { useStartEditKey } from './keyBindingsActions';
import { useSetUIState } from '../../utils/StateRouter';
import Button from '../../uiElements/Button';
import Label from '../../uiElements/Label';
import StatusPanel from './StatusPanel';
import ModalWindowMenu from '../ModalWindowMenu';
import {
  content,
  command,
  header,
  section,
  commandGroup,
  helpLine,
  footerButtons,
  label,
  labelFirst,
  labelCommandGroup,
} from './keyBindings.module.scss';
import { useMemoizedSelector } from '../../../util/reducerUtils';

type ActionMapppingMappedProps = {
  caption: string;
  action: string;
  firstKey: string;
  secondKey: string;
};

type ActionMapppingProps = SpreadTypes<
  ActionMapppingMappedProps,
  {
    onSetKey: (action: string, key: KeyPosition) => unknown;
  }
>;

type ActionCategoryMappedProps = {
  name: EVENT_CATEGORY;
  items: ReadonlyArray<ActionMapppingMappedProps>;
};

type ActionCategoryProps = SpreadTypes<
  ActionCategoryMappedProps,
  {
    onSetKey: (action: string, key: KeyPosition) => unknown;
  }
>;

const ActionMappping = ({
  caption,
  firstKey,
  secondKey,
  action,
  onSetKey,
}: ActionMapppingProps) => (
  <div className={command}>
    <Label className={labelFirst}>{caption}</Label>
    <Button onClick={() => onSetKey(action, 'first')} size="small">
      {getEventInfo(firstKey).caption}
    </Button>
    <Button onClick={() => onSetKey(action, 'second')} size="small">
      {getEventInfo(secondKey).caption}
    </Button>
  </div>
);

const ActionCategory = ({ name, items, onSetKey }: ActionCategoryProps) => (
  <div>
    <article className={commandGroup}>
      <Label size="big" className={labelCommandGroup}>
        {name}
      </Label>
    </article>
    {items.map((mapping) => (
      <ActionMappping key={mapping.action} onSetKey={onSetKey} {...mapping} />
    ))}
  </div>
);

const KeyBindings = (): JSX.Element => {
  const setUIState = useSetUIState();
  const startEditKey = useStartEditKey();
  const close = useCallback(() => setUIState(KEY_BINDINGS, false), [setUIState]);
  const keyCategories = useMemoizedSelector(({ keyBindings }: State) => keyBindings.keyCategories);

  return (
    <ModalWindowMenu caption="Key Bindings">
      <div className={content}>
        <header className={`${command} ${header}`}>
          <Label className={labelFirst}>command</Label>
          <Label className={label}>key 1</Label>
          <Label className={label}>key 2</Label>
        </header>
        <section className={section}>
          <section>
            {keyCategories.map((category) => (
              <ActionCategory onSetKey={startEditKey} key={category.name} {...category} />
            ))}
          </section>
        </section>
        <div className={helpLine}>
          <StatusPanel />
        </div>
        <footer className={footerButtons}>
          <Button size="small">reset to default</Button>
          <Label className={label} />
          <Button size="small">unbind key</Button>
          <Button size="small" onClick={close}>
            OK
          </Button>
          <Button size="small" onClick={close}>
            Cancel
          </Button>
        </footer>
      </div>
    </ModalWindowMenu>
  );
};

export default KeyBindings;
