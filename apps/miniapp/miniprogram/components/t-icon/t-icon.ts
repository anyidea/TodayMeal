const glyphs: Record<string, string> = {
  add: "\uE00D",
  app: "\uE053",
  "book-open": "\uE0C8",
  camera: "\uE133",
  check: "\uE1BC",
  "chevron-left": "\uE1D0",
  fork: "\uE3E6",
  "grid-view": "\uE451",
  heart: "\uE460",
  home: "\uE470",
  moon: "\uE5F4",
  more: "\uE5F5",
  refresh: "\uE6D6",
  "rice-ball": "\uE6E2",
  search: "\uE71D",
  share: "\uE737",
  shop: "\uE749",
  star: "\uE781",
  time: "\uE832",
  user: "\uE8C7",
  usergroup: "\uE8D3"
};

Component({
  options: {
    virtualHost: true
  },

  properties: {
    name: {
      type: String,
      value: ""
    },
    size: {
      type: String,
      value: "32rpx"
    },
    color: {
      type: String,
      value: "currentColor"
    }
  },

  data: {
    glyph: "",
    iconStyle: ""
  },

  observers: {
    "name,size,color": function updateIcon(
      name: string,
      size: string,
      color: string
    ) {
      this.setData({
        glyph: glyphs[name] || "",
        iconStyle: `font-size: ${size}; color: ${color};`
      });
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        glyph: glyphs[this.data.name] || "",
        iconStyle: `font-size: ${this.data.size}; color: ${this.data.color};`
      });
    }
  }
});
