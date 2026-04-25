Component({
  properties: {
    title: {
      type: String,
      value: '',
    },
    field: {
      type: String,
      value: '',
    },
    active: {
      type: String,
      value: 'all',
    },
    options: {
      type: Array,
      value: [],
    },
  },
  methods: {
    handleChange(event: WechatMiniprogram.TouchEvent) {
      const value = event.currentTarget.dataset.value as string;
      this.triggerEvent('change', {
        field: this.data.field,
        value,
      });
    },
  },
});
