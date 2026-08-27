export class IncrementalEngine {
  constructor(config, { random = Math.random } = {}) {
    this.config = config;
    this.random = random;
    this.entities = new Map();
    this.listeners = new Set();
    this.now = 0;

    for (const definition of config.entities) {
      const components = structuredClone(definition.components ?? {});
      if (components.stage) {
        const firstStage = components.stage.initialStage;
        components.stage.currentStage = firstStage;
        components.stage.progress = 0;
      }
      components.resources = components.resources ?? { values: {} };
      components.resources.values = components.resources.values ?? {};
      if (components.autoTrigger) {
        for (const trigger of components.autoTrigger.triggers) trigger.elapsed = 0;
      }
      this.entities.set(definition.id, {
        id: definition.id,
        name: definition.name,
        tags: definition.tags ?? [],
        components,
      });
    }

    for (const entity of this.entities.values()) {
      if (entity.components.stage) this.runStageTrigger(entity, 'onEnter', entity, entity);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event) {
    for (const listener of this.listeners) listener(event, this);
  }

  entity(id) { return this.entities.get(id); }

  resource(entityId, resourceId) {
    return this.entity(entityId)?.components.resources?.values?.[resourceId] ?? 0;
  }

  stage(entityId) {
    const component = this.entity(entityId)?.components.stage;
    return component ? { id: component.currentStage, progress: component.progress } : null;
  }

  click(sourceId, targetId) {
    const source = this.entity(sourceId);
    const target = this.entity(targetId);
    if (!source?.components.clickExecutor || !target?.components.clickable) return false;
    const actions = target.components.clickable.actions ?? [];
    this.runActions(actions, { source, target });
    if (target.components.clickable.propagation !== 'stop') {
      this.runStageTrigger(target, 'onClick', source, target);
    }
    this.emit({ type: 'click', sourceId, targetId });
    return true;
  }

  tick(deltaSeconds) {
    this.now += deltaSeconds;
    for (const entity of this.entities.values()) {
      for (const trigger of entity.components.autoTrigger?.triggers ?? []) {
        if (!trigger.enabled) continue;
        trigger.elapsed += deltaSeconds;
        while (trigger.elapsed >= trigger.interval) {
          trigger.elapsed -= trigger.interval;
          this.runActions(trigger.actions ?? [], { source: entity, target: entity });
        }
      }
    }
    this.emit({ type: 'tick', deltaSeconds });
  }

  runStageTrigger(entity, triggerName, source = entity, target = entity) {
    const stageComponent = entity.components.stage;
    const stage = stageComponent?.stages?.[stageComponent.currentStage];
    if (stage) this.runActions(stage[triggerName] ?? [], { source, target });
  }

  runActions(actions, context) {
    for (const action of actions) {
      const targets = this.resolveTargets(action.target ?? { type: 'target' }, context);
      for (const target of targets) {
        const scoped = { ...context, target };
        if (!this.conditionsPass(action.conditions ?? [], scoped)) continue;
        if (!this.effectsCanApply(action.effects ?? [], scoped)) continue;
        for (const effect of action.effects ?? []) this.applyEffect(effect, scoped);
      }
    }
  }

  resolveTargets(selector, context) {
    switch (selector.type) {
      case 'self': return [context.source];
      case 'source': return [context.source];
      case 'target': return [context.target];
      case 'entityId': return [this.entity(selector.id)].filter(Boolean);
      case 'tag': return [...this.entities.values()].filter(e => e.tags.includes(selector.tag));
      default: return [];
    }
  }

  targetFor(selector, context) {
    return this.resolveTargets(selector ?? { type: 'target' }, context)[0];
  }

  conditionsPass(conditions, context) {
    return conditions.every(condition => {
      const target = this.targetFor(condition.target, context);
      if (!target) return false;
      switch (condition.type) {
        case 'resource': return this.compare(this.resource(target.id, condition.resource), condition.operator ?? '>=', condition.value);
        case 'stage': return this.compare(target.components.stage?.currentStage, condition.operator ?? '==', condition.value);
        case 'progress': return this.compare(target.components.stage?.progress ?? 0, condition.operator ?? '>=', condition.value);
        case 'random': return this.random() < condition.chance;
        default: return false;
      }
    });
  }

  compare(actual, operator, expected) {
    return ({ '==': actual === expected, '!=': actual !== expected, '>=': actual >= expected,
      '<=': actual <= expected, '>': actual > expected, '<': actual < expected })[operator] ?? false;
  }

  effectsCanApply(effects, context) {
    const costs = new Map();
    for (const effect of effects) {
      if (effect.type !== 'consumeResource') continue;
      const target = this.targetFor(effect.target, context);
      if (!target) return false;
      const key = `${target.id}:${effect.resource}`;
      costs.set(key, (costs.get(key) ?? 0) + effect.amount);
      if (this.resource(target.id, effect.resource) < costs.get(key)) return false;
    }
    return true;
  }

  applyEffect(effect, context) {
    if (effect.type === 'click') {
      const target = this.targetFor(effect.target, context);
      if (target) this.click(context.source.id, target.id);
      return;
    }
    const target = this.targetFor(effect.target, context);
    if (!target) return;
    if (effect.type === 'gainResource' || effect.type === 'consumeResource') {
      const resources = target.components.resources;
      const current = resources.values[effect.resource] ?? 0;
      const signed = effect.type === 'gainResource' ? effect.amount : -effect.amount;
      const maximum = this.config.resources?.[effect.resource]?.max ?? Infinity;
      resources.values[effect.resource] = Math.max(0, Math.min(maximum, current + signed));
      this.emit({ type: effect.type, entityId: target.id, resource: effect.resource, amount: effect.amount });
    } else if (effect.type === 'addProgress') {
      this.addProgress(target, effect.amount, context.source);
    }
  }

  addProgress(entity, amount, source = entity) {
    const component = entity.components.stage;
    if (!component) return;
    let remaining = amount;
    let transitions = 0;
    while (remaining > 0 && transitions++ < 100) {
      const stage = component.stages[component.currentStage];
      if (!stage || stage.progressMax === 0) break;
      const needed = stage.progressMax - component.progress;
      const used = Math.min(needed, remaining);
      component.progress += used;
      remaining -= used;
      if (component.progress < stage.progressMax) break;
      const transition = (stage.transitions ?? []).find(item => this.conditionsPass(item.conditions ?? [], { source, target: entity }));
      if (!transition) break;
      this.runStageTrigger(entity, 'onExit', source, entity);
      component.currentStage = transition.target;
      component.progress = 0;
      this.runStageTrigger(entity, 'onEnter', source, entity);
      this.emit({ type: 'stageChanged', entityId: entity.id, stageId: component.currentStage });
    }
  }
}
