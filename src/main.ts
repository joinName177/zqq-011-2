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
// 当前选中的观测记录身份；null 表示观测最新记录。
// 所有面板都必须经由该身份推演，时间线本身始终展示完整记录序列。
let selectedRecordId: string | null = null;
let chartData: SynopticChartData = metEngine.generateSynopticChart(records, selectedRecordId ?? undefined);

let isModalOpen = false;
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

function resolveFocus(): string | undefined {
  // 选中身份在完整记录集中仍然存在时贯穿全场；记录被删除（如同日被覆盖）则回退到最新记录。
  if (selectedRecordId && records.some(r => r.id === selectedRecordId)) {
    return selectedRecordId;
  }
  selectedRecordId = null;
  return undefined;
}

function refreshView() {
  chartData = metEngine.generateSynopticChart(records, resolveFocus());
  renderWeatherApp(
    rootEl,
    chartData,
    isModalOpen,
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
        selectedRecordId = null;
        refreshView();
      },
      onSubmitLog: (tag: string, intensity: number, note: string) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const newRecord = createRecordFromTag(tag, intensity, note, todayStr);
        repo.add(newRecord);
        records = repo.getAll();
        // 新增记录后观测焦点跟随新记录，身份（最新身份）贯穿图表与详情。
        selectedRecordId = newRecord.id;
        isModalOpen = false;
        refreshView();
      },
      onSelectRecord: (record: MoodRecord) => {
        // 只切换观测身份，不截断、不污染完整记录序列，保证可连续往返选择。
        selectedRecordId = record.id;
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
    }
  );
}

// Initial mount
refreshView();
