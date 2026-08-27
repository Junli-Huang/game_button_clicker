import { IncrementalEngine } from './engine.js';
import { demoConfig } from './demo-config.js';

const engine = new IncrementalEngine(demoConfig);
const stageNames = demoConfig.entities.find(e => e.id === 'wheat-field').components.stage.stages;
const wheat = document.querySelector('#wheat');
const stage = document.querySelector('#stage');
const progress = document.querySelector('#progress');
const progressText = document.querySelector('#progress-text');
const log = document.querySelector('#log');

function render() {
  const state = engine.stage('wheat-field');
  const definition = stageNames[state.id];
  wheat.textContent = engine.resource('player', 'wheat');
  stage.textContent = definition.name;
  progress.max = definition.progressMax || 1;
  progress.value = state.progress;
  progressText.textContent = `${state.progress} / ${definition.progressMax}`;
}

engine.subscribe(event => {
  render();
  if (event.type === 'stageChanged') appendLog(`阶段切换：${stageNames[event.stageId].name}`);
  if (event.type === 'gainResource') appendLog(`收获小麦 +${event.amount}`);
});

function appendLog(message) {
  const item = document.createElement('li');
  item.textContent = message;
  log.prepend(item);
  while (log.children.length > 6) log.lastElementChild.remove();
}

document.querySelector('#field').addEventListener('click', () => engine.click('player', 'wheat-field'));
document.querySelector('#auto-farmer').addEventListener('change', event => {
  engine.entity('auto-farmer').components.autoTrigger.triggers[0].enabled = event.target.checked;
});
document.querySelector('#auto-clicker').addEventListener('change', event => {
  engine.entity('auto-clicker').components.autoTrigger.triggers[0].enabled = event.target.checked;
});

let last = performance.now();
function frame(now) {
  engine.tick(Math.min((now - last) / 1000, 0.1));
  last = now;
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
