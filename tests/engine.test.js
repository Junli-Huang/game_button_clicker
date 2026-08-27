import test from 'node:test';
import assert from 'node:assert/strict';
import { IncrementalEngine } from '../src/engine.js';
import { demoConfig } from '../src/demo-config.js';

const create = () => new IncrementalEngine(structuredClone(demoConfig), { random: () => 0 });

test('click advances stage and mature click grants resource', () => {
  const engine = create();
  for (let i = 0; i < 10; i++) engine.click('player', 'wheat-field');
  assert.equal(engine.stage('wheat-field').id, 'mature');
  engine.click('player', 'wheat-field');
  assert.equal(engine.resource('player', 'wheat'), 3);
  assert.equal(engine.stage('wheat-field').id, 'growing');
});

test('auto trigger advances target and auto click uses target click behavior', () => {
  const engine = create();
  engine.tick(2);
  assert.equal(engine.stage('wheat-field').progress, 3);
});

test('effects are atomic when cumulative resource cost is unavailable', () => {
  const engine = create();
  const player = engine.entity('player');
  player.components.resources.values.wheat = 4;
  engine.runActions([{ effects: [
    { type: 'consumeResource', resource: 'wheat', amount: 3, target: { type: 'source' } },
    { type: 'consumeResource', resource: 'wheat', amount: 3, target: { type: 'source' } },
    { type: 'gainResource', resource: 'wheat', amount: 10, target: { type: 'source' } },
  ] }], { source: player, target: player });
  assert.equal(engine.resource('player', 'wheat'), 4);
});

test('tag targeting changes every matching entity independently', () => {
  const config = structuredClone(demoConfig);
  config.entities.push(structuredClone(config.entities.find(e => e.id === 'wheat-field')));
  config.entities.at(-1).id = 'wheat-field-2';
  const engine = new IncrementalEngine(config);
  const player = engine.entity('player');
  engine.runActions([{ target: { type: 'tag', tag: 'farm' }, effects: [{ type: 'addProgress', amount: 4 }] }], { source: player, target: player });
  assert.equal(engine.stage('wheat-field').progress, 4);
  assert.equal(engine.stage('wheat-field-2').progress, 4);
});

test('progress overflow can cross multiple stages', () => {
  const engine = create();
  engine.addProgress(engine.entity('wheat-field'), 22, engine.entity('player'));
  assert.deepEqual(engine.stage('wheat-field'), { id: 'growing', progress: 0 });
});
