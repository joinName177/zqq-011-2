import { MoodRecord, SynopticChartData } from '../core/models';
import { evaluateSynopticSystem } from '../core/meteorology-engine';
import { MeteorologyPort } from '../ports/meteorology.port';

export class MeteorologyEngineAdapter implements MeteorologyPort {
  generateSynopticChart(records: MoodRecord[], focusedRecordId?: string | null): SynopticChartData {
    return evaluateSynopticSystem(records, focusedRecordId);
  }
}
