import './ui/styles.css';
import { LocalStorageMoodAdapter } from './adapters/local-storage-mood.adapter';
import { MeteorologyEngineAdapter } from './adapters/meteorology-engine.adapter';
import { createRecordFromTag } from './core/meteorology-engine';
import { MoodRecord, SynopticChartData } from './core/models';
import { renderWeatherApp } from './ui/app';
import { summarizeMood, chartSummary } from './core/mood-summary';
import { moodTelemetry } from './adapters/mood-telemetry';
import { buildBugSurface } from './adapters/quality/bugSurface';

const repo = new LocalStorageMoodAdapter();
const metEngine = new MeteorologyEngineAdapter();

let records = repo.getAll();
// Selection identity lives here, independent of the derived chart, so it
// survives consecutive selections and newly inserted records.
let focusedRecordId: string | null = null;
let chartData: SynopticChartData = metEngine.generateSynopticChart(records, focusedRecordId);

let isModalOpen = false;
let isDetailOpen = false;
let selectedTag = '阴转多云';
let selectedIntensity = 5;
let noteText = '';

const rootEl = document.getElementById('app')!;
const bugSurface = buildBugSurface([records.length, chartData.zones.length]);
rootEl.dataset.moodSummary = JSON.stringify({
  summary: summarizeMood(records),
  chart: chartSummary(chartData),
  telemetry: moodTelemetry('initial'),
  bugSurface,
  preembeddedBugCount: bugSurface.bugs.length,
  hellBugCount: bugSurface.bugs.filter((bug) => bug.level === 'hell').length,
  difficultBugCount: bugSurface.bugs.filter((bug) => bug.level === 'difficult').length
});

function refreshView() {
  renderWeatherApp(
    rootEl,
    chartData,
    isModalOpen,
    isDetailOpen,
    selectedTag,
    selectedIntensity,
    noteText,
    {
      onOpenLogModal: () => {
        isModalOpen = true;
        selectedTag = '阴转多云';
        selectedIntensity = 5;
        noteText = '';
        refreshView();
      },
      onResetData: () => {
        records = repo.resetToSample();
        // Fresh sample sequence carries all-new ids; drop any stale focus.
        focusedRecordId = null;
        isDetailOpen = false;
        chartData = metEngine.generateSynopticChart(records, focusedRecordId);
        refreshView();
      },
      onSubmitLog: (tag: string, intensity: number, note: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const newRecord = createRecordFromTag(tag, intensity, note, todayStr);
        repo.add(newRecord);
        records = repo.getAll();
        // Same-date records replace each other in storage; if the focus
        // pointed at the replaced record it no longer exists, so follow the
        // new record's identity instead of snapping to "latest" implicitly.
        // A historical focus on any other record is preserved untouched.
        if (focusedRecordId && !records.some(r => r.id === focusedRecordId)) {
          focusedRecordId = newRecord.id;
        }
        chartData = metEngine.generateSynopticChart(records, focusedRecordId);
        isModalOpen = false;
        isDetailOpen = false;
        refreshView();
      },
      onSelectRecord: (record: MoodRecord) => {
        // Re-generate chart focusing on this record while keeping the full
        // timeline available: identity is carried by id, never by filtering
        // the source record set.
        focusedRecordId = record.id;
        isDetailOpen = true;
        chartData = metEngine.generateSynopticChart(records, focusedRecordId);
        refreshView();
      },
      onReturnToLatest: () => {
        focusedRecordId = null;
        isDetailOpen = false;
        chartData = metEngine.generateSynopticChart(records, focusedRecordId);
        refreshView();
      }
    },
    () => {
      isModalOpen = false;
      refreshView();
    },
    (tag: string) => {
      selectedTag = tag;
      refreshView();
    },
    (intensity: number) => {
      selectedIntensity = intensity;
      refreshView();
    },
    (note: string) => {
      noteText = note;
    },
    () => {
      isDetailOpen = false;
      refreshView();
    }
  );
}

// Initial mount
refreshView();
