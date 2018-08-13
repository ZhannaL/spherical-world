// @flow
import type { Entity } from '../ecs/Entity';
import type World from '../ecs/World';
import type { System } from './System';
import { Transform, UserControlled } from '../components';
import { MENU_TOGGLED } from '../hud/hudConstants';
import { connect } from '../util';
import { updateHudData, toggleMenu } from '../hud/hudActions';

const mapActions = () => ({
  updateHudData,
  toggleMenu,
});

const mapState = ({
  hudData: { states },
}) => ({
  states,
});

const hudProvider = (world: World, store) => {
  class Hud implements System {
    player: {
      id: Entity,
      transform: Transform,
    }[] = world.createSelector([Transform, UserControlled]);

    menuToggledObservable = world.events
      .filter(el => el.type === MENU_TOGGLED)
      .subscribe((event) => {
        this.toggleMenu(!this.states.mainMenuToggled);
      });

    update(delta: number): void {
      this.updateHudData({
        player: {
          position: this.player[0].transform.translation,
        },
      });
    }
  }

  return connect(mapState, mapActions, store)(Hud);
};

export default hudProvider;
