const addProgress = amount => ({ type: 'addProgress', amount, target: { type: 'target' } });
const clickField = { type: 'click', target: { type: 'entityId', id: 'wheat-field' } };

export const demoConfig = {
  resources: {
    wheat: { id: 'wheat', name: '小麦' },
  },
  entities: [
    {
      id: 'player', name: '玩家', components: {
        clickExecutor: {}, resources: { values: { wheat: 0 } },
      },
    },
    {
      id: 'wheat-field', name: '麦田', tags: ['farm'], components: {
        clickable: { actions: [] }, resources: { values: {} },
        stage: {
          initialStage: 'growing',
          stages: {
            growing: {
              name: '生长中', progressMax: 10,
              onClick: [{ effects: [addProgress(1)] }],
              transitions: [{ target: 'mature' }],
            },
            mature: {
              name: '已成熟', progressMax: 1,
              onClick: [{ effects: [
                { type: 'gainResource', resource: 'wheat', amount: 3, target: { type: 'source' } },
                addProgress(1),
              ] }],
              transitions: [{ target: 'growing' }],
            },
          },
        },
      },
    },
    {
      id: 'auto-farmer', name: '自动农夫', components: {
        resources: { values: {} },
        autoTrigger: { triggers: [{ enabled: false, interval: 1, actions: [{ target: { type: 'entityId', id: 'wheat-field' }, effects: [addProgress(1)] }] }] },
      },
    },
    {
      id: 'auto-clicker', name: '自动点击器', components: {
        clickExecutor: {}, resources: { values: {} },
        autoTrigger: { triggers: [{ enabled: false, interval: 2, actions: [{ effects: [clickField] }] }] },
      },
    },
  ],
};
