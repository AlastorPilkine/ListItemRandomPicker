import { App, Modal, SuggestModal, Notice, Plugin, PluginSettingTab, Setting, TFile, MarkdownView } from 'obsidian';

function findIndexes<T>(anArray: T[], predicate: (element: T, index: number) => boolean): number[] {
    const indexes: number[] = [];
    anArray.forEach((element, index) => {
      if (predicate(element, index)) {
        indexes.push(index);
      }
    });
    return indexes;
  }
interface LIRPPluginSettings {
    notePath: string;
}

const DEFAULT_SETTINGS: LIRPPluginSettings = {
    notePath: 'Full path of a note'
};

interface LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    macro: boolean;
    items: string[];
    warning: string[];
    pickRandomItem(): string;
}

class LIRPList implements LIRPListInterface {
    title: string;
    description: string;
    hidden: boolean;
    macro: boolean;
    items: string[];
    warning: string[]

    constructor(lines: string[]) {
        this.items = [];
        this.warning = [];
        
        const headingRegEx = /^# +(.+)$/;
        // to do hidden list
        this.title = lines[0].replace(headingRegEx, "$1");
        lines.splice(0, 1);
        const listBeginItemRegex = /^(-|\d+\.) +(.+)$/;
        const listBeginIndexes = findIndexes(lines, (element) => listBeginItemRegex.test(element));
        if (listBeginIndexes.length === 0) {
            this.warning.push('No list items in note');
            // to do : Macro !
            return;
        }
        const cleanLines = lines.map((element) => {
            return element.replace(listBeginItemRegex, "$2")
        });
        if (listBeginIndexes[0] !== 0) {
            // there is a description
            this.description = cleanLines.slice(0, 1).join('\n');
        } else {
            this.description = "";
        }

        const listBeginCount = listBeginIndexes.length
        for (let currentIndex = 0; currentIndex < (listBeginCount - 1); currentIndex++) {
            // to do item weight
            this.items.push((cleanLines.slice(listBeginIndexes[currentIndex], listBeginIndexes[currentIndex + 1]).join('\n')));
        }
        this.items.push((cleanLines.slice(listBeginIndexes[listBeginCount - 1]).join('\n')));
    }

    pickRandomItem(): string {
        if (this.items.length > 0) {
            return this.items[Math.floor(Math.random() * this.items.length)]; //.replace(/\n/g, '')
        } else {
            return "";
        }
    }

}
interface LIRPNoteInterface {
    fullPath: string;
    description: string;
    loadFromNote(noteContent: string): boolean;
    getListSuggestion(): LIRPSuggestionInterface[];
    pickRandomItemFromList(listTitle: string): string; 
    getError(): string[];
    getWarning(): string[];
}

class LIRPNote implements LIRPNoteInterface {
    fullPath: string;
    description: string;
    list: LIRPList[];
    error: string[];
    warning: string[];

    constructor () {
        this.fullPath = "";
        this.description = "";
        this.list = [];
        this.error = [];
        this.warning = [];
    }

    loadFromNote(noteContent: string): boolean {
        const lines = noteContent.split('\n');
        const headingRegex = /^# .+$/;
        let headingIndexes = findIndexes(lines, (element) => headingRegex.test(element));
        if (headingIndexes.length === 0) {
            this.error.push('No heading in note');
            return false;
        }
        let headingBegin = 0;
        if (headingIndexes[0] !== 0) {
            // there is a description
            this.description = lines.slice(0, headingIndexes[0] -1).join('\n');
            headingBegin = headingIndexes[0];
        }
        const headingCount = headingIndexes.length
        for (let currentIndex = headingBegin; currentIndex < (headingCount - 1); currentIndex++) {
            this.list.push(new LIRPList(lines.slice(headingIndexes[currentIndex], headingIndexes[currentIndex + 1])));
        }
        this.list.push(new LIRPList(lines.slice(headingIndexes[headingCount - 1])));
        return true
    }

    getListSuggestion(): LIRPSuggestionInterface[] {
        let listSuggestion: LIRPSuggestionInterface[];
        listSuggestion = [];
        this.list.forEach((element) => {
            // to do hidden list
            listSuggestion.push({
                title: element.title,
                description: element.description,
            })
        });
        return listSuggestion;
    }

    pickRandomItemFromList(listTitle: string): string {
        const currentList = this.list.find((element) => element.title === listTitle);
        if (currentList !== undefined) {
            return currentList.pickRandomItem();
        } else {
            return ""
        }
    } 

    getError(): string[] {
        return []
    };

    getWarning(): string[] {
        return []
    };

}
interface LIRPSuggestionInterface {
    title: string;
    description: string;
}


export class LIRPSuggestModal extends SuggestModal<LIRPSuggestionInterface> {
    items: LIRPSuggestionInterface[];
    callback: (value: string) => void;
  
    constructor(app: App, items: LIRPSuggestionInterface[], callback: (value: string) => void) {
      super(app);
      this.items = items;
      this.callback = callback;
    }

    getSuggestions(query: string): LIRPSuggestionInterface[] {
        return this.items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
        );
      }
    
    renderSuggestion(item: LIRPSuggestionInterface, el: HTMLElement) {
        el.createEl('div', { text: item.title });
        el.createEl('small', {text: item.description});
      }
  
      onChooseSuggestion(item: LIRPSuggestionInterface, evt: MouseEvent | KeyboardEvent) {
        this.callback(item.title);
      }}

export default class ListItemRandomPicker extends Plugin {
    settings: LIRPPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addRibbonIcon('list-tree', 'Pick random list item', (evt: MouseEvent) => {
            this.doTheJob(this.settings.notePath + '.md');
        });

        this.addCommand({
            id: 'insert-random-item',
            name: 'Insert random item from list',
            callback: () => {
                this.doTheJob(this.settings.notePath + '.md');
            }
        });

        this.addSettingTab(new LIRPSettingTab(this.app, this));
    }

    onunload() {

    }

    async doTheJob(fullNotePath: string): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(fullNotePath);

        if (!file) {
            new Notice('Note not found!');
            return;
        }

        if (!(file instanceof TFile)) {
            new Notice('Invalid file type. Expected a Markdown note file.');
            return;
        }

        const content = await this.app.vault.cachedRead(file);
        const currentLIRP = new LIRPNote();

        const loadSuccess = currentLIRP.loadFromNote(content);
        if (!loadSuccess) {
            currentLIRP.error.forEach((element) => new Notice(element));
            return
        }
        new LIRPSuggestModal(this.app, currentLIRP.getListSuggestion(), (title) => {
            this.insertString(currentLIRP.pickRandomItemFromList(title));
        }).open();
    }

    insertString(currentString: string): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView) {
            const editor = activeView.editor;
            const selection = editor.getSelection();
            editor.replaceSelection(currentString);
        } else {
            new Notice("No active Markdown editor found.");
        }

    };

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class LIRPSettingTab extends PluginSettingTab {
    plugin: ListItemRandomPicker;

    constructor(app: App, plugin: ListItemRandomPicker) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        // containerEl.createEl('h2', { text: 'Settings for List Item Random Picker.' });

        new Setting(containerEl)
            .setName('Note Path')
            .setDesc('Path to the note containing the lists.')
            .addText(text => text
                .setPlaceholder('Enter the path to your note')
                .setValue(this.plugin.settings.notePath)
                .onChange(async (value) => {
                    this.plugin.settings.notePath = value;
                    await this.plugin.saveSettings();
                }));
    }
}