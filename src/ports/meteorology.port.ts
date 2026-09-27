import { MoodRecord, SynopticChartData } from '../core/models';

export interface MeteorologyPort {
  /**
   * Generate the synoptic chart.
   *
   * @param records full set of records known to the repository
   * @param focusedRecordId id of the record the user is currently inspecting.
   *   The statistical window is every record up to (and including) that
   *   record, and `currentRecord` is the focused record itself. When omitted,
   *   the latest record is the focus. The returned `records` list is ALWAYS
   *   the full set (sorted), so selection identity survives consecutive
   *   selections and newly inserted records.
   */
  generateSynopticChart(records: MoodRecord[], focusedRecordId?: string | null): SynopticChartData;
}
