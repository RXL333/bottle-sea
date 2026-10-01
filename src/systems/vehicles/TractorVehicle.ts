import type { Group } from 'three';
import type { VehicleNavigation } from './Vehicle';
import { TRACTOR_DEFINITION } from '../../gameplay/vehicles/VehicleDefinition';
import { WheeledVehicle } from './WheeledVehicle';

export class TractorVehicle extends WheeledVehicle {
  constructor(root:Group,navigation:VehicleNavigation){super(root,navigation,TRACTOR_DEFINITION);}
}
