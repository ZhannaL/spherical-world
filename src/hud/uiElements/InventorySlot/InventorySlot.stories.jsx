// @flow
import React from 'react';
import { storiesOf } from '@storybook/react';
import InventorySlot from './InventorySlot';

storiesOf('InventorySlot', module)
  .add('InventorySlot', () =>
  <>
    Normal:
    <InventorySlot slot={{ count: 1 }} />
    Selected:
    <InventorySlot slot={{ count: 1 }} selected={true} />
  </>);
