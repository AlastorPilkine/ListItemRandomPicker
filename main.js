/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  LIRPSuggestModal: () => LIRPSuggestModal,
  default: () => ListItemRandomPicker
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
function findIndexes(anArray, predicate) {
  const indexes = [];
  anArray.forEach((element, index) => {
    if (predicate(element, index)) {
      indexes.push(index);
    }
  });
  return indexes;
}
var DEFAULT_SETTINGS = {
  notePath: "Full path of a note",
  showWarning: true
};
var LIRPList = class {
  constructor(lines) {
    this.title = "";
    this.description = "";
    this.hidden = false;
    this.items = [];
    this.warning = [];
    const headingRegEx = /^# +(.+)$/;
    this.title = lines[0].replace(headingRegEx, "$1");
    const italicHeadingRegex = /^(_|\*)\S/;
    if (italicHeadingRegex.test(this.title)) {
      this.hidden = true;
    } else {
      this.hidden = false;
    }
    lines.shift();
    const listBeginItemRegex = /^(-|\d+\.) +(.+)$/;
    const listBeginIndexes = findIndexes(lines, (element) => listBeginItemRegex.test(element));
    if (listBeginIndexes.length === 0) {
      this.warning.push(`No items in list ${this.title}`);
      this.hidden = true;
      return;
    }
    const cleanLines = lines.map((element) => {
      return element.replace(listBeginItemRegex, "$2");
    });
    if (listBeginIndexes[0] !== 0) {
      let mdDescription = cleanLines.slice(0, listBeginIndexes[0]);
      if (mdDescription[0] === "") {
        mdDescription.shift();
      }
      this.description = mdDescription.join("\n");
    } else {
      this.description = "";
    }
    const listBeginCount = listBeginIndexes.length;
    let item;
    for (let currentIndex = 0; currentIndex < listBeginCount - 1; currentIndex++) {
      item = cleanLines.slice(listBeginIndexes[currentIndex], listBeginIndexes[currentIndex + 1]);
      this.pushItemBasedOnWeight(item);
    }
    item = cleanLines.slice(listBeginIndexes[listBeginCount - 1]);
    this.pushItemBasedOnWeight(item);
  }
  pushItemBasedOnWeight(item) {
    const ItemWithWeightRegEx = /^\((\d+)\)\s+(.+)$/;
    let regExExecution;
    let repeat;
    if ((regExExecution = ItemWithWeightRegEx.exec(item[0])) !== null) {
      repeat = Number(regExExecution[1]);
      item[0] = regExExecution[2];
    } else {
      repeat = 1;
    }
    const stringItem = item.join("\n");
    for (let i = 0; i < repeat; i++) {
      this.items.push(stringItem);
    }
  }
  getListSuggestion() {
    const suggestion = {
      title: this.title,
      description: this.description.split("\n")[0]
    };
    return suggestion;
  }
  notHidden() {
    return !this.hidden;
  }
  pickRandomItem() {
    if (this.items.length > 0) {
      return this.items[Math.floor(Math.random() * this.items.length)];
    } else {
      return "";
    }
  }
  getWarning() {
    return this.warning;
  }
};
var LIRPNote = class {
  constructor() {
    this.noteName = "";
    this.description = "";
    this.list = [];
    this.error = [];
    this.warning = [];
  }
  loadFromNote(noteName, noteContent) {
    this.noteName = noteName;
    const lines = noteContent.split("\n");
    const headingRegex = /^# .+$/;
    let headingIndexes = findIndexes(lines, (element) => headingRegex.test(element));
    if (headingIndexes.length === 0) {
      this.error.push(`No heading in note`);
      return false;
    }
    if (headingIndexes[0] !== 0) {
      this.description = lines.slice(0, headingIndexes[0]).join("\n");
    }
    headingIndexes = findIndexes(lines, (element) => headingRegex.test(element));
    const headingCount = headingIndexes.length;
    for (let currentIndex = headingIndexes[0]; currentIndex < headingCount - 1; currentIndex++) {
      this.list.push(new LIRPList(lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1])));
    }
    this.list.push(new LIRPList(lines.slice(headingIndexes[headingCount - 1])));
    return true;
  }
  getNoteSuggestion() {
    let noteSuggestion;
    noteSuggestion = [];
    this.list.forEach((element) => {
      if (element.notHidden()) {
        noteSuggestion.push(element.getListSuggestion());
      }
    });
    return noteSuggestion;
  }
  pickRandomItemFromList(listTitle) {
    const currentList = this.list.find((element) => element.title === listTitle);
    if (currentList !== void 0) {
      return currentList.pickRandomItem();
    } else {
      return "";
    }
  }
  getError() {
    return this.error;
  }
  getWarning() {
    let allWarning;
    allWarning = [];
    allWarning = allWarning.concat(this.warning);
    this.list.forEach((element) => {
      allWarning = allWarning.concat(element.getWarning());
    });
    let NoteWarning;
    NoteWarning = [];
    allWarning.forEach(
      (element) => NoteWarning.push(`Warning in note "${this.noteName}" : ${element}`)
    );
    return NoteWarning;
  }
};
var LIRPSuggestModal = class extends import_obsidian.SuggestModal {
  constructor(app, items, callback) {
    super(app);
    this.items = items;
    this.callback = callback;
  }
  getSuggestions(query) {
    return this.items.filter(
      (item) => item.title.toLowerCase().includes(query.toLowerCase())
    );
  }
  renderSuggestion(item, el) {
    el.createEl("div", { text: item.title });
    el.createEl("small", { text: item.description });
  }
  onChooseSuggestion(item, evt) {
    this.callback(item.title);
  }
};
var ListItemRandomPicker = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addRibbonIcon("list-tree", "Pick random list item", (evt) => {
      this.doTheJob(this.settings.notePath + ".md");
    });
    this.addCommand({
      id: "insert-random-item",
      name: "Insert random item from list",
      callback: () => {
        this.doTheJob(this.settings.notePath + ".md");
      }
    });
    this.addSettingTab(new LIRPSettingTab(this.app, this));
  }
  onunload() {
  }
  async doTheJob(fullNotePath) {
    const file = this.app.vault.getAbstractFileByPath(fullNotePath);
    if (!file) {
      new import_obsidian.Notice("Note not found!");
      return;
    }
    if (!(file instanceof import_obsidian.TFile)) {
      new import_obsidian.Notice("Invalid file type. Expected a Markdown note file.");
      return;
    }
    const content = await this.app.vault.cachedRead(file);
    const currentLIRP = new LIRPNote();
    const loadSuccess = currentLIRP.loadFromNote(this.settings.notePath, content);
    if (!loadSuccess) {
      currentLIRP.getError().forEach((element) => new import_obsidian.Notice(element));
      return;
    }
    if (this.settings.showWarning) {
      currentLIRP.getWarning().forEach((element) => {
        new import_obsidian.Notice(element);
      });
    }
    ;
    new LIRPSuggestModal(this.app, currentLIRP.getNoteSuggestion(), (title) => {
      this.insertString(currentLIRP.pickRandomItemFromList(title));
    }).open();
  }
  insertString(currentString) {
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (activeView) {
      const editor = activeView.editor;
      const selection = editor.getSelection();
      editor.replaceSelection(currentString);
    } else {
      new import_obsidian.Notice("No active Markdown editor found.");
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var LIRPSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Note Path").setDesc("Path to the note containing the lists.").addText(
      (text) => text.setPlaceholder("Enter the path to your note").setValue(this.plugin.settings.notePath).onChange(async (value) => {
        this.plugin.settings.notePath = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Show warning").setDesc("Show warnings of Note and lists, if present.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showWarning);
      toggle.onChange(async (value) => {
        this.plugin.settings.showWarning = value;
        await this.plugin.saveSettings();
      });
    });
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBNb2RhbCwgU3VnZ2VzdE1vZGFsLCBOb3RpY2UsIFBsdWdpbiwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZywgVEZpbGUsIE1hcmtkb3duVmlldyB9IGZyb20gJ29ic2lkaWFuJztcblxuZnVuY3Rpb24gZmluZEluZGV4ZXM8VD4oYW5BcnJheTogVFtdLCBwcmVkaWNhdGU6IChlbGVtZW50OiBULCBpbmRleDogbnVtYmVyKSA9PiBib29sZWFuKTogbnVtYmVyW10ge1xuICAgIGNvbnN0IGluZGV4ZXM6IG51bWJlcltdID0gW107XG4gICAgYW5BcnJheS5mb3JFYWNoKChlbGVtZW50LCBpbmRleCkgPT4ge1xuICAgICAgaWYgKHByZWRpY2F0ZShlbGVtZW50LCBpbmRleCkpIHtcbiAgICAgICAgaW5kZXhlcy5wdXNoKGluZGV4KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gaW5kZXhlcztcbiAgfVxuaW50ZXJmYWNlIExJUlBQbHVnaW5TZXR0aW5ncyB7XG4gICAgbm90ZVBhdGg6IHN0cmluZztcbiAgICBzaG93V2FybmluZzogYm9vbGVhbjtcbn1cblxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogTElSUFBsdWdpblNldHRpbmdzID0ge1xuICAgIG5vdGVQYXRoOiAnRnVsbCBwYXRoIG9mIGEgbm90ZScsXG4gICAgc2hvd1dhcm5pbmc6IHRydWUsXG59O1xuXG5pbnRlcmZhY2UgTElSUExpc3RJbnRlcmZhY2Uge1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICBpdGVtczogc3RyaW5nW107XG4gICAgZ2V0TGlzdFN1Z2dlc3Rpb24oKTogTElSUFN1Z2dlc3Rpb25JbnRlcmZhY2U7XG4gICAgbm90SGlkZGVuKCk6IGJvb2xlYW47XG4gICAgcGlja1JhbmRvbUl0ZW0oKTogc3RyaW5nO1xuICAgIGdldFdhcm5pbmcoKTogc3RyaW5nW107XG59XG5cbmNsYXNzIExJUlBMaXN0IGltcGxlbWVudHMgTElSUExpc3RJbnRlcmZhY2Uge1xuICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICBoaWRkZW46IGJvb2xlYW47XG4gICAgaXRlbXM6IHN0cmluZ1tdO1xuICAgIHdhcm5pbmc6IHN0cmluZ1tdXG5cbiAgICBjb25zdHJ1Y3RvcihsaW5lczogc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy50aXRsZSA9IFwiXCI7XG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBcIlwiO1xuICAgICAgICB0aGlzLmhpZGRlbiA9IGZhbHNlO1xuICAgICAgICB0aGlzLml0ZW1zID0gW107XG4gICAgICAgIHRoaXMud2FybmluZyA9IFtdO1xuXG4gICAgICAgIGNvbnN0IGhlYWRpbmdSZWdFeCA9IC9eIyArKC4rKSQvO1xuICAgICAgICB0aGlzLnRpdGxlID0gbGluZXNbMF0ucmVwbGFjZShoZWFkaW5nUmVnRXgsIFwiJDFcIik7XG4gICAgICAgIGNvbnN0IGl0YWxpY0hlYWRpbmdSZWdleCA9IC9eKF98XFwqKVxcUy87XG4gICAgICAgIGlmIChpdGFsaWNIZWFkaW5nUmVnZXgudGVzdCh0aGlzLnRpdGxlKSkge1xuICAgICAgICAgICAgdGhpcy5oaWRkZW4gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5oaWRkZW4gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBsaW5lcy5zaGlmdCgpO1xuICAgICAgICBjb25zdCBsaXN0QmVnaW5JdGVtUmVnZXggPSAvXigtfFxcZCtcXC4pICsoLispJC87XG4gICAgICAgIGNvbnN0IGxpc3RCZWdpbkluZGV4ZXMgPSBmaW5kSW5kZXhlcyhsaW5lcywgKGVsZW1lbnQpID0+IGxpc3RCZWdpbkl0ZW1SZWdleC50ZXN0KGVsZW1lbnQpKTtcbiAgICAgICAgaWYgKGxpc3RCZWdpbkluZGV4ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLndhcm5pbmcucHVzaChgTm8gaXRlbXMgaW4gbGlzdCAke3RoaXMudGl0bGV9YCk7XG4gICAgICAgICAgICB0aGlzLmhpZGRlbiA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2xlYW5MaW5lcyA9IGxpbmVzLm1hcCgoZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQucmVwbGFjZShsaXN0QmVnaW5JdGVtUmVnZXgsIFwiJDJcIilcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChsaXN0QmVnaW5JbmRleGVzWzBdICE9PSAwKSB7XG4gICAgICAgICAgICBsZXQgbWREZXNjcmlwdGlvbiA9IGNsZWFuTGluZXMuc2xpY2UoMCwgbGlzdEJlZ2luSW5kZXhlc1swXSk7XG4gICAgICAgICAgICAvLyB0YWtpbmcgY2FyZSBvZiBNRDAyMlxuICAgICAgICAgICAgLy8gICBNRDAyMi9ibGFua3MtYXJvdW5kLWhlYWRpbmdzOiBIZWFkaW5ncyBzaG91bGQgYmUgc3Vycm91bmRlZCBieSBibGFuayBsaW5lc1xuICAgICAgICAgICAgaWYgKG1kRGVzY3JpcHRpb25bMF0gPT09IFwiXCIpIHtcbiAgICAgICAgICAgICAgICBtZERlc2NyaXB0aW9uLnNoaWZ0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB0YWtpbmcgY2FyZSBvZiBNRDAzMlxuICAgICAgICAgICAgLy8gICBNRDAzMi9ibGFua3MtYXJvdW5kLWxpc3RzOiBMaXN0cyBzaG91bGQgYmUgc3Vycm91bmRlZCBieSBibGFuayBsaW5lc1xuICAgICAgICAgICAgLy8gRHVlIHRvIHNwbGl0IG9uICdcXG4nLCB0aGUgc2xpY2UsIGFuZCBhdCBsZWFzdCBhIGpvaW4gb24gJ1xcbicgdGhlIGxhc3QgJ1xcbicgaXMgYWx3YXlzIGxvc3QgIVxuICAgICAgICAgICAgLy8gU28gdGhlIGZvbG93aW5nIGNvZGUgaXMgdXNlbGVzc1xuICAgICAgICAgICAgLy8gaWYgKG1kRGVzY3JpcHRpb24uYXQoLTEpID09PSBcIlwiKSB7XG4gICAgICAgICAgICAvLyAgICAgbWREZXNjcmlwdGlvbi5wb3AoKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBtZERlc2NyaXB0aW9uLmpvaW4oJ1xcbicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IFwiXCI7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBsaXN0QmVnaW5Db3VudCA9IGxpc3RCZWdpbkluZGV4ZXMubGVuZ3RoXG4gICAgICAgIGxldCBpdGVtOiBzdHJpbmdbXTtcbiAgICAgICAgZm9yIChsZXQgY3VycmVudEluZGV4ID0gMDsgY3VycmVudEluZGV4IDwgKGxpc3RCZWdpbkNvdW50IC0gMSk7IGN1cnJlbnRJbmRleCsrKSB7XG4gICAgICAgICAgICBpdGVtID0gKGNsZWFuTGluZXMuc2xpY2UobGlzdEJlZ2luSW5kZXhlc1tjdXJyZW50SW5kZXhdLCBsaXN0QmVnaW5JbmRleGVzW2N1cnJlbnRJbmRleCArIDFdKSk7XG4gICAgICAgICAgICB0aGlzLnB1c2hJdGVtQmFzZWRPbldlaWdodChpdGVtKTtcbiAgICAgICAgfVxuICAgICAgICBpdGVtID0gKGNsZWFuTGluZXMuc2xpY2UobGlzdEJlZ2luSW5kZXhlc1tsaXN0QmVnaW5Db3VudCAtIDFdKSk7XG4gICAgICAgIHRoaXMucHVzaEl0ZW1CYXNlZE9uV2VpZ2h0KGl0ZW0pO1xuICAgIH1cblxuICAgIHB1c2hJdGVtQmFzZWRPbldlaWdodChpdGVtOiBzdHJpbmdbXSkgOiB2b2lkIHtcbiAgICAgICAgY29uc3QgSXRlbVdpdGhXZWlnaHRSZWdFeCA9IC9eXFwoKFxcZCspXFwpXFxzKyguKykkLztcbiAgICAgICAgbGV0IHJlZ0V4RXhlY3V0aW9uXG4gICAgICAgIGxldCByZXBlYXQ6IG51bWJlcjtcbiAgICAgICAgaWYgKChyZWdFeEV4ZWN1dGlvbiA9IEl0ZW1XaXRoV2VpZ2h0UmVnRXguZXhlYyhpdGVtWzBdKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHJlcGVhdCA9IE51bWJlcihyZWdFeEV4ZWN1dGlvblsxXSk7XG4gICAgICAgICAgICBpdGVtWzBdID0gcmVnRXhFeGVjdXRpb25bMl07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXBlYXQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN0cmluZ0l0ZW0gPSBpdGVtLmpvaW4oJ1xcbicpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJlcGVhdDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2goc3RyaW5nSXRlbSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZ2V0TGlzdFN1Z2dlc3Rpb24oKTogTElSUFN1Z2dlc3Rpb25JbnRlcmZhY2Uge1xuICAgICAgICBjb25zdCBzdWdnZXN0aW9uID0ge1xuICAgICAgICAgICAgdGl0bGU6IHRoaXMudGl0bGUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogKHRoaXMuZGVzY3JpcHRpb24uc3BsaXQoJ1xcbicpWzBdKSxcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3VnZ2VzdGlvbjtcbiAgICB9O1xuXG4gICAgbm90SGlkZGVuKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gIXRoaXMuaGlkZGVuO1xuICAgIH1cblxuICAgIHBpY2tSYW5kb21JdGVtKCk6IHN0cmluZyB7XG4gICAgICAgIGlmICh0aGlzLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMuaXRlbXMubGVuZ3RoKV07IC8vLnJlcGxhY2UoL1xcbi9nLCAnJylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBcIlwiO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0V2FybmluZygpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLndhcm5pbmc7XG4gICAgfVxuXG59XG5pbnRlcmZhY2UgTElSUE5vdGVJbnRlcmZhY2Uge1xuICAgIG5vdGVOYW1lOiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICBsb2FkRnJvbU5vdGUobm90ZU5hbWU6IHN0cmluZywgbm90ZUNvbnRlbnQ6IHN0cmluZyk6IGJvb2xlYW47XG4gICAgZ2V0Tm90ZVN1Z2dlc3Rpb24oKTogTElSUFN1Z2dlc3Rpb25JbnRlcmZhY2VbXTtcbiAgICBwaWNrUmFuZG9tSXRlbUZyb21MaXN0KGxpc3RUaXRsZTogc3RyaW5nKTogc3RyaW5nOyBcbiAgICBnZXRFcnJvcigpOiBzdHJpbmdbXTtcbiAgICBnZXRXYXJuaW5nKCk6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBMSVJQTm90ZSBpbXBsZW1lbnRzIExJUlBOb3RlSW50ZXJmYWNlIHtcbiAgICBub3RlTmFtZTogc3RyaW5nO1xuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgbGlzdDogTElSUExpc3RbXTtcbiAgICBlcnJvcjogc3RyaW5nW107XG4gICAgd2FybmluZzogc3RyaW5nW107XG5cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHRoaXMubm90ZU5hbWUgPSBcIlwiO1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gXCJcIjtcbiAgICAgICAgdGhpcy5saXN0ID0gW107XG4gICAgICAgIHRoaXMuZXJyb3IgPSBbXTtcbiAgICAgICAgdGhpcy53YXJuaW5nID0gW107XG4gICAgfVxuXG4gICAgbG9hZEZyb21Ob3RlKG5vdGVOYW1lOiBzdHJpbmcsIG5vdGVDb250ZW50OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgdGhpcy5ub3RlTmFtZSA9IG5vdGVOYW1lO1xuICAgICAgICBjb25zdCBsaW5lcyA9IG5vdGVDb250ZW50LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgaGVhZGluZ1JlZ2V4ID0gL14jIC4rJC87XG4gICAgICAgIGxldCBoZWFkaW5nSW5kZXhlcyA9IGZpbmRJbmRleGVzKGxpbmVzLCAoZWxlbWVudCkgPT4gaGVhZGluZ1JlZ2V4LnRlc3QoZWxlbWVudCkpO1xuICAgICAgICBpZiAoaGVhZGluZ0luZGV4ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmVycm9yLnB1c2goYE5vIGhlYWRpbmcgaW4gbm90ZWApO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWFkaW5nSW5kZXhlc1swXSAhPT0gMCkge1xuICAgICAgICAgICAgLy8gdGFraW5nIGNhcmUgb2YgTUQwMjJcbiAgICAgICAgICAgIC8vICAgTUQwMjIvYmxhbmtzLWFyb3VuZC1oZWFkaW5nczogSGVhZGluZ3Mgc2hvdWxkIGJlIHN1cnJvdW5kZWQgYnkgYmxhbmsgbGluZXNcbiAgICAgICAgICAgIC8vIER1ZSB0byBzcGxpdCBvbiAnXFxuJywgdGhlIHNsaWNlLCBhbmQgYXQgbGVhc3QgYSBqb2luIG9uICdcXG4nIHRoZSBsYXN0ICdcXG4nIGlzIGFsd2F5cyBsb3N0ICFcbiAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBsaW5lcy5zbGljZSgwLCBoZWFkaW5nSW5kZXhlc1swXSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgICAgaGVhZGluZ0luZGV4ZXMgPSBmaW5kSW5kZXhlcyhsaW5lcywgKGVsZW1lbnQpID0+IGhlYWRpbmdSZWdleC50ZXN0KGVsZW1lbnQpKTtcbiAgICAgICAgY29uc3QgaGVhZGluZ0NvdW50ID0gaGVhZGluZ0luZGV4ZXMubGVuZ3RoXG4gICAgICAgIGZvciAobGV0IGN1cnJlbnRJbmRleCA9IGhlYWRpbmdJbmRleGVzWzBdOyBjdXJyZW50SW5kZXggPCAoaGVhZGluZ0NvdW50IC0gMSk7IGN1cnJlbnRJbmRleCsrKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3QucHVzaChuZXcgTElSUExpc3QobGluZXMuc2xpY2UoaGVhZGluZ0luZGV4ZXNbY3VycmVudEluZGV4XSwgaGVhZGluZ0luZGV4ZXNbY3VycmVudEluZGV4ICsgMV0pKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saXN0LnB1c2gobmV3IExJUlBMaXN0KGxpbmVzLnNsaWNlKGhlYWRpbmdJbmRleGVzW2hlYWRpbmdDb3VudCAtIDFdKSkpO1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cblxuICAgIGdldE5vdGVTdWdnZXN0aW9uKCk6IExJUlBTdWdnZXN0aW9uSW50ZXJmYWNlW10ge1xuICAgICAgICBsZXQgbm90ZVN1Z2dlc3Rpb246IExJUlBTdWdnZXN0aW9uSW50ZXJmYWNlW107XG4gICAgICAgIG5vdGVTdWdnZXN0aW9uID0gW107XG4gICAgICAgIHRoaXMubGlzdC5mb3JFYWNoKChlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZWxlbWVudC5ub3RIaWRkZW4oKSkge1xuICAgICAgICAgICAgICAgIG5vdGVTdWdnZXN0aW9uLnB1c2goZWxlbWVudC5nZXRMaXN0U3VnZ2VzdGlvbigpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBub3RlU3VnZ2VzdGlvbjtcbiAgICB9XG5cbiAgICBwaWNrUmFuZG9tSXRlbUZyb21MaXN0KGxpc3RUaXRsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY3VycmVudExpc3QgPSB0aGlzLmxpc3QuZmluZCgoZWxlbWVudCkgPT4gZWxlbWVudC50aXRsZSA9PT0gbGlzdFRpdGxlKTtcbiAgICAgICAgaWYgKGN1cnJlbnRMaXN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50TGlzdC5waWNrUmFuZG9tSXRlbSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCJcbiAgICAgICAgfVxuICAgIH0gXG5cbiAgICBnZXRFcnJvcigpOiBzdHJpbmdbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVycm9yO1xuICAgIH07XG5cbiAgICBnZXRXYXJuaW5nKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgbGV0IGFsbFdhcm5pbmc6IHN0cmluZ1tdO1xuICAgICAgICBhbGxXYXJuaW5nID0gW107XG4gICAgICAgIGFsbFdhcm5pbmcgPSBhbGxXYXJuaW5nLmNvbmNhdCh0aGlzLndhcm5pbmcpO1xuICAgICAgICB0aGlzLmxpc3QuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgYWxsV2FybmluZyA9IGFsbFdhcm5pbmcuY29uY2F0KGVsZW1lbnQuZ2V0V2FybmluZygpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGxldCBOb3RlV2FybmluZzogc3RyaW5nW107XG4gICAgICAgIE5vdGVXYXJuaW5nID0gW107XG4gICAgICAgIGFsbFdhcm5pbmcuZm9yRWFjaCgoZWxlbWVudCkgPT4gXG4gICAgICAgICAgICBOb3RlV2FybmluZy5wdXNoKGBXYXJuaW5nIGluIG5vdGUgXCIke3RoaXMubm90ZU5hbWV9XCIgOiAke2VsZW1lbnR9YClcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIE5vdGVXYXJuaW5nO1xuICAgIH07XG5cbn1cbmludGVyZmFjZSBMSVJQU3VnZ2VzdGlvbkludGVyZmFjZSB7XG4gICAgdGl0bGU6IHN0cmluZztcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nO1xufVxuXG5cbmV4cG9ydCBjbGFzcyBMSVJQU3VnZ2VzdE1vZGFsIGV4dGVuZHMgU3VnZ2VzdE1vZGFsPExJUlBTdWdnZXN0aW9uSW50ZXJmYWNlPiB7XG4gICAgaXRlbXM6IExJUlBTdWdnZXN0aW9uSW50ZXJmYWNlW107XG4gICAgY2FsbGJhY2s6ICh2YWx1ZTogc3RyaW5nKSA9PiB2b2lkO1xuICBcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgaXRlbXM6IExJUlBTdWdnZXN0aW9uSW50ZXJmYWNlW10sIGNhbGxiYWNrOiAodmFsdWU6IHN0cmluZykgPT4gdm9pZCkge1xuICAgICAgc3VwZXIoYXBwKTtcbiAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcbiAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICB9XG5cbiAgICBnZXRTdWdnZXN0aW9ucyhxdWVyeTogc3RyaW5nKTogTElSUFN1Z2dlc3Rpb25JbnRlcmZhY2VbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmZpbHRlcigoaXRlbSkgPT5cbiAgICAgICAgICAgIGl0ZW0udGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeS50b0xvd2VyQ2FzZSgpKVxuICAgICAgICApO1xuICAgICAgfVxuICAgIFxuICAgIHJlbmRlclN1Z2dlc3Rpb24oaXRlbTogTElSUFN1Z2dlc3Rpb25JbnRlcmZhY2UsIGVsOiBIVE1MRWxlbWVudCkge1xuICAgICAgICBlbC5jcmVhdGVFbCgnZGl2JywgeyB0ZXh0OiBpdGVtLnRpdGxlIH0pO1xuICAgICAgICBlbC5jcmVhdGVFbCgnc21hbGwnLCB7dGV4dDogaXRlbS5kZXNjcmlwdGlvbn0pO1xuICAgICAgfVxuICBcbiAgICAgIG9uQ2hvb3NlU3VnZ2VzdGlvbihpdGVtOiBMSVJQU3VnZ2VzdGlvbkludGVyZmFjZSwgZXZ0OiBNb3VzZUV2ZW50IHwgS2V5Ym9hcmRFdmVudCkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrKGl0ZW0udGl0bGUpO1xuICAgICAgfX1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgTGlzdEl0ZW1SYW5kb21QaWNrZXIgZXh0ZW5kcyBQbHVnaW4ge1xuICAgIHNldHRpbmdzOiBMSVJQUGx1Z2luU2V0dGluZ3M7XG5cbiAgICBhc3luYyBvbmxvYWQoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgdGhpcy5hZGRSaWJib25JY29uKCdsaXN0LXRyZWUnLCAnUGljayByYW5kb20gbGlzdCBpdGVtJywgKGV2dDogTW91c2VFdmVudCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5kb1RoZUpvYih0aGlzLnNldHRpbmdzLm5vdGVQYXRoICsgJy5tZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgaWQ6ICdpbnNlcnQtcmFuZG9tLWl0ZW0nLFxuICAgICAgICAgICAgbmFtZTogJ0luc2VydCByYW5kb20gaXRlbSBmcm9tIGxpc3QnLFxuICAgICAgICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvVGhlSm9iKHRoaXMuc2V0dGluZ3Mubm90ZVBhdGggKyAnLm1kJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgTElSUFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICB9XG5cbiAgICBvbnVubG9hZCgpIHtcblxuICAgIH1cblxuICAgIGFzeW5jIGRvVGhlSm9iKGZ1bGxOb3RlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZnVsbE5vdGVQYXRoKTtcblxuICAgICAgICBpZiAoIWZpbGUpIHtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoJ05vdGUgbm90IGZvdW5kIScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgICAgICAgICAgbmV3IE5vdGljZSgnSW52YWxpZCBmaWxlIHR5cGUuIEV4cGVjdGVkIGEgTWFya2Rvd24gbm90ZSBmaWxlLicpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRMSVJQID0gbmV3IExJUlBOb3RlKCk7XG5cbiAgICAgICAgY29uc3QgbG9hZFN1Y2Nlc3MgPSBjdXJyZW50TElSUC5sb2FkRnJvbU5vdGUodGhpcy5zZXR0aW5ncy5ub3RlUGF0aCwgY29udGVudCk7XG4gICAgICAgIGlmICghbG9hZFN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGN1cnJlbnRMSVJQLmdldEVycm9yKCkuZm9yRWFjaCgoZWxlbWVudCkgPT4gbmV3IE5vdGljZShlbGVtZW50KSk7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5zaG93V2FybmluZykge1xuICAgICAgICAgICAgY3VycmVudExJUlAuZ2V0V2FybmluZygpLmZvckVhY2goZWxlbWVudCA9PiB7XG4gICAgICAgICAgICAgICAgbmV3IE5vdGljZShlbGVtZW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBuZXcgTElSUFN1Z2dlc3RNb2RhbCh0aGlzLmFwcCwgY3VycmVudExJUlAuZ2V0Tm90ZVN1Z2dlc3Rpb24oKSwgKHRpdGxlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmluc2VydFN0cmluZyhjdXJyZW50TElSUC5waWNrUmFuZG9tSXRlbUZyb21MaXN0KHRpdGxlKSk7XG4gICAgICAgIH0pLm9wZW4oKTtcbiAgICB9XG5cbiAgICBpbnNlcnRTdHJpbmcoY3VycmVudFN0cmluZzogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuXG4gICAgICAgIGlmIChhY3RpdmVWaWV3KSB7XG4gICAgICAgICAgICBjb25zdCBlZGl0b3IgPSBhY3RpdmVWaWV3LmVkaXRvcjtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgIGVkaXRvci5yZXBsYWNlU2VsZWN0aW9uKGN1cnJlbnRTdHJpbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBNYXJrZG93biBlZGl0b3IgZm91bmQuXCIpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG4gICAgYXN5bmMgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgICB9XG5cbiAgICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gICAgfVxufVxuXG5jbGFzcyBMSVJQU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICAgIHBsdWdpbjogTGlzdEl0ZW1SYW5kb21QaWNrZXI7XG5cbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBMaXN0SXRlbVJhbmRvbVBpY2tlcikge1xuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIH1cblxuICAgIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgICAgICAuc2V0TmFtZSgnTm90ZSBQYXRoJylcbiAgICAgICAgICAgIC5zZXREZXNjKCdQYXRoIHRvIHRoZSBub3RlIGNvbnRhaW5pbmcgdGhlIGxpc3RzLicpXG4gICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHRleHRcbiAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ0VudGVyIHRoZSBwYXRoIHRvIHlvdXIgbm90ZScpXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm5vdGVQYXRoKVxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Mubm90ZVBhdGggPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiU2hvdyB3YXJuaW5nXCIpXG4gICAgICAgIC5zZXREZXNjKFwiU2hvdyB3YXJuaW5ncyBvZiBOb3RlIGFuZCBsaXN0cywgaWYgcHJlc2VudC5cIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hvd1dhcm5pbmcpO1xuICAgICAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dXYXJuaW5nID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICB9XG59Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0JBQXlHO0FBRXpHLFNBQVMsWUFBZSxTQUFjLFdBQTZEO0FBQy9GLFFBQU0sVUFBb0IsQ0FBQztBQUMzQixVQUFRLFFBQVEsQ0FBQyxTQUFTLFVBQVU7QUFDbEMsUUFBSSxVQUFVLFNBQVMsS0FBSyxHQUFHO0FBQzdCLGNBQVEsS0FBSyxLQUFLO0FBQUEsSUFDcEI7QUFBQSxFQUNGLENBQUM7QUFDRCxTQUFPO0FBQ1Q7QUFNRixJQUFNLG1CQUF1QztBQUFBLEVBQ3pDLFVBQVU7QUFBQSxF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
